import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { WebhookDto } from './dto/webhook.dto';
import { BotsService } from '@modules/bots/bots.service';
import { CustomersService } from '@modules/customers/customers.service';
import { Bot, Customer, Message, ProductStatus } from '@prisma/client';
import { MessagesService } from '@modules/messages/messages.service';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '@core/gemini/gemini.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { OrdersService } from '@modules/orders/orders.service';
import { AiResponseHandlerService } from './ai-response-handler.service';
import {
  MessageBufferService,
  FlushResult,
} from '@core/message-buffer/message-buffer.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { ProductSearchService } from '@modules/products/product-search.service';
import { ProductCard, ProcessedAiResponse } from './ai-response-handler.service';
import { CustomerIntelligenceService } from '@modules/customer-intelligence/customer-intelligence.service';
import { RetentionService } from '@modules/retention/retention.service';
import { ReplenishmentService } from '@modules/replenishment/replenishment.service';
import { UsageService, QuotaStatus } from '@modules/usage/usage.service';
import { LoyaltyService } from '@modules/loyalty/loyalty.service';
import { TelegramLoggerService } from '@core/telegram-logger/telegram-logger.service';
import { RedisService } from '@core/redis/redis.service';

@Injectable()
export class WebhookService {
  private readonly processedUpdates = new Set<number>();
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly botService: BotsService,
    private readonly customersService: CustomersService,
    private readonly messagesService: MessagesService,
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly telegramService: TelegramService,
    private readonly encryptionService: EncryptionService,
    private readonly ordersService: OrdersService,
    private readonly aiResponseHandler: AiResponseHandlerService,
    private readonly messageBufferService: MessageBufferService,
    private readonly prisma: PrismaService,
    private readonly productSearchService: ProductSearchService,
    private readonly customerIntelligenceService: CustomerIntelligenceService,
    private readonly retentionService: RetentionService,
    private readonly usageService: UsageService,
    private readonly loyaltyService: LoyaltyService,
    private readonly telegramLogger: TelegramLoggerService,
    private readonly redisService: RedisService,
    @Optional()
    private readonly replenishmentService?: ReplenishmentService,
  ) {}

  async handleWebhook(
    webhookData: WebhookDto,
    botId: number,
    organizationId: number,
  ) {
    // The bot only holds 1:1 conversations with customers. Ignore anything
    // posted in a group/supergroup/channel (e.g. the bot added to the
    // merchant's own announcement group) — replying there is never correct
    // and would otherwise create a bogus customer record for the sender.
    const incomingChatType = webhookData.message?.chat?.type;
    if (incomingChatType && incomingChatType !== 'private') {
      this.logger.log(
        `Ignoring message from non-private chat (type=${incomingChatType}, chatId=${webhookData.message?.chat?.id})`,
      );
      return { status: 'ignored_non_private_chat' };
    }

    // Prioritize callback_query (inline button) handling
    if (
      webhookData.callback_query &&
      webhookData.callback_query.data &&
      webhookData.callback_query.data.startsWith('lang_')
    ) {
      const { message, data, id: callbackQueryId } = webhookData.callback_query;
      const lang = data.replace('lang_', '');
      let customer: any = null;
      let chatId: string | undefined = undefined;
      let messageId: number | undefined = undefined;
      if (message && message.chat && message.chat.id) {
        chatId = message.chat.id.toString();
        messageId = message.message_id;
        try {
          customer = await this.customersService._getCustomerByTelegramId(
            chatId,
            organizationId,
            botId,
          );
        } catch (err) {
          console.error(
            '[Webhook] Customer lookup FAILED in callback_query',
            err,
          );
        }
      }
      // Find bot to fetch token
      const botObj = await this.botService._getBot(botId, organizationId);
      const decyptedToken = botObj
        ? this.encryptionService.decrypt(botObj.token)
        : '';
      if (!customer || !chatId || !messageId) {
        // Respond to callback_query so Telegram doesn't hang
        if (decyptedToken) {
          await this.telegramService.sendRequest(
            decyptedToken,
            'answerCallbackQuery',
            {
              callback_query_id: callbackQueryId,
              text: 'User not found for this action! Please try /start again.',
              show_alert: true,
            },
          );
        }
        return {
          status: 'error',
          error: 'Customer or message details not found in callback_query',
        };
      }
      // Must always respond promptly!
      await this.telegramService.sendRequest(
        decyptedToken,
        'answerCallbackQuery',
        {
          callback_query_id: callbackQueryId,
        },
      );
      await this.telegramService.handleLanguageSelect(
        chatId,
        messageId,
        lang,
        customer.id,
        decyptedToken,
      );
      return { status: 'lang_selected', lang };
    }

    // Normal message handler...
    const result = await this.validateWebhook(
      webhookData,
      botId,
      organizationId,
    );
    if (!result) {
      return { status: 'ok' };
    }
    const { bot, customer } = result;

    // Traffic Monitoring
    try {
      const trafficKey = `traffic_monitor:${botId}`;
      const count = await this.redisService.incr(trafficKey);
      if (count === 1) {
        await this.redisService.expire(trafficKey, 60); // Reset every 1 minute
      }
      
      if (count > 50) {
        const cooldownKey = `traffic_alert_cooldown`;
        const isCooldown = await this.redisService.get<boolean>(cooldownKey);
        
        if (!isCooldown) {
          await this.redisService.set(cooldownKey, true, 900); // 15 minutes cooldown
          const orgName = bot.organizationId;
          const msg = `Bot: ${bot.username} (Org ID: ${orgName})\nTraffic spike detected: >50 messages per minute.`;
          this.logger.warn(`High traffic alert triggered: ${msg}`);
          await this.telegramLogger.sendEvent('🚨 High Traffic Alert', msg);
        }
      }
    } catch (err) {
      this.logger.error(`Error in traffic monitoring: ${err.message}`, err.stack);
    }

    const decyptedToken = this.encryptionService.decrypt(bot.token);
    // Give every message/callback entry point its own validation
    let isValid = false;
    if (webhookData.message) {
      isValid = await this.validateMessage(webhookData, bot);
      if (!isValid) return;
    }

    // Handle Telegram language selection via callback_query (inline button)
    if (
      webhookData.callback_query &&
      webhookData.callback_query.data &&
      webhookData.callback_query.data.startsWith('lang_')
    ) {
      this.logger.verbose(
        `callback_query received: ${JSON.stringify(webhookData.callback_query)}`,
      );
      const { message, data } = webhookData.callback_query;
      const lang = data.replace('lang_', '');
      if (!message) {
        this.logger.error(
          'Missing message context for callback query',
          webhookData.callback_query,
        );
        return {
          status: 'error',
          error: 'Missing message context for callback query',
        };
      }
      this.logger.log(
        `Processing language selection callback for lang='${lang}', chatId=${message.chat.id}, messageId=${message.message_id}, customer=${customer.id}`,
      );
      await this.telegramService.handleLanguageSelect(
        message.chat.id.toString(),
        message.message_id,
        lang,
        customer.id,
        decyptedToken,
      );
      this.logger.log(
        `Language selection processed for lang='${lang}', customer=${customer.id}`,
      );
      return { status: 'lang_selected', lang };
    }

    // Get message content
    let messageContent =
      webhookData.message?.text || webhookData.message?.caption || '';
    const photos = webhookData.message?.photo;

    // Voice message: transcribe with Gemini and treat it as a normal text turn.
    const voice = webhookData.message?.voice;
    if (voice && !messageContent) {
      const transcript = await this.transcribeVoice(voice, decyptedToken, {
        organizationId,
        botId: bot.id,
      });
      if (!transcript) {
        await this.telegramService.sendRequest(decyptedToken, 'sendMessage', {
          chat_id: customer.telegramId,
          text:
            customer.lang === 'ru'
              ? 'Извините, не удалось разобрать голосовое сообщение. Напишите, пожалуйста, текстом.'
              : customer.lang === 'en'
                ? "Sorry, I couldn't understand the voice message. Please try typing it."
                : "Kechirasiz, ovozli xabarni tushunolmadim. Iltimos, matn ko'rinishida yozing.",
        });
        return { status: 'voice_unintelligible' };
      }
      messageContent = transcript;
      this.logger.log(
        `Voice from customer ${customer.id} transcribed: "${transcript.substring(0, 50)}"`,
      );
    }

    if (photos && photos.length > 0) {
      this.logger.log(
        `Image received from customer ${customer.id}, processing image search...`,
      );
      try {
        // Get largest photo
        const largestPhoto = photos[photos.length - 1];
        const fileId = largestPhoto.file_id;

        // Download file
        const fileData = await this.telegramService.downloadFile(
          decyptedToken,
          fileId,
        );

        if (fileData) {
          const base64Image = fileData.buffer.toString('base64');

          // Visual product search. The caption (if any) is not yet used for a
          // combined text+image query — searchByImage ranks purely by image
          // similarity. Returns [] when Weaviate is unavailable.
          this.logger.log(
            `Performing image search for customer ${customer.id}`,
          );
          const { matches } = await this.productSearchService.searchByImage(
            organizationId,
            customer.id,
            base64Image,
            customer.lang,
            5,
          );

          if (matches.length > 0) {
            const cards: ProductCard[] = matches.map((m) => ({
              caption: m.caption,
              imageKey: m.imageKey,
            }));
            await this.sendProductCards(decyptedToken, customer, bot.id, cards);
            return { status: 'ok' };
          } else {
            await this.telegramService.sendRequest(
              decyptedToken,
              'sendMessage',
              {
                chat_id: customer.telegramId,
                text:
                  customer.lang === 'ru'
                    ? 'По вашему запросу ничего не найдено.'
                    : customer.lang === 'en'
                      ? 'No products found matching your image.'
                      : "Rasm bo'yicha hech qanday mahsulot topilmadi.",
              },
            );
            return { status: 'ok' };
          }
        }
      } catch (error) {
        this.logger.error(
          `Error processing image search: ${error.message}`,
          error.stack,
        );
      }
    }

    // Referral deep link: t.me/<bot>?start=ref_CODE. Attach the new customer to
    // their referrer, then continue with the normal onboarding prompt.
    const startPayload = this.extractStartPayload(messageContent);
    if (startPayload?.startsWith('ref_')) {
      await this.loyaltyService
        .attachReferral(customer.id, organizationId, startPayload.slice(4))
        .catch((err) =>
          this.logger.warn(`attachReferral failed: ${err.message}`),
        );
      await this.telegramService.handleStartCommand(
        customer.telegramId,
        decyptedToken,
      );
      return { status: 'referral_start' };
    }

    // /referral (or /invite): send the customer their own link + points balance.
    if (messageContent === '/referral' || messageContent === '/invite') {
      await this.sendReferralInfo(customer, decyptedToken);
      return { status: 'referral_info' };
    }

    if (messageContent === '/start') {
      // Send onboarding language select
      await this.telegramService.handleStartCommand(
        customer.telegramId,
        decyptedToken,
      );
      return { status: 'onboarding' };
    } else if (messageContent.startsWith('/start=product_')) {
      const productIdStr = messageContent.split('=product_')[1];
      const productId = parseInt(productIdStr, 10);

      if (isNaN(productId)) {
        await this.telegramService.sendRequest(decyptedToken, 'sendMessage', {
          chat_id: customer.telegramId,
          text: '❌ Mahsulot topilmadi.',
          parse_mode: 'HTML',
        });
        return { status: 'error', error: 'Invalid product ID' };
      }

      try {
        // Get product with images and fields
        const product = await this.prisma.product.findFirst({
          where: {
            id: productId,
            organizationId,
            isDeleted: false,
          },
          include: {
            images: {
              select: {
                id: true,
                key: true,
                url: true,
                originalName: true,
              },
            },
            itemSpecValues: {
              include: {
                itemSpec: true,
              },
            },
            category: {
              select: {
                name_uz: true,
                name_ru: true,
                name_en: true,
              },
            },
          },
        });

        if (!product) {
          await this.telegramService.sendRequest(decyptedToken, 'sendMessage', {
            chat_id: customer.telegramId,
            text: '❌ Mahsulot topilmadi.',
            parse_mode: 'HTML',
          });
          return { status: 'error', error: 'Product not found' };
        }

        // Localize the product message based on the customer's language
        const lang = customer.lang || 'uz';
        const L = {
          price: lang === 'ru' ? 'Цена' : lang === 'en' ? 'Price' : 'Narxi',
          quantity:
            lang === 'ru'
              ? 'Количество'
              : lang === 'en'
                ? 'Quantity'
                : 'Miqdori',
          status:
            lang === 'ru' ? 'Статус' : lang === 'en' ? 'Status' : 'Holati',
          yes: lang === 'ru' ? 'Да' : lang === 'en' ? 'Yes' : 'Ha',
          no: lang === 'ru' ? 'Нет' : lang === 'en' ? 'No' : "Yo'q",
          order:
            lang === 'ru'
              ? '📦 Оформить заказ'
              : lang === 'en'
                ? '📦 Place order'
                : '📦 Buyurtma berish',
        };

        // Format product fields
        const fieldsText = product.itemSpecValues
          .map((fv) => {
            let value = '';
            if (fv.valueText) value = fv.valueText;
            else if (fv.valueNumber !== null) value = String(fv.valueNumber);
            else if (fv.valueBool !== null) value = fv.valueBool ? L.yes : L.no;
            else if (fv.valueDate)
              value = new Date(fv.valueDate).toLocaleDateString();
            else if (fv.valueJson) value = String(fv.valueJson);
            return `<b>${fv.itemSpec.name}:</b> ${value}`;
          })
          .join('\n');

        // Build product message
        const productMessage =
          `<b>${product.name}</b>\n\n` +
          `<b>${L.price}:</b> ${product.price} ${product.currency}\n` +
          `<b>${L.quantity}:</b> ${product.quantity}\n` +
          `<b>${L.status}:</b> ${product.status}\n` +
          (fieldsText ? `\n${fieldsText}\n` : '') +
          `\n<a href="https://t.me/${bot.username}?start=order_${product.id}">${L.order}</a>`;

        // Send product images if available
        if (product.images && product.images.length > 0) {
          if (product.images.length > 1) {
            // Send media group
            const images = product.images.slice(0, 10).map((img, index) => {
              const mediaItem: any = {
                type: 'photo',
                media: img.url,
              };
              if (index === 0) {
                mediaItem.caption = productMessage;
                mediaItem.parse_mode = 'HTML';
              }
              return mediaItem;
            });

            await this.telegramService.sendRequest(
              decyptedToken,
              'sendMediaGroup',
              {
                chat_id: customer.telegramId,
                media: images,
              },
            );
          } else {
            // Send single photo
            await this.telegramService.sendRequest(decyptedToken, 'sendPhoto', {
              chat_id: customer.telegramId,
              photo: product.images[0].url,
              caption: productMessage,
              parse_mode: 'HTML',
            });
          }
        } else {
          // Send text only if no images
          await this.telegramService.sendRequest(decyptedToken, 'sendMessage', {
            chat_id: customer.telegramId,
            text: productMessage,
            parse_mode: 'HTML',
          });
        }

        // Save message to database
        await this.messagesService._saveMessage(
          customer.id,
          messageContent,
          'USER',
          bot.id,
        );

        this.logger.log(
          `Product info sent to customer ${customer.id} for product ${productId}`,
        );

        return { status: 'product_info_sent', productId };
      } catch (error) {
        this.logger.error(
          `Error sending product info: ${error.message}`,
          error.stack,
        );
        await this.telegramService.sendRequest(decyptedToken, 'sendMessage', {
          chat_id: customer.telegramId,
          text: "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
          parse_mode: 'HTML',
        });
        return { status: 'error', error: error.message };
      }
    }

    // Save individual message to database
    await this.messagesService._saveMessage(
      customer.id,
      messageContent,
      'USER',
      bot.id,
    );

    this.logger.log(
      `Message received from customer ${customer.id}: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
    );

    // Add message to buffer with callback for when it's flushed
    this.messageBufferService.addMessage(
      customer.id,
      bot.id,
      organizationId,
      messageContent,
      async (flushResult: FlushResult) => {
        await this.processBufferedMessages(
          flushResult,
          bot,
          customer,
          decyptedToken,
        );
      },
    );

    return { status: 'ok' };
  }

  /**
   * Process buffered messages after buffer flush
   * This is called by the MessageBufferService when the buffer is flushed
   *
   * @param flushResult - The result of flushing the buffer
   * @param bot - The bot instance
   * @param customer - The customer instance
   * @param decryptedToken - The decrypted bot token
   */
  private async processBufferedMessages(
    flushResult: FlushResult,
    bot: Bot,
    customer: Customer,
    decryptedToken: string,
  ): Promise<void> {
    let loadingMessageId: number | undefined;
    try {
      this.logger.log(
        `Processing buffered messages for customer ${customer.id}: ${flushResult.messageCount} messages merged`,
      );

      // Send typing indicator + loading message immediately while AI processes
      await this.telegramService.sendRequest(decryptedToken, 'sendChatAction', {
        chat_id: customer.telegramId,
        action: 'typing',
      });
      const loadingRes = await this.telegramService.sendRequest(
        decryptedToken,
        'sendMessage',
        {
          chat_id: customer.telegramId,
          text: '⏳',
        },
      );
      loadingMessageId = loadingRes?.result?.message_id;

      // Check usage quota before calling AI
      const quotaStatus = await this.usageService.checkAndIncrementConversation(
        flushResult.organizationId,
      );
      if (quotaStatus === QuotaStatus.THROTTLED) {
        await this.telegramService.sendRequest(decryptedToken, 'sendMessage', {
          chat_id: customer.telegramId,
          text: "Kechirasiz, xizmat vaqtincha to'xtatildi. Iltimos, do'kon egasiga murojaat qiling.",
        });
        return;
      }

      // Get conversation history (last 10 messages)
      const history = await this.messagesService._getCustomerLastMessages(
        customer.id,
        10,
      );

      // Process merged message with AI using Tool Loop
      const processedResponse = await this.processWithAI(
        flushResult.combinedMessage,
        history,
        bot.organizationId,
        customer,
        bot.id,
      );

      // Send response to Telegram (single message)
      try {
        // Product search results: send each product as a separate photo+caption
        if (processedResponse.productCards && processedResponse.productCards.length > 0) {
          await this.sendProductCards(
            decryptedToken,
            customer,
            bot.id,
            processedResponse.productCards as ProductCard[],
          );
          return;
        }

        const images = (processedResponse as any).images as string[] | undefined;
        const baseUrl =
          this.configService.get<string>('BASE_URL') ||
          process.env.BASE_URL ||
          '';
        const toAbsolute = (url: string) => {
          // Already absolute
          if (/^https?:\/\//i.test(url)) return url;
          // Only prefix when pointing to public/* assets
          if (/^\/?public\//i.test(url)) {
            const left = baseUrl.replace(/\/+$/g, '');
            const right = url.replace(/^\/+/, '');
            return `${left}/${right}`;
          }
          // Leave other relative paths unchanged
          return url;
        };

        if (images && images.length > 0) {
          const isSupportedPhoto = (url: string) =>
            /\.(jpe?g|png|webp)(?:\?.*)?$/i.test(url);
          const toMediaPhoto = (imageUrl: string, index: number) => {
            const absoluteUrl = toAbsolute(imageUrl);
            if (!isSupportedPhoto(absoluteUrl)) return null;
            return {
              type: 'photo',
              media: absoluteUrl,
              ...(index === 0 && {
                caption: (() => {
                  const cleanedText = processedResponse.text
                    .replace(/\[INTENT:CREATE_ORDER\][\s\S]*$/g, '')
                    .replace(/\[INTENT:ORDER_CONFIRMATION\][\s\S]*$/g, '')
                    .replace(/\[INTENT:FETCH_ORDERS\][\s\S]*$/g, '')
                    .replace(/\[INTENT:CANCEL_ORDER\][\s\S]*$/g, '')
                    .trim();
                  return cleanedText.length > 1024
                    ? cleanedText.slice(0, 1010) + '...'
                    : cleanedText;
                })(),
                parse_mode: 'HTML',
              }),
            };
          };
          // If multiple images, use sendMediaGroup (max 10 images)
          if (images.length > 1) {
            const mediaGroup = images
              .slice(0, 10)
              .map((imageUrl, index) => toMediaPhoto(imageUrl, index))
              .filter((m) => !!m);

            if (mediaGroup.length === 0) {
              // If nothing supported, fall back to sending just text
              const cleanedText = processedResponse.text
                .replace(/\[INTENT:CREATE_ORDER\][\s\S]*$/g, '')
                .replace(/\[INTENT:ORDER_CONFIRMATION\][\s\S]*$/g, '')
                .replace(/\[INTENT:FETCH_ORDERS\][\s\S]*$/g, '')
                .replace(/\[INTENT:CANCEL_ORDER\][\s\S]*$/g, '')
                .trim();
              if (cleanedText) {
                await this.telegramService.sendRequest(
                  decryptedToken,
                  'sendMessage',
                  {
                    chat_id: customer.telegramId,
                    text: this.markdownToHtml(cleanedText),
                    parse_mode: 'HTML',
                  },
                );
              }
              return;
            }

            const res = await this.telegramService.sendRequest(
              decryptedToken,
              'sendMediaGroup',
              {
                chat_id: customer.telegramId,
                media: mediaGroup,
              },
            );

            if (!res.ok) {
              this.logger.error(
                `Failed to send media group to customer ${customer.id}: ${res.description || 'Unknown error'}`,
              );
            } else {
              this.logger.log(
                `AI media group sent to customer ${customer.id}: ${images.length} images with caption "${processedResponse.text.substring(0, 50)}${processedResponse.text.length > 50 ? '...' : ''}"`,
              );
            }
          } else {
            // Single image
            const firstUrl = toAbsolute(images[0]);
            let caption = processedResponse.text
              .replace(/\[INTENT:CREATE_ORDER\][\s\S]*$/g, '')
              .replace(/\[INTENT:ORDER_CONFIRMATION\][\s\S]*$/g, '')
              .replace(/\[INTENT:FETCH_ORDERS\][\s\S]*$/g, '')
              .replace(/\[INTENT:CANCEL_ORDER\][\s\S]*$/g, '')
              .trim();
            if (caption.length > 1024) caption = caption.slice(0, 1010) + '...';

            const method = isSupportedPhoto(firstUrl)
              ? 'sendPhoto'
              : 'sendDocument';
            const payload = isSupportedPhoto(firstUrl)
              ? {
                  chat_id: customer.telegramId,
                  photo: firstUrl,
                  caption,
                  parse_mode: 'HTML',
                }
              : {
                  chat_id: customer.telegramId,
                  document: firstUrl,
                  caption,
                  parse_mode: 'HTML',
                };

            const res = await this.telegramService.sendRequest(
              decryptedToken,
              method,
              payload,
            );

            if (!res.ok) {
              this.logger.error(
                `Failed to send photo with caption to customer ${customer.id}: ${res.description || 'Unknown error'}`,
              );
            } else {
              this.logger.log(
                `AI photo+caption sent to customer ${customer.id}: "${processedResponse.text.substring(0, 50)}${processedResponse.text.length > 50 ? '...' : ''}"`,
              );
            }
          }
        } else {
          // Clean the response to remove any technical code that might have leaked through
          const cleanedText = processedResponse.text
            .replace(/\[INTENT:CREATE_ORDER\][\s\S]*$/g, '')
            .replace(/\[INTENT:ORDER_CONFIRMATION\][\s\S]*$/g, '')
            .replace(/\[INTENT:FETCH_ORDERS\][\s\S]*$/g, '')
            .replace(/\[INTENT:CANCEL_ORDER\][\s\S]*$/g, '')
            .trim();

          if (cleanedText) {
            const htmlMessage = this.markdownToHtml(cleanedText);
            const res = await this.telegramService.sendRequest(
              decryptedToken,
              'sendMessage',
              {
                chat_id: customer.telegramId,
                text: htmlMessage,
                parse_mode: 'HTML',
              },
            );

            if (!res.ok) {
              this.logger.error(
                `Failed to send message to customer ${customer.id}: ${res.description || 'Unknown error'}`,
              );
            } else {
              this.logger.log(
                `AI response sent to customer ${customer.id}: "${processedResponse.text.substring(0, 50)}${processedResponse.text.length > 50 ? '...' : ''}"`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Telegram API error when sending message to customer ${customer.id}: ${error.message}`,
        );
      }

      // Save bot response to database
      await this.messagesService._saveMessage(
        customer.id,
        processedResponse.text,
        'BOT',
        bot.id,
      );

      // Enqueue debounced AI analysis — fires 5 min after last message in conversation
      this.customerIntelligenceService
        .enqueueAnalysis(customer.id, bot.organizationId)
        .catch((err) =>
          this.logger.error(`Failed to enqueue AI analysis: ${err.message}`),
        );

      // Retention: if this customer was recently sent a win-back, their reply
      // means we re-engaged them — mark the attempt RESPONDED.
      this.retentionService
        .markResponseIfPending(customer.id)
        .catch((err) =>
          this.logger.warn(`Failed to mark win-back response: ${err.message}`),
        );

      // Replenishment: same idea — a reply to a reorder reminder marks it RESPONDED.
      this.replenishmentService
        ?.markResponseIfPending(customer.id)
        .catch((err) =>
          this.logger.warn(`Failed to mark replenishment response: ${err.message}`),
        );
    } catch (error) {
      this.logger.error(
        `Error processing buffered messages for customer ${customer.id}: ${error.message}`,
        error.stack,
      );
    } finally {
      // Remove the "⏳" loading message once processing is done (any exit path)
      if (loadingMessageId !== undefined) {
        await this.telegramService
          .sendRequest(decryptedToken, 'deleteMessage', {
            chat_id: customer.telegramId,
            message_id: loadingMessageId,
          })
          .catch((err) =>
            this.logger.warn(
              `Failed to delete loading message for customer ${customer.id}: ${err.message}`,
            ),
          );
      }
    }
  }

  /**
   * Sends each product search result as its own Telegram photo+caption (with
   * a text-only fallback if the photo send fails or there's no image), then
   * logs the combined captions as a single bot message. Shared by the
   * SEARCH_PRODUCT intent flow and the customer-photo visual search flow.
   */
  private async sendProductCards(
    token: string,
    customer: Customer,
    botId: number,
    cards: ProductCard[],
  ): Promise<void> {
    const baseUrl =
      this.configService.get<string>('BASE_URL') || process.env.BASE_URL || '';
    const toAbsolute = (key: string) => {
      if (/^https?:\/\//i.test(key)) return key;
      const left = baseUrl.replace(/\/+$/g, '');
      const right = key.replace(/^\/+/, '');
      return `${left}/${right}`;
    };

    const cta =
      customer.lang === 'ru'
        ? 'Вы хотите заказать это или что-то еще?'
        : customer.lang === 'en'
          ? 'Would you like to order these or something else?'
          : 'Shularmi yoki boshqa narsa buyurtma qilmoqchimisiz?';

    const combinedCaptionText =
      cards.map((c) => c.caption).join('\n\n') + '\n\n' + cta;

    const withImages = cards.filter((c) => c.imageKey).slice(0, 10);

    if (withImages.length > 1) {
      const media = withImages.map((c, i) => ({
        type: 'photo',
        media: toAbsolute(c.imageKey!),
        ...(i === 0 && combinedCaptionText.length <= 1024
          ? {
              caption: combinedCaptionText,
              parse_mode: 'HTML',
            }
          : {}),
      }));

      if (combinedCaptionText.length > 1024) {
        await this.telegramService.sendRequest(token, 'sendMessage', {
          chat_id: customer.telegramId,
          text: combinedCaptionText,
          parse_mode: 'HTML',
        });
        await this.telegramService.sendRequest(token, 'sendMediaGroup', {
          chat_id: customer.telegramId,
          media: JSON.stringify(media),
        });
      } else {
        await this.telegramService.sendRequest(token, 'sendMediaGroup', {
          chat_id: customer.telegramId,
          media: JSON.stringify(media),
        });
      }
    } else if (withImages.length === 1) {
      const photoUrl = toAbsolute(withImages[0].imageKey!);
      const res = await this.telegramService.sendRequest(token, 'sendPhoto', {
        chat_id: customer.telegramId,
        photo: photoUrl,
        caption: combinedCaptionText.length <= 1024 ? combinedCaptionText : undefined,
        parse_mode: 'HTML',
      });
      if (!res.ok || combinedCaptionText.length > 1024) {
        if (!res.ok) {
           this.logger.warn(`sendPhoto failed (${res.description}), falling back to text`);
        }
        await this.telegramService.sendRequest(token, 'sendMessage', {
          chat_id: customer.telegramId,
          text: combinedCaptionText,
          parse_mode: 'HTML',
        });
      }
    } else {
      await this.telegramService.sendRequest(token, 'sendMessage', {
        chat_id: customer.telegramId,
        text: combinedCaptionText,
        parse_mode: 'HTML',
      });
    }

    await this.messagesService._saveMessage(
      customer.id,
      combinedCaptionText,
      'BOT',
      botId,
    );
  }

  private markdownToHtml(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // bold
      .replace(/_(.*?)_/g, '<i>$1</i>'); // italic
  }

  /** Download a Telegram voice file and transcribe it to text via Gemini. */
  private async transcribeVoice(
    voice: { file_id: string; mime_type?: string },
    decryptedToken: string,
    ctx?: { organizationId?: number; botId?: number },
  ): Promise<string> {
    try {
      const fileData = await this.telegramService.downloadFile(
        decryptedToken,
        voice.file_id,
      );
      if (!fileData) return '';
      const base64 = fileData.buffer.toString('base64');
      return await this.geminiService.transcribeAudio(
        base64,
        voice.mime_type || 'audio/ogg',
        ctx,
      );
    } catch (err: any) {
      this.logger.warn(`Voice transcription failed: ${err.message}`);
      return '';
    }
  }

  /** Extract the payload from a "/start PAYLOAD" or "/start=PAYLOAD" message. */
  private extractStartPayload(text: string): string | null {
    const match = text.match(/^\/start[ =](.+)$/);
    return match ? match[1].trim() : null;
  }

  /** Reply to /referral with the customer's own invite link + points balance. */
  private async sendReferralInfo(
    customer: Customer,
    decryptedToken: string,
  ): Promise<void> {
    const [{ link }, { balance }] = await Promise.all([
      this.loyaltyService.getReferralLink(customer.id),
      this.loyaltyService.getBalance(customer.id),
    ]);
    const lang = customer.lang || 'uz';
    let text: string;
    if (!link) {
      text =
        lang === 'ru'
          ? 'Реферальная ссылка временно недоступна. Попробуйте позже.'
          : lang === 'en'
            ? 'Your referral link is temporarily unavailable. Please try again later.'
            : "Referal havolangiz vaqtincha mavjud emas. Keyinroq urinib ko'ring.";
    } else if (lang === 'ru') {
      text =
        `🎁 <b>Приглашайте друзей!</b>\n\n` +
        `Ваша ссылка:\n${link}\n\n` +
        `Когда приглашённый друг сделает первый заказ, вы оба получите бонусные баллы.\n\n` +
        `💎 Ваши баллы: <b>${balance}</b>`;
    } else if (lang === 'en') {
      text =
        `🎁 <b>Invite your friends!</b>\n\n` +
        `Your link:\n${link}\n\n` +
        `When a friend you invite places their first order, you both earn bonus points.\n\n` +
        `💎 Your points: <b>${balance}</b>`;
    } else {
      text =
        `🎁 <b>Do'stlaringizni taklif qiling!</b>\n\n` +
        `Sizning havolangiz:\n${link}\n\n` +
        `Taklif qilgan do'stingiz birinchi buyurtma qilganda, ikkalangiz ham bonus ball olasiz.\n\n` +
        `💎 Ballaringiz: <b>${balance}</b>`;
    }

    await this.telegramService.sendRequest(decryptedToken, 'sendMessage', {
      chat_id: customer.telegramId,
      text,
      parse_mode: 'HTML',
    });
  }
  private async getCustomerFromWebhook(
    webhookData: WebhookDto,
    botId: number,
    organizationId: number,
  ): Promise<Customer | null> {
    const client = webhookData.message?.from;
    if (!client) {
      return null;
    }
    let customer = await this.customersService._getCustomerByTelegramId(
      client.id.toString(),
      organizationId,
      botId,
    );
    if (!customer) {
      let newCustomerName = client.first_name;
      if (client.last_name) newCustomerName += ` ${client.last_name}`;
      customer = await this.customersService.createCustomer({
        telegramId: client.id.toString(),
        organizationId,
        botId,
        name: newCustomerName,
        username: client.username || null,
      });
    }
    return customer;
  }

  private async validateWebhook(
    webhookData: WebhookDto,
    botId: number,
    organizationId: number,
  ): Promise<{ bot: Bot; customer: Customer } | null> {
    if (!webhookData.message && !webhookData.callback_query) {
      return null;
    }
    if (!webhookData.callback_query) {
      this.processedUpdates.add(webhookData.update_id);
    }

    const [bot, customer] = await Promise.all([
      this.botService._getBot(botId, organizationId),
      this.getCustomerFromWebhook(webhookData, botId, organizationId),
      this.cleanUpProcessedUpdates(),
    ]);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return { bot, customer };
  }

  private async validateMessage(
    webhookData: WebhookDto,
    bot: Bot,
  ): Promise<boolean> {
    const message = webhookData.message;
    const callbackQuery = webhookData.callback_query;
    if (!message && !callbackQuery) {
      return false;
    }
    if (message && !callbackQuery) {
      const messageDate = new Date(message.date * 1000); // Telegram sends Unix timestamp
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - messageDate.getTime();
      const maxAgeMinutes =
        this.configService.get<number>('MAX_MESSAGE_AGE_MINUTES') || 5; // Configurable, default 5 minutes

      if (timeDifference > maxAgeMinutes * 60 * 1000) {
        this.logger.log(
          `Ignoring old message from chat ${message.chat.id}. Message age: ${Math.round(timeDifference / 1000 / 60)} minutes (max: ${maxAgeMinutes} minutes)`,
        );
        return false;
      }

      if (bot.updatedAt && messageDate < bot.updatedAt) {
        this.logger.log(
          `Ignoring message from chat ${message.chat.id} that arrived before bot was enabled. Message: ${messageDate.toISOString()}, Bot enabled: ${bot.updatedAt.toISOString()}`,
        );
        return false;
      }
    } else if (callbackQuery && !message) {
      return true;
    } else {
      return false;
    }
    return true;
  }

  /**
   * Channel-agnostic AI reply generator. Given a customer + incoming text, it
   * meters the conversation, runs the same AI pipeline the Telegram webhook uses
   * (context build → Gemini → intent handling), and returns the processed
   * response. The caller is responsible for delivering the text on its channel
   * (Telegram, Instagram, …) and for persisting the outbound message.
   *
   * Returns null if the customer no longer exists.
   */
  async generateReplyForCustomer(
    customerId: number,
    organizationId: number,
    incomingText: string,
  ): Promise<ProcessedAiResponse | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      this.logger.warn(
        `generateReplyForCustomer: customer ${customerId} not found`,
      );
      return null;
    }

    // Meter the conversation so cross-channel usage counts toward the plan.
    const quotaStatus =
      await this.usageService.checkAndIncrementConversation(organizationId);
    if (quotaStatus === QuotaStatus.THROTTLED) {
      return {
        text:
          customer.lang === 'ru'
            ? 'Извините, сервис временно приостановлен. Пожалуйста, свяжитесь с продавцом.'
            : customer.lang === 'en'
              ? 'Sorry, the service is temporarily paused. Please contact the store owner.'
              : "Kechirasiz, xizmat vaqtincha to'xtatildi. Iltimos, do'kon egasiga murojaat qiling.",
      };
    }

    const history = await this.messagesService._getCustomerLastMessages(
      customerId,
      10,
    );

    return this.processWithAI(
      incomingText,
      history,
      organizationId,
      customer,
    );
  }

  private async processWithAI(
    message: string,
    history: Message[],
    organizationId: number,
    customer: Customer,
    botId?: number,
  ) {
    const [userOrders, productCount, organization, recentlyViewed, fulfillmentSettings] =
      await Promise.all([
        this.ordersService.getOrdersForAI(organizationId, customer.id),
        this.prisma.product.count({
          where: {
            organizationId,
            isDeleted: false,
            status: ProductStatus.ACTIVE,
          },
        }),
        this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, description: true, category: true },
        }),
        this.productSearchService.getRecentlyViewedContext(
          customer.id,
          organizationId,
        ),
        this.prisma.fulfillmentSettings.findUnique({
          where: { organizationId },
        }),
      ]);

    // The full catalog is deliberately NOT loaded here — it used to be
    // serialized into every single message's prompt (unbounded cost that
    // scaled with catalog size). The AI is told only the count and must use
    // [INTENT:SEARCH_PRODUCT] to look products up via real vector search.
    // Full details of whatever was just shown to THIS customer (bounded to
    // a handful of products, not the catalog) are appended separately so
    // follow-ups about that specific product can be answered directly.
    const productContext =
      (productCount > 0
        ? `This business has ${productCount} active product(s) in its catalog.`
        : 'No products are currently available.') +
      (recentlyViewed
        ? `\n\nRECENTLY VIEWED PRODUCT(S) (shown to this customer earlier in the conversation):\n${recentlyViewed}`
        : '');

    const orgContext = organization
      ? {
          name: organization.name,
          description: organization.description || undefined,
          category: organization.category || undefined,
        }
      : undefined;

    const systemInstruction = this.geminiService.buildSystemInstruction(
      message,
      history,
      productContext,
      userOrders,
      customer.lang || undefined,
      orgContext,
      fulfillmentSettings,
    );

    const agentResult = await this.geminiService.runAgentLoop(
      message,
      history,
      systemInstruction,
      async (toolName, args) => {
        return await this.aiResponseHandler.executeToolCall(
          toolName,
          args,
          customer,
          organizationId,
          message
        );
      },
      { organizationId, botId }
    );

    // Extract side effects
    let productCards: any[] = [];
    let orderCreated = false;
    
    for (const effect of agentResult.toolSideEffects) {
       if (effect.productCards) {
          productCards.push(...effect.productCards);
       }
       if (effect.orderCreated) {
          orderCreated = true;
       }
    }

    return {
      text: agentResult.text,
      productCards: productCards.length > 0 ? productCards : undefined,
      orderCreated
    };
  }

  private async cleanUpProcessedUpdates() {
    if (this.processedUpdates.size > 1000) {
      const sortedIds = Array.from(this.processedUpdates).sort((a, b) => a - b);
      const toDelete = sortedIds.slice(0, sortedIds.length - 1000);
      toDelete.forEach((id) => this.processedUpdates.delete(id));
    }
  }
}
