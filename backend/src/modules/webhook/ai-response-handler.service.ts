import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '@modules/orders/orders.service';
import { AiResponse, GeminiService } from '@core/gemini/gemini.service';
import { Customer, Order } from '@prisma/client';
import { EmbadingService } from '@modules/embading/embading.service';
import { ProductsService } from '@modules/products/products.service';
import { SupportService } from '@modules/support/support.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { PaymentProvider } from '@prisma/client';

export interface ProductCard {
  caption: string;
  imageKey: string | null;
}

export interface ProcessedAiResponse {
  text: string;
  orderCreated?: boolean;
  orderId?: number;
  ordersFetched?: boolean;
  orderCancelled?: boolean;
  productCards?: ProductCard[];
  escalated?: boolean;
  ticketId?: number;
}

@Injectable()
export class AiResponseHandlerService {
  private readonly logger = new Logger(AiResponseHandlerService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly geminiService: GeminiService,
    private readonly embadingService: EmbadingService,
    private readonly productsService: ProductsService,
    private readonly supportService: SupportService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Process AI response and execute corresponding order actions
   */
  async processAiResponse(
    aiResponse: AiResponse,
    customer: Customer,
    organizationId: number,
    originalUserMessage?: string,
  ): Promise<ProcessedAiResponse> {
    try {
      switch (aiResponse.intent) {
        case 'CREATE_ORDER':
          return await this.handleCreateOrderIntent(
            aiResponse,
            customer,
            organizationId,
            originalUserMessage,
          );

        case 'FETCH_ORDERS':
          return await this.handleFetchOrdersIntent(
            aiResponse,
            customer,
            organizationId,
            originalUserMessage,
          );

        case 'CANCEL_ORDER':
          return await this.handleCancelOrderIntent(
            aiResponse,
            customer,
            organizationId,
            originalUserMessage,
          );

        case 'ASK_FOR_INFO':
          return await this.handleAskForInfoIntent(
            aiResponse,
            customer,
            organizationId,
            originalUserMessage,
          );

        case 'SEARCH_PRODUCT':
          return await this.handleSearchProductIntent(
            aiResponse,
            customer,
            organizationId,
            originalUserMessage,
          );

        case 'ESCALATE_TO_SUPPORT':
          return await this.handleEscalateToSupportIntent(
            aiResponse,
            customer,
            organizationId,
          );

        default:
          return {
            text: aiResponse.text,
          };
      }
    } catch (error) {
      this.logger.error(
        `Error processing AI response: ${error.message}`,
        error.stack,
      );

      return {
        text:
          aiResponse.text ||
          "I'm sorry, I encountered an error processing your request. Please try again.",
      };
    }
  }

  /**
   * Handle CREATE_ORDER intent
   */
  private async handleCreateOrderIntent(
    aiResponse: AiResponse,
    customer: Customer,
    organizationId: number,
    originalUserMessage?: string,
  ): Promise<ProcessedAiResponse> {
    if (!aiResponse.orderData) {
      this.logger.warn(
        'CREATE_ORDER intent received but no order data provided',
      );
      return {
        text:
          aiResponse.text ||
          "I'd be happy to help you place an order! Could you please tell me what you'd like to order?",
      };
    }

    try {
      this.logger.log(
        `Creating order with data: ${JSON.stringify(aiResponse.orderData)}`,
      );
      const order = await this.ordersService.createFromAIResponse(
        aiResponse.orderData,
        customer,
        organizationId,
      );
      this.logger.log(`Order created successfully: ${order.id}`);

      // Convert items to product names for confirmation message
      let itemNames: string[] = [];
      this.logger.log(
        `Order details items: ${JSON.stringify(order.details?.items)}`,
      );
      this.logger.log(`Order orderItems: ${JSON.stringify(order.orderItems)}`);

      // Use the new OrderItem structure
      if (order.orderItems && Array.isArray(order.orderItems)) {
        itemNames = order.orderItems.map((orderItem: any) => {
          const productName = orderItem.product?.name || 'Unknown Product';
          const quantity = orderItem.quantity || 1;
          return `${productName} (${quantity} qty)`;
        });
        this.logger.log(
          `Using orderItems product names: ${itemNames.join(', ')}`,
        );
      } else if (Array.isArray(order.details?.items)) {
        // Fallback to old structure if orderItems not available
        if (
          order.details.items.length > 0 &&
          typeof order.details.items[0] === 'object'
        ) {
          itemNames = order.details.items.map(
            (item: any) =>
              `Product ID ${item.productId} (${item.quantity} qty)`,
          );
          this.logger.log(
            `Using fallback product names: ${itemNames.join(', ')}`,
          );
        } else {
          itemNames = order.details.items;
          this.logger.log(`Using items as strings: ${itemNames.join(', ')}`);
        }
      } else if (order.details?.items) {
        itemNames = [order.details.items];
        this.logger.log(`Using single item: ${itemNames.join(', ')}`);
      } else {
        itemNames = ['To be specified'];
        this.logger.log(`Using default item name: ${itemNames.join(', ')}`);
      }

      // Generate confirmation message using Gemini with automatic language detection
      const confirmationMessage =
        await this.geminiService.generateOrderConfirmation(
          {
            orderId: order.id,
            items: itemNames,
            phoneNumber: order.details?.phoneNumber,
            notes: order.details?.notes,
            totalPrice: order.totalPrice,
            currency: 'USD', // Default currency, can be enhanced to get from products
          },
          originalUserMessage || '',
          { organizationId },
        );

      this.logger.log(
        `Order created via AI: ${order.id} for customer: ${customer.id}`,
      );

      // In-bot payment: append a Payme checkout link when the provider is
      // configured. Stays inert (no link) on installs without credentials.
      const paymentLine = await this.buildOrderPaymentLine(order.id, customer);

      return {
        text: confirmationMessage + paymentLine,
        orderCreated: true,
        orderId: order.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create order via AI: ${error.message}`,
        error.stack,
      );

      // Detect language and provide appropriate error message
      const detectedLanguage = await this.geminiService.detectLanguage(
        originalUserMessage || '',
        { organizationId },
      );
      let errorMessage =
        "I'm sorry, I couldn't process your order right now. Please try again or contact our support team.";

      if (detectedLanguage === 'uz') {
        errorMessage =
          "Kechirasiz, buyurtmangizni qayta ishlashda muammo bo'ldi. Iltimos, qayta urinib ko'ring yoki qo'llab-quvvatlash jamoasi bilan bog'laning.";
      } else if (detectedLanguage === 'ru') {
        errorMessage =
          'Извините, не удалось обработать ваш заказ. Попробуйте еще раз или обратитесь в службу поддержки.';
      }

      return {
        text: errorMessage,
      };
    }
  }

  /**
   * Handle FETCH_ORDERS intent
   */
  private async handleFetchOrdersIntent(
    aiResponse: AiResponse,
    customer: Customer,
    organizationId: number,
    originalUserMessage?: string,
  ): Promise<ProcessedAiResponse> {
    try {
      const orders = await this.ordersService.getOrdersForCustomer(
        customer.id,
        organizationId,
        5, // Last 5 orders
      );

      // Generate AI response for orders list in customer's language
      const ordersMessage = await this.geminiService.generateOrdersListResponse(
        orders,
        originalUserMessage || 'Show my orders',
        { organizationId },
      );

      this.logger.log(`Orders fetched via AI for customer: ${customer.id}`);

      return {
        text: ordersMessage,
        ordersFetched: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders via AI: ${error.message}`,
        error.stack,
      );

      // Detect language and provide appropriate error message
      const detectedLanguage = await this.geminiService.detectLanguage(
        originalUserMessage || '',
        { organizationId },
      );
      let errorMessage =
        "I'm having trouble retrieving your orders right now. Please try again later.";

      if (detectedLanguage === 'uz') {
        errorMessage =
          "Buyurtmalaringizni olishda muammo bo'ldi. Iltimos, keyinroq urinib ko'ring.";
      } else if (detectedLanguage === 'ru') {
        errorMessage =
          'У меня проблемы с получением ваших заказов. Попробуйте позже.';
      }

      return {
        text: errorMessage,
      };
    }
  }

  /**
   * Handle CANCEL_ORDER intent
   */
  private async handleCancelOrderIntent(
    aiResponse: AiResponse,
    customer: Customer,
    organizationId: number,
    originalUserMessage?: string,
  ): Promise<ProcessedAiResponse> {
    // Extract order ID from the AI response or order data
    const orderId =
      aiResponse.orderData?.orderId ||
      this.extractOrderIdFromText(aiResponse.text);

    if (!orderId) {
      return {
        text: "I'd be happy to help you cancel an order! Could you please tell me which order you'd like to cancel? You can provide the order number.",
      };
    }

    try {
      const order = await this.ordersService.cancelOrder(
        orderId,
        customer.id,
        organizationId,
      );

      // Generate AI response for order cancellation in customer's language
      const cancellationMessage =
        await this.geminiService.generateOrderCancellationResponse(
          order,
          originalUserMessage || 'Cancel my order',
          { organizationId },
        );

      this.logger.log(
        `Order cancelled via AI: ${order.id} for customer: ${customer.id}`,
      );

      return {
        text: cancellationMessage,
        orderCancelled: true,
        orderId: order.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel order via AI: ${error.message}`,
        error.stack,
      );

      let errorMessage: string;

      if (error.message.includes('not found')) {
        errorMessage =
          "I couldn't find that order. Please check the order number and try again.";
      } else if (error.message.includes('Cannot cancel')) {
        errorMessage =
          "I'm sorry, but that order cannot be cancelled at this time. Please contact our support team for assistance.";
      } else {
        errorMessage =
          "I'm sorry, I couldn't cancel your order right now. Please try again or contact our support team.";
      }

      return {
        text: errorMessage,
      };
    }
  }

  /**
   * Extract order ID from text (simple regex pattern)
   */
  private extractOrderIdFromText(text: string): number | null {
    const match = text.match(/order\s*#?(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Get status emoji for order status
   */
  private getStatusEmoji(status: string): string {
    switch (status.toLowerCase()) {
      case 'new':
        return '🆕';
      case 'pending':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'shipped':
        return '🚚';
      case 'delivered':
        return '📦';
      case 'cancelled':
        return '❌';
      default:
        return '📋';
    }
  }

  private async handleAskForInfoIntent(
    aiResponse: AiResponse,
    customer: Customer,
    organizationId: number,
    originalUserMessage?: string,
  ): Promise<ProcessedAiResponse> {
    this.logger.log(`ASK_FOR_INFO intent received for customer ${customer.id}`);
    this.logger.log(
      `Missing info: ${JSON.stringify(aiResponse.missingInfo || [])}`,
    );

    // Return the AI response text as-is, since it should contain the request for missing information
    return {
      text:
        aiResponse.text ||
        'I need some additional information to process your order.',
    };
  }

  /**
   * Build a "pay now" line for an order confirmation. Returns an empty string
   * when no payment provider is configured or link generation fails, so the
   * order confirmation is never blocked by payments.
   */
  private async buildOrderPaymentLine(
    orderId: number,
    customer: Customer,
  ): Promise<string> {
    if (!this.paymentsService.isConfigured(PaymentProvider.PAYME)) {
      return '';
    }
    try {
      const { url } = await this.paymentsService.createOrderPaymentLink(
        orderId,
        PaymentProvider.PAYME,
      );
      const label =
        customer.lang === 'ru'
          ? '💳 Оплатить'
          : customer.lang === 'en'
            ? '💳 Pay now'
            : "💳 To'lov qilish";
      return `\n\n${label}: ${url}`;
    } catch (error) {
      this.logger.warn(
        `Failed to build payment link for order ${orderId}: ${error.message}`,
      );
      return '';
    }
  }

  /**
   * Handle ESCALATE_TO_SUPPORT intent — the customer wants a human agent.
   * Creates a dashboard support ticket so the merchant can follow up.
   */
  private async handleEscalateToSupportIntent(
    aiResponse: AiResponse,
    customer: Customer,
    organizationId: number,
  ): Promise<ProcessedAiResponse> {
    const fallbackText =
      customer.lang === 'ru'
        ? 'Я передал ваш запрос нашей команде — с вами скоро свяжется человек.'
        : customer.lang === 'en'
          ? "I've passed your request to our team — a human will get back to you shortly."
          : "So'rovingizni jamoamizga yetkazdim — tez orada operator siz bilan bog'lanadi.";

    try {
      const ticket = await this.supportService.createFromAIResponse(
        aiResponse.escalationData,
        customer,
        organizationId,
      );
      this.logger.log(
        `Support ticket #${ticket.id} created via AI escalation for customer ${customer.id}`,
      );
      return {
        text: aiResponse.text || fallbackText,
        escalated: true,
        ticketId: ticket.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create support ticket via AI escalation: ${error.message}`,
        error.stack,
      );
      // Still acknowledge the customer even if ticket creation failed.
      return { text: aiResponse.text || fallbackText };
    }
  }

  /**
   * Format product search results into a readable message
   */
  async formatProductSearchResults(
    searchResults: any[],
    language: string,
  ): Promise<string> {
    if (!searchResults || searchResults.length === 0) {
      return language === 'uz'
        ? "Kechirasiz, so'rovingiz bo'yicha hech narsa topilmadi."
        : language === 'ru'
          ? 'Извините, по вашему запросу ничего не найдено.'
          : "I couldn't find any products matching your query.";
    }

    const isUzbek = language === 'uz';
    const isRussian = language === 'ru';
    // const isEnglish = language === 'en'; // Default

    let titleText = 'Here is what I found:\n\n';
    let footerText = 'Would you like to order any of these?';

    if (isUzbek) {
      titleText = `Mana topilgan mahsulotlar:\n\n`;
      footerText = 'Birortasiga buyurtma beramizmi?';
    } else if (isRussian) {
      titleText = `Вот что я нашел:\n\n`;
      footerText = 'Хотите заказать что-нибудь из этого?';
    }

    let responseText = titleText;

    searchResults.forEach((p) => {
      // Handle both Weaviate object structure (properties in 'properties') and flat structure
      const props = p.properties ? (p.properties as any) : p;

      const price = props.price
        ? `${props.price} ${props.currency || 'USD'}`
        : 'Price not available';
      const name = props.name || 'Unknown Product';
      const description = props.description
        ? props.description.substring(0, 100) + '...'
        : '';

      responseText += `🛍️ *${name}*\n💰 ${price}\n📝 ${description}\n\n`;
    });

    responseText += footerText;

    return responseText;
  }

  /**
   * Handle SEARCH_PRODUCT intent
   */
  private async handleSearchProductIntent(
    aiResponse: AiResponse,
    customer: Customer,
    organizationId: number,
    originalUserMessage?: string,
  ): Promise<ProcessedAiResponse> {
    const searchQuery = aiResponse.searchQuery;

    if (!searchQuery) {
      return {
        text:
          aiResponse.text ||
          'I can help you find products. What are you looking for?',
      };
    }

    try {
      this.logger.log(`Searching for products with query: "${searchQuery}"`);

      const products = await this.productsService.getProductsForOrganization(organizationId);
      this.logger.log(`Loaded ${products.length} products for org ${organizationId}`);

      if (products.length === 0) {
        return { text: aiResponse.text || 'Hozircha do\'konimizda mahsulotlar mavjud emas.' };
      }

      const { matches, noResultText } = await this.geminiService.matchProductsInContext(
        products,
        searchQuery,
        originalUserMessage || searchQuery,
        { organizationId },
      );

      this.logger.log(`Matched products: ${JSON.stringify(matches.map((m) => m.id))}`);

      if (matches.length === 0) {
        return {
          text: noResultText || aiResponse.text || `"${searchQuery}" bo'yicha hech narsa topilmadi.`,
        };
      }

      const productById = new Map(products.map((p) => [p.id, p]));
      const productCards: ProductCard[] = matches.map((m) => ({
        caption: m.caption,
        imageKey: productById.get(m.id)?.imageKey ?? null,
      }));

      this.logger.log(`Product cards imageKeys: ${JSON.stringify(productCards.map((c) => c.imageKey))}`);

      return { text: '', productCards };
    } catch (error: any) {
      this.logger.error(
        `Failed to search products via AI: ${error.message}`,
        error.stack,
      );

      return {
        text: "I'm having trouble searching for products right now. Please try again later.",
      };
    }
  }
}
