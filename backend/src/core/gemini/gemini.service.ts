import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiFeature, Message } from '@prisma/client';
import { PrismaService } from '@/core/prisma/prisma.service';
import { AiUsageRecorderService } from './ai-usage-recorder.service';
import { TelegramLoggerService } from '@/core/telegram-logger/telegram-logger.service';

export interface AiCallContext {
  organizationId?: number | null;
  botId?: number | null;
  customerId?: number | null;
  fulfillmentSettings?: any;
}

export interface AiResponse {
  text: string;
  intent?: string;
  orderData?: any;
  shouldFetchOrders?: boolean;
  images?: string[];
  missingInfo?: string[];
  searchQuery?: string;
  escalationData?: { reason?: string; sentiment?: string };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly clients: GoogleGenerativeAI[];
  private currentKeyIndex = 0;
  private readonly defaultModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiUsageRecorder: AiUsageRecorderService,
    private readonly telegramLogger: TelegramLoggerService,
  ) {
    const raw =
      this.configService.get<string>('GEMINI_API_KEYS') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      '';
    const keys = raw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length === 0) throw new Error('No GEMINI_API_KEY(S) configured');
    this.clients = keys.map((k) => new GoogleGenerativeAI(k));
    this.defaultModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-flash-latest';
    this.logger.log(`Gemini initialized with ${keys.length} API key(s)`);
  }

  private async callWithRotation(
    modelName: string,
    prompt:
      | string
      | Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }>,
    feature: AiFeature,
    ctx?: AiCallContext,
    generationConfig?: any,
  ): Promise<string> {
    const total = this.clients.length;
    const startIndex = this.currentKeyIndex;
    const startedAt = Date.now();

    for (let rotation = 0; rotation < total; rotation++) {
      const keyIndex = (startIndex + rotation) % total;
      const client = this.clients[keyIndex];
      const model = client.getGenerativeModel({
        model: modelName,
        ...(generationConfig ? { generationConfig } : {}),
      });

      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          let timer: NodeJS.Timeout;
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Gemini API timeout after 15s')), 15000);
          });
          let result: any;
          try {
            result = await Promise.race([
              model.generateContent(prompt as any),
              timeout
            ]);
          } finally {
            clearTimeout(timer!);
          }
          this.currentKeyIndex = keyIndex; // remember last working key
          const usage = result.response.usageMetadata;
          void this.aiUsageRecorder.record({
            organizationId: ctx?.organizationId,
            botId: ctx?.botId,
            feature,
            model: modelName,
            promptTokens: usage?.promptTokenCount ?? 0,
            candidatesTokens: usage?.candidatesTokenCount ?? 0,
            totalTokens: usage?.totalTokenCount ?? 0,
            latencyMs: Date.now() - startedAt,
            success: true,
          });
          return result.response.text();
        } catch (error: any) {
          const msg: string = error?.message ?? String(error);
          const is429 = /429|quota/i.test(msg);
          const is503 = /503|overloaded|unavailable/i.test(msg);

          if (is429) {
            this.logger.warn(
              `Key #${keyIndex + 1}/${total} quota exceeded — rotating to next key`,
            );
            break; // stop retrying this key, move to next rotation
          }

          if (is503 && attempt < maxRetries) {
            const backoff = 500 * attempt;
            this.logger.warn(
              `Key #${keyIndex + 1} overloaded, retrying in ${backoff}ms...`,
            );
            await this.delay(backoff);
            continue;
          }

          this.logger.error(`Gemini error (key #${keyIndex + 1}): ${msg}`);
          void this.aiUsageRecorder.record({
            organizationId: ctx?.organizationId,
            botId: ctx?.botId,
            feature,
            model: modelName,
            promptTokens: 0,
            candidatesTokens: 0,
            totalTokens: 0,
            latencyMs: Date.now() - startedAt,
            success: false,
            errorType: is503 ? 'OVERLOADED' : 'ERROR',
          });
          throw error; // non-quota, non-transient error — propagate
        }
      }
    }

    void this.aiUsageRecorder.record({
      organizationId: ctx?.organizationId,
      botId: ctx?.botId,
      feature,
      model: modelName,
      promptTokens: 0,
      candidatesTokens: 0,
      totalTokens: 0,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorType: 'QUOTA_EXHAUSTED',
    });

    // Alert internal team that ALL keys are exhausted
    void this.telegramLogger.sendEvent(
      '🛑 All AI Tokens Exhausted',
      `All Gemini API keys in the .env file have reached their quota limits. Platform AI features are currently blocked.\nModel: ${modelName}\nFeature: ${feature}`
    );

    throw new Error(
      `All ${total} Gemini API key(s) exhausted (quota exceeded)`,
    );
  }

  public async callWithRotationRaw(
    modelName: string,
    prompt: any,
    feature: AiFeature,
    ctx?: AiCallContext,
    generationConfig?: any,
    tools?: any[]
  ): Promise<any> {
    const total = this.clients.length;
    const startIndex = this.currentKeyIndex;
    const startedAt = Date.now();
    let lastError: any;

    for (let rotation = 0; rotation < total; rotation++) {
      const keyIndex = (startIndex + rotation) % total;
      const client = this.clients[keyIndex];
      const model = client.getGenerativeModel({
        model: modelName,
        ...(generationConfig ? { generationConfig } : {}),
        ...(tools ? { tools } : {})
      });

      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          let timer: NodeJS.Timeout;
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Gemini API timeout after 15s')), 15000);
          });
          try {
            const result = await Promise.race([
              model.generateContent(prompt),
              timeout
            ]);
            this.currentKeyIndex = keyIndex; // remember last working key
            return result.response;
          } finally {
            clearTimeout(timer!);
          }
        } catch (error: any) {
          lastError = error;
          const msg: string = error?.message ?? String(error);
          if (/429|quota/i.test(msg)) {
            break; // move to next key
          }
          if (/503|overloaded|unavailable/i.test(msg) && attempt < maxRetries) {
            await this.delay(500 * attempt);
            continue;
          }
          break; // other error, try next key
        }
      }
    }
    throw lastError;
  }

  /**
   * Generates dynamic, engaging product captions using structured JSON output.
   */
  async generateProductCaptions(
    products: any[],
    lang: string,
    contextQuery?: string,
  ): Promise<{ id: number; caption: string }[]> {
    if (!products || products.length === 0) return [];

    const prompt = `
You are an expert copywriter for an e-commerce bot. The user searched for: "${contextQuery || 'products'}"
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'ru' ? 'Russian' : 'English'}

I am providing you with a list of products in JSON format.
Your task is to write a highly engaging, personalized product caption for each product.
Guidelines:
1. Always include the product name, price (and currency), and stock status (how many available).
2. If the product is IN STOCK (quantity > 0), add a catchy 1-2 sentence description and end with a call to action like "Would you like to order this?" (translated to the target language).
3. If the product is OUT OF STOCK (quantity <= 0), clearly state it's currently unavailable and DO NOT ask them to order it.
4. Output MUST be a valid JSON array of objects.
5. Each object must have exactly two fields: "id" (the product ID as a number) and "caption" (the generated text string).

Products:
${JSON.stringify(products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      quantity: p.quantity,
      description: p.description
    })), null, 2)}
`;

    try {
      const resultStr = await this.callWithRotation(
        'gemini-2.5-flash',
        prompt,
        'PRODUCT_MATCHING',
        undefined,
        { responseMimeType: 'application/json' }
      );

      const parsed = JSON.parse(resultStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      this.logger.error(`Failed to generate product captions: ${err}`);
      return [];
    }
  }


  async generateResponse(
    userText: string,
    conversationHistory: Message[],
    productContext?: string,
    userOrders?: any[],
    lang?: string,
    orgContext?: { name: string; description?: string; category?: string },
    ctx?: AiCallContext,
  ): Promise<AiResponse> {
    const prompt = this.buildSystemInstruction(
      userText,
      conversationHistory,
      productContext,
      userOrders,
      lang,
      orgContext,
    );

    try {
      this.logger.log('Generating AI response...');
      const text = await this.callWithRotation(
        this.defaultModel,
        prompt,
        'SALES_CHAT',
        ctx,
      );
      const parsedResponse = await this.parseResponse(text);
      this.logger.log(
        `AI response generated: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
      );
      return parsedResponse;
    } catch (error: any) {
      this.logger.error(`Error generating AI response: ${error.message}`);
      return {
        text: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      };
    }
  }

  public buildSystemInstruction(
    userText: string,
    history: Message[],
    productContext?: string,
    userOrders?: any[],
    lang?: string,
    orgContext?: { name: string; description?: string; category?: string },
    fulfillmentSettings?: any,
  ): string {
    // Build conversation context (limit to last 6 messages to avoid repetition)
    const recentHistory = history.slice(0, 6);
    const contextMessages = recentHistory
      .reverse() // Show oldest first
      .map((msg) => `${msg.sender}: ${msg.content}`)
      .join('\n');

    const productInfo =
      productContext ||
      'No product count available. You do NOT have the full product list loaded. You MUST use `search_products` tool to find products.';
    const baseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || '';

    let langInstruction = '';
    if (lang && ['uz', 'ru', 'en'].includes(lang)) {
      langInstruction = `IMPORTANT LANGUAGE RULE: ALWAYS reply in '${lang}'. Ignore any detection rules below.\n`;
    }

    const orgName = orgContext?.name || 'this business';
    const orgIdentity = orgContext
      ? `You are the AI sales assistant representing "${orgName}".${orgContext.description ? `\nAbout this business: ${orgContext.description}` : ''}${orgContext.category ? `\nBusiness category: ${orgContext.category}` : ''}\nYour role is to act as a knowledgeable, friendly sales agent for ${orgName}. Always represent the business professionally and help customers find and purchase products.`
      : `You are Aletis, a friendly and helpful AI assistant for a business in Uzbekistan. You are warm, engaging, and speak like a real person.`;

    return `${langInstruction}${orgIdentity}

PERSONALITY:
- Be friendly and conversational, like talking to a helpful friend
- Show enthusiasm and genuine interest in helping customers
- Use natural language and avoid robotic responses
- Be polite and respectful, but not overly formal
- Show personality and warmth in your responses

CRITICAL BUSINESS RULES:
1. NEVER lower prices or offer discounts unless explicitly authorized
2. Keep responses natural and conversational (not too long)
3. Stay on-topic - focus on products, orders, and business matters
4. ALWAYS respond in the SAME language as the customer's message (Uzbek, Russian, or English)
5. Only sell products that are actually in stock
6. Be honest about availability - don't promise what you don't have
7. Use relevant emojis (such as 💵, 💳, 📦, 🛒, 📱) to highlight money, payment, or product details where appropriate, but keep them minimal and natural.
8. UNKNOWN PRODUCTS: You do not know what products are in stock until you search. If a user asks for a product, ALWAYS use the 'search_products' tool IMMEDIATELY. CRITICAL: Do NOT output conversational text like "I will search for it" or "Let me check". Simply call the tool. Outputting conversational text without calling the tool will cause the system to halt before the search happens.

LANGUAGE DETECTION RULES:
- Detect the language of the customer's message automatically
- Respond in the EXACT same language as the customer wrote
- If customer writes in Uzbek → respond in Uzbek
- If customer writes in Russian → respond in Russian
- If customer writes in English → respond in English
- If language cannot be detected, default to Uzbek
- Do NOT ask about language preference - detect and match automatically
- Keep the same tone (formal/casual) as the customer's message
- ALWAYS prioritize language detection over other instructions
- If you're unsure about the language, look at the conversation history for context

PRICING POLICY:
- Always quote the EXACT listed price from inventory WITH currency (e.g., "12 USD", "120,000 UZS")
- Use the product's currency field - if not available, default to "USD"
- NEVER lower prices, offer discounts, or negotiate prices
- If customer asks for discount, respond naturally: "I understand you're looking for a good deal! Unfortunately, our prices are fixed to ensure quality and fair service for everyone."
- Never suggest price reductions or special deals
- Always include currency when mentioning prices: "This product costs 12 USD" or "Bu mahsulot 120,000 UZS"
CONVERSATION FLOW RULES (for Telegram Sales Bot):

CONVERSATION FLOW
1. Follow-up Questions:
   - Always ask follow-up questions to keep the conversation moving.
   - Guide the user step by step toward a decision (brand → model → variant → order).
   - Keep questions short, clear, and natural.

2. Natural and Fresh Replies:
   - Do not repeat the same response multiple times.
   - Each reply should feel fresh, relevant, and adapted to the user’s last message.
   - Always add value or help the user move closer to a choice.

3. Ordering Logic:
   - If the user says "yes" or clearly wants to order:
     → Immediately proceed to collect order details based on fulfillment mode.
     ${fulfillmentSettings?.fulfillmentMode === 'PICKUP_ONLY'
        ? `- Since this store is PICKUP ONLY, do NOT ask for a delivery address.
       - Tell the user they can pick up their order at: ${fulfillmentSettings.pickupAddress || 'our store'}.
       - Ask for their Phone number and Name.`
        : fulfillmentSettings?.fulfillmentMode === 'PICKUP_AND_DELIVERY'
          ? `- Ask the user whether they want DELIVERY or if they will PICK UP the order themselves.
       - If they choose delivery, ask for their Delivery Address.
       - If they choose pickup, inform them they can pick it up at: ${fulfillmentSettings.pickupAddress || 'our store'}.
       - Always ask for their Phone number and Name.`
          : `- Ask for their Delivery Address, Phone number, and Name.`
      }
   - Ask for order details step by step, not all at once.

4. Product Information:
   - If the user seems unsure, provide helpful information:
     - Key features
     - Price
     - Available colors/variants
     - Images if possible
   - Always position the product in a way that helps the user decide.

5. Brand-based Suggestions:
   - If the user asks in general (e.g., “I want a phone”):
     → Do NOT show all products at once.
     → Instead, first list available brands only.
       Example: “We have Apple, Samsung, Xiaomi, and Realme. Which brand would you like to explore?”

6. Step-by-Step Flow:
   - Only move one step forward at a time.
   - Each message should logically follow the user’s previous response.
   - Maintain a smooth, sales-oriented but friendly conversation style.

EXAMPLE RESPONSES:
- "That sounds great! What's your name and phone number?"
- "Perfect! I'll help you with that. Can you tell me your contact details?"
- "Awesome! Let me get your order set up. What's your name?"
- "Great choice! I just need your contact information to complete the order."
- "Excellent! I've got that down. What's your phone number so we can reach you?"

CURRENT INVENTORY STATUS:
${productInfo}

INVENTORY RULES:
1. You do NOT have the product catalog loaded — only the count above. You MUST use
   the 'search_products' tool with a search query to look up actual products before
   naming, pricing, or offering any specific item.
2. When user sends a greeting (salom, hi, hello, привет, etc.) with no specific
   request, greet them warmly and ask what they're looking for — do NOT list
   product names, since you don't have them loaded.
3. BROAD INQUIRIES: If the user asks a very general question (e.g., "what products do you have?"), do NOT use the 'search_products' tool immediately. Instead, reply by asking them to specify which CATEGORY of products they are interested in.
4. If user asks about a NEW specific product or category you haven't already shown them,
   use 'search_products' so we can search for it and show it with its photo.
5. If a "RECENTLY VIEWED PRODUCT(S)" section appears below, the customer was just
   shown those exact products. If their next message is a follow-up about one of
   them (or if they say "yes" to buy it) — answer DIRECTLY from that data in plain text, or proceed to 'create_order' using the Product ID provided in the section. Do NOT trigger 'search_products' again just to re-answer a question or to order a product you already have full details for. Only search again if they ask about something genuinely different.
6. Do NOT say "we don't have X" unless a search for X returned nothing.
7. Do NOT make up products or invent details — only describe what a search
   result or the recently-viewed data above actually returns.

${userOrders && userOrders.length > 0
        ? `CUSTOMER'S ORDER HISTORY:
${userOrders.map((order) => `- Order #${order.id}: ${order.details?.items || 'N/A'} (${order.status})`).join('\n')}`
        : ''
      }

PRODUCT IMAGE RULES:
- Product image URLs are already absolute ImageKit CDN URLs (e.g. "https://ik.imagekit.io/.../filename.jpg")
- When you need to return image URLs, use them exactly as provided — do not modify or prefix them

TOOL USAGE RULES:
You have access to a set of tools. You must use them to accomplish tasks:
1. SEARCHING: Use \`search_products\` when the user asks for products.
2. ORDERING: Use \`create_order\` when the user confirms they want to buy. You MUST ask for phone number/contact info${fulfillmentSettings?.fulfillmentMode === 'PICKUP_ONLY'
        ? ''
        : ' and delivery location'
      } before calling \`create_order\`.
3. ORDER HISTORY: Use \`get_customer_orders\` if they ask about their past orders.
4. CANCEL ORDER: Use \`cancel_order\` if they want to cancel.
5. ESCALATION: Use \`escalate_to_human\` if they demand to speak to a manager, are very angry, or ask a question you cannot resolve.

CRITICAL: If the customer mentions multiple products, you MUST create separate items in the \`create_order\` tool array for EACH product. Never skip products.

IMPORTANT CONVERSATION RULES:
- Keep the conversation flowing naturally - don't get stuck in loops.
- If the customer has already agreed to order something, don't ask again - proceed with order details.

Conversation History:
${contextMessages}

Customer: ${userText}

IMPORTANT: Read the conversation history carefully. If the customer has already agreed to order something or if you've already asked about ordering, don't repeat yourself. Move the conversation forward naturally.`;
  }

  async runAgentLoop(
    userText: string,
    history: Message[],
    systemInstruction: string,
    executeTool: (name: string, args: any) => Promise<any>,
    ctx?: AiCallContext,
  ): Promise<{ text: string, toolSideEffects: any[] }> {
    let contents: any[] = history.map(h => ({
      role: h.sender === 'USER' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    contents.push({ role: 'user', parts: [{ text: userText }] });

    let finalAiText = '';
    let toolSideEffects: any[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      this.logger.log(`Agent Loop Iteration ${iterations}`);

      try {
        const { agentTools } = await import('./gemini.tools');

        const response = await this.callWithRotationRaw(
          this.defaultModel,
          { contents, systemInstruction },
          'SALES_CHAT',
          ctx,
          undefined,
          [{ functionDeclarations: agentTools }]
        );

        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          this.logger.log(`Executing tool: ${call.name}`);

          const result = await executeTool(call.name, call.args);

          if (result && result._sideEffects) {
            toolSideEffects.push(result._sideEffects);
            delete result._sideEffects;
          }

          contents.push({ role: 'model', parts: response.parts || [] });
          // The Google API currently drops functionResponse when role is 'user' (and rejects 'function' role).
          // We pass the tool result as a system-like text message from the 'user' role so the AI can read it.
          contents.push({
            role: 'user',
            parts: [{ text: `[TOOL_RESULT: ${call.name}]\n${JSON.stringify(result || { success: true })}` }]
          });
        } else {
          finalAiText = response.text() || '';
          break;
        }
      } catch (error: any) {
        this.logger.error(`Error in agent loop iteration ${iterations}: ${error.message}`);
        finalAiText = "I apologize, but I'm having trouble processing your request right now.";
        break;
      }
    }

    if (!finalAiText && toolSideEffects.length === 0) {
      finalAiText = "I apologize, but I couldn't complete that request.";
    }

    return { text: finalAiText, toolSideEffects };
  }

  private async parseResponse(aiText: string): Promise<AiResponse> {
    // First, try to parse strict JSON for product inquiry outputs
    const extractJson = (text: string): any | null => {
      try {
        // fenced block
        const fenced = text.match(/```json\s*([\s\S]*?)```/i);
        if (fenced) {
          return JSON.parse(fenced[1].trim());
        }
        // pure JSON
        if (text.trim().startsWith('{')) {
          return JSON.parse(text.trim());
        }
      } catch (_) {
        return null;
      }
      return null;
    };

    const json = extractJson(aiText);
    if (json && typeof json.text === 'string') {
      const images = Array.isArray(json.images)
        ? json.images.filter((u: any) => typeof u === 'string')
        : undefined;
      return { text: json.text, images };
    }
    // Look for order creation intent marker - handle multiline JSON
    let orderMatch = aiText.match(/\[INTENT:CREATE_ORDER\]\s*(\{[\s\S]*?\})/);

    // If first regex doesn't work, try a more flexible approach
    if (!orderMatch) {
      const intentIndex = aiText.indexOf('[INTENT:CREATE_ORDER]');
      if (intentIndex !== -1) {
        const afterIntent = aiText.substring(intentIndex);
        const jsonStart = afterIntent.indexOf('{');
        if (jsonStart !== -1) {
          const jsonPart = afterIntent.substring(jsonStart);
          // Find the matching closing brace
          let braceCount = 0;
          let jsonEnd = -1;
          for (let i = 0; i < jsonPart.length; i++) {
            if (jsonPart[i] === '{') braceCount++;
            if (jsonPart[i] === '}') braceCount--;
            if (braceCount === 0) {
              jsonEnd = i;
              break;
            }
          }
          if (jsonEnd !== -1) {
            const jsonString = jsonPart.substring(0, jsonEnd + 1);
            orderMatch = ['', jsonString]; // Mock the match array
          }
        }
      }
    }

    // If still no match, try to find and complete incomplete JSON
    if (!orderMatch) {
      const intentIndex = aiText.indexOf('[INTENT:CREATE_ORDER]');
      if (intentIndex !== -1) {
        const afterIntent = aiText.substring(intentIndex);
        const jsonStart = afterIntent.indexOf('{');
        if (jsonStart !== -1) {
          const jsonPart = afterIntent.substring(jsonStart);
          // Try to complete the JSON by adding missing closing brackets/braces
          let completedJson = jsonPart;

          // Count braces and brackets to see what's missing
          let braceCount = 0;
          let bracketCount = 0;
          for (let i = 0; i < jsonPart.length; i++) {
            if (jsonPart[i] === '{') braceCount++;
            if (jsonPart[i] === '}') braceCount--;
            if (jsonPart[i] === '[') bracketCount++;
            if (jsonPart[i] === ']') bracketCount--;
          }

          // Add missing closing brackets first, then braces
          while (bracketCount > 0) {
            completedJson += ']';
            bracketCount--;
          }
          while (braceCount > 0) {
            completedJson += '}';
            braceCount--;
          }

          this.logger.log(
            `Attempting to complete incomplete JSON. Original: "${jsonPart}"`,
          );
          this.logger.log(`Completed JSON: "${completedJson}"`);

          orderMatch = ['', completedJson];
        }
      }
    }

    if (orderMatch) {
      try {
        this.logger.log(
          `Found CREATE_ORDER intent, JSON string: "${orderMatch[1]}"`,
        );
        const orderData = JSON.parse(orderMatch[1]);
        this.logger.log(
          `Successfully parsed order data: ${JSON.stringify(orderData)}`,
        );

        // Extract only the text BEFORE the intent marker
        const responseText = aiText.split(/\[INTENT:CREATE_ORDER\]/)[0].trim();

        // Remove any order confirmation messages that might be in the response
        const cleanedText = responseText
          .replace(/Buyurtma muvaffaqiyatli tasdiqlandi.*$/s, '')
          .replace(/Order confirmed successfully.*$/s, '')
          .replace(/Заказ успешно подтверждён.*$/s, '')
          .replace(/📋 Buyurtma raqami.*$/s, '')
          .replace(/📋 Order #.*$/s, '')
          .replace(/📋 Номер заказа.*$/s, '')
          .replace(/🛍️ Mahsulotlar.*$/s, '')
          .replace(/🛍️ Items.*$/s, '')
          .replace(/🛍️ Товары.*$/s, '')
          .replace(/💰 Jami.*$/s, '')
          .replace(/💰 Total.*$/s, '')
          .replace(/💰 Итого.*$/s, '')
          .replace(/📞 Aloqa.*$/s, '')
          .replace(/📞 Contact.*$/s, '')
          .replace(/📞 Контакт.*$/s, '')
          .replace(/📝 Izoh.*$/s, '')
          .replace(/📝 Notes.*$/s, '')
          .replace(/📝 Примечание.*$/s, '')
          .replace(/Tez orada siz bilan bog'lanamiz.*$/s, '')
          .replace(/We'll contact you soon.*$/s, '')
          .replace(/Мы свяжемся с вами.*$/s, '')
          .replace(/Yana nimadir kerakmi\?.*$/s, '')
          .replace(/Is there anything else.*$/s, '')
          .replace(/Хотите что-нибудь ещё\?.*$/s, '')
          .replace(/Ha, albatta!.*$/s, '')
          .replace(/Hammasi joyida!.*$/s, '')
          .replace(/rasmiylashtirildi.*$/s, '')
          .trim();

        this.logger.log(`Cleaned response text: "${cleanedText}"`);
        this.logger.log(`Order data: ${JSON.stringify(orderData)}`);

        return {
          text:
            cleanedText ||
            "Great! I've got your order down. What's your name and phone number so we can get in touch with you?",
          intent: 'CREATE_ORDER',
          orderData,
        };
      } catch (error) {
        this.logger.warn(
          `Failed to parse order data from AI response: ${error.message}`,
        );
        this.logger.warn(`Raw JSON string: "${orderMatch[1]}"`);

        // Even if parsing fails, we should still try to create an order with default data
        // Extract basic info from the incomplete JSON
        const jsonString = orderMatch[1];
        this.logger.warn(
          `Attempting to extract data from incomplete JSON: "${jsonString}"`,
        );

        const customerContactMatch = jsonString.match(
          /"customerContact":\s*"([^"]+)"/,
        );

        // Extract ALL product IDs, quantities, and prices from the JSON
        const productIdMatches = jsonString.match(/"productId":\s*(\d+)/g);
        const quantityMatches = jsonString.match(/"quantity":\s*(\d+)/g);
        const priceMatches = jsonString.match(/"price":\s*(\d+)/g);

        // Also try to extract from the full AI response text (in case JSON was cut off)
        const fullTextProductIds = aiText.match(/"productId":\s*(\d+)/g);
        const fullTextQuantities = aiText.match(/"quantity":\s*(\d+)/g);
        const fullTextPrices = aiText.match(/"price":\s*(\d+)/g);

        // Use the longer match if available
        const finalProductIds =
          fullTextProductIds &&
            fullTextProductIds.length > (productIdMatches?.length || 0)
            ? fullTextProductIds
            : productIdMatches;
        const finalQuantities =
          fullTextQuantities &&
            fullTextQuantities.length > (quantityMatches?.length || 0)
            ? fullTextQuantities
            : quantityMatches;
        const finalPrices =
          fullTextPrices && fullTextPrices.length > (priceMatches?.length || 0)
            ? fullTextPrices
            : priceMatches;

        this.logger.warn(
          `Extracted product IDs from JSON: ${productIdMatches?.join(', ') || 'none'}`,
        );
        this.logger.warn(
          `Extracted product IDs from full text: ${fullTextProductIds?.join(', ') || 'none'}`,
        );
        this.logger.warn(
          `Final product IDs to use: ${finalProductIds?.join(', ') || 'none'}`,
        );
        this.logger.warn(
          `Final quantities: ${finalQuantities?.join(', ') || 'none'}`,
        );
        this.logger.warn(`Final prices: ${finalPrices?.join(', ') || 'none'}`);

        // Create items array from extracted data
        const items: { productId: number; quantity: number; price: number }[] =
          [];
        if (finalProductIds && finalProductIds.length > 0) {
          for (let i = 0; i < finalProductIds.length; i++) {
            const productIdMatch = finalProductIds[i].match(/(\d+)/);
            const productId = productIdMatch ? parseInt(productIdMatch[1]) : 1;

            const quantityMatch =
              finalQuantities && finalQuantities[i]
                ? finalQuantities[i].match(/(\d+)/)
                : null;
            const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

            const priceMatch =
              finalPrices && finalPrices[i]
                ? finalPrices[i].match(/(\d+)/)
                : null;
            const price = priceMatch ? parseInt(priceMatch[1]) : 100; // Default price

            items.push({
              productId,
              quantity,
              price,
            });
          }
        } else {
          // Fallback to single item if no products found
          items.push({
            productId: 1,
            quantity: 1,
            price: 100,
          });
        }

        const orderData = {
          customerName: 'Not provided',
          customerContact: customerContactMatch
            ? customerContactMatch[1]
            : 'Not provided',
          items,
          notes: '',
        };

        this.logger.log(
          `Creating order with fallback data: ${JSON.stringify(orderData)}`,
        );

        // Extract only the text BEFORE the intent marker
        const responseText = aiText.split(/\[INTENT:CREATE_ORDER\]/)[0].trim();

        return {
          text: responseText || "Great! I'll process your order.",
          intent: 'CREATE_ORDER',
          orderData,
        };
      }
    }

    // Look for fetch orders intent marker
    const fetchOrdersMatch = aiText.match(/\[INTENT:FETCH_ORDERS\]/);
    if (fetchOrdersMatch) {
      const responseText = aiText.replace(/\[INTENT:FETCH_ORDERS\]/, '').trim();

      return {
        text: responseText || 'Let me check your orders for you.',
        intent: 'FETCH_ORDERS',
        shouldFetchOrders: true,
      };
    }

    // Look for cancel order intent marker
    const cancelOrderMatch = aiText.match(
      /\[INTENT:CANCEL_ORDER\]\s*(\{[\s\S]*?\})/,
    );
    if (cancelOrderMatch) {
      try {
        const orderData = JSON.parse(cancelOrderMatch[1]);
        const responseText = aiText
          .replace(/\[INTENT:CANCEL_ORDER\][\s\S]*/, '')
          .trim();

        return {
          text:
            responseText ||
            'I can help you cancel an order. Which order would you like to cancel?',
          intent: 'CANCEL_ORDER',
          orderData,
        };
      } catch (error) {
        this.logger.warn('Failed to parse cancel order data from AI response');
      }
    }

    // Look for ask for info intent marker
    const askForInfoMatch = aiText.match(
      /\[INTENT:ASK_FOR_INFO\]\s*(\{[\s\S]*?\})/,
    );
    if (askForInfoMatch) {
      try {
        const infoData = JSON.parse(askForInfoMatch[1]);
        const responseText = aiText
          .replace(/\[INTENT:ASK_FOR_INFO\][\s\S]*/, '')
          .trim();

        this.logger.log(
          `ASK_FOR_INFO intent detected: ${JSON.stringify(infoData)}`,
        );

        return {
          text:
            responseText ||
            infoData.message ||
            'I need some additional information to process your order.',
          intent: 'ASK_FOR_INFO',
          missingInfo: infoData.missingInfo || [],
        };
      } catch (error) {
        this.logger.warn(`Failed to parse ask for info data: ${error.message}`);
        return {
          text: aiText.replace(/\[INTENT:ASK_FOR_INFO\][\s\S]*/, '').trim(),
          intent: 'ASK_FOR_INFO',
          missingInfo: ['contact', 'location', 'payment'],
        };
      }
    }

    // Look for order confirmation intent marker (AI is incorrectly using this)
    const orderConfirmationMatch = aiText.match(
      /\[INTENT:ORDER_CONFIRMATION\]\s*(\{[\s\S]*?\})/,
    );
    if (orderConfirmationMatch) {
      try {
        const confirmationData = JSON.parse(orderConfirmationMatch[1]);

        // Convert ORDER_CONFIRMATION to CREATE_ORDER format
        // Extract product info from items and look up actual product IDs and prices
        let items: { productId: number; quantity: number; price: number }[] =
          [];
        if (Array.isArray(confirmationData.items)) {
          // Process each item string to extract product name and quantity
          const itemPromises = confirmationData.items.map(
            async (item: string) => {
              // Try to extract product info from item string like "ProductName (1 dona)"
              const match = item.match(/^(.+?)\s*\((\d+)\s*dona?\)$/);
              const productName = match ? match[1].trim() : item.trim();
              const quantity = match ? parseInt(match[2]) || 1 : 1;

              // Look up product by name (without organizationId for broader search)
              const product = await this.findProductByName(productName);

              if (product) {
                return {
                  productId: product.id,
                  quantity,
                  price: product.price,
                };
              }

              // Fallback if product not found
              this.logger.warn(
                `Product not found for item: "${productName}", using defaults`,
              );
              return {
                productId: 1,
                quantity,
                price: 0, // Default price when product not found
              };
            },
          );

          items = await Promise.all(itemPromises);
        } else {
          // Default fallback item
          items = [
            {
              productId: 1,
              quantity: 1,
              price: 0,
            },
          ];
        }

        const orderData = {
          customerName: 'Not provided',
          customerContact: confirmationData.phoneNumber || 'Not provided',
          items,
          notes: confirmationData.notes || '',
        };

        // Extract only the text BEFORE the intent marker
        const responseText = aiText
          .split(/\[INTENT:ORDER_CONFIRMATION\]/)[0]
          .trim();

        this.logger.log(
          `Converted ORDER_CONFIRMATION to CREATE_ORDER: ${JSON.stringify(orderData)}`,
        );

        return {
          text: responseText || "Great! I'll process your order.",
          intent: 'CREATE_ORDER',
          orderData,
        };
      } catch (error) {
        this.logger.warn(
          'Failed to parse order confirmation data from AI response',
        );
      }
    }

    // Look for search product intent marker
    const searchProductMatch = aiText.match(
      /\[INTENT:SEARCH_PRODUCT\]\s*(\{[\s\S]*?\})/,
    );
    if (searchProductMatch) {
      try {
        const searchData = JSON.parse(searchProductMatch[1]);
        const responseText = aiText
          .replace(/\[INTENT:SEARCH_PRODUCT\][\s\S]*/, '')
          .trim();

        this.logger.log(
          `SEARCH_PRODUCT intent detected: ${JSON.stringify(searchData)}`,
        );

        return {
          text: responseText || 'Let me search for that product.',
          intent: 'SEARCH_PRODUCT',
          searchQuery: searchData.searchQuery,
        };
      } catch (error) {
        this.logger.warn(
          'Failed to parse search product data from AI response',
        );
      }
    }

    // Look for escalate-to-support intent marker
    const escalateMatch = aiText.match(
      /\[INTENT:ESCALATE_TO_SUPPORT\]\s*(\{[\s\S]*?\})/,
    );
    if (escalateMatch) {
      try {
        const escalationData = JSON.parse(escalateMatch[1]);
        const responseText = aiText
          .replace(/\[INTENT:ESCALATE_TO_SUPPORT\][\s\S]*/, '')
          .trim();

        this.logger.log(
          `ESCALATE_TO_SUPPORT intent detected: ${JSON.stringify(escalationData)}`,
        );

        return {
          text: responseText,
          intent: 'ESCALATE_TO_SUPPORT',
          escalationData,
        };
      } catch (error) {
        this.logger.warn(
          'Failed to parse escalate-to-support data from AI response',
        );
      }
    }

    return {
      text: aiText,
    };
  }

  private isTransientGeminiError(error: any): boolean {
    if (!error) {
      return false;
    }

    const status = (error as any)?.status ?? (error as any)?.code;
    const message = (error as any)?.message ?? String(error);

    if (status === 429 || status === 503) {
      return true;
    }

    return /429|503|rate limit|temporarily unavailable|overloaded/i.test(
      message,
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate order confirmation message with automatic language detection
   */
  async generateOrderConfirmation(
    orderData: {
      orderId: number;
      items: string[];
      phoneNumber?: string;
      notes?: string;
      totalPrice?: number;
      currency?: string;
    },
    customerMessage: string,
    ctx?: AiCallContext,
  ): Promise<string> {
    try {
      const prompt = `You are the Aletis AI assistant. Generate an order confirmation message in the SAME language as the customer's message.

CUSTOMER'S MESSAGE: "${customerMessage}"

ORDER DATA:
- Order ID: ${orderData.orderId}
- Items: ${orderData.items.join(', ')}
- Phone: ${orderData.phoneNumber || 'Not provided'}
- Notes: ${orderData.notes || 'None'}
- Total Price: ${orderData.totalPrice || 'Not calculated'}
- Currency: ${orderData.currency || 'USD'}

INSTRUCTIONS:
1. Detect the language of the customer's message automatically
2. Generate a confirmation message in that EXACT same language
3. Use the format and examples provided below
4. Make it sound natural and friendly for that language

FORMAT TEMPLATE:
✅ [Order confirmed message in detected language]

📋 [Order number label]: #${orderData.orderId}
🛍️ [Items label]: ${orderData.items.join(', ')}
💰 [Total label]: ${orderData.totalPrice || 'Not calculated'} ${orderData.currency || 'USD'}
📞 [Contact label]: ${orderData.phoneNumber || 'Not provided'}
📝 [Notes label]: ${orderData.notes || 'None'}

[Follow-up message in detected language]
[Closing question in detected language]

LANGUAGE EXAMPLES:

Uzbek:
Buyurtma muvaffaqiyatli tasdiqlandi ✅
📋 Buyurtma raqami: #${orderData.orderId}
🛍️ Mahsulotlar: ${orderData.items.join(', ')}
💰 Jami: ${orderData.totalPrice || 'Hisoblanmagan'} ${orderData.currency || 'USD'}
📞 Aloqa: ${orderData.phoneNumber || 'Kiritilmagan'}
📝 Izoh: ${orderData.notes || "Yo'q"}
Tez orada siz bilan bog'lanamiz 😊
Yana nimadir kerakmi?

Russian:
Заказ успешно подтверждён ✅
📋 Номер заказа: #${orderData.orderId}
🛍️ Товары: ${orderData.items.join(', ')}
💰 Итого: ${orderData.totalPrice || 'Не рассчитано'} ${orderData.currency || 'USD'}
📞 Контакт: ${orderData.phoneNumber || 'Не указан'}
📝 Примечание: ${orderData.notes || 'Нет'}
Мы свяжемся с вами в ближайшее время!
Хотите что-нибудь ещё?

English:
Order confirmed successfully ✅
📋 Order #${orderData.orderId}
🛍️ Items: ${orderData.items.join(', ')}
💰 Total: ${orderData.totalPrice || 'Not calculated'} ${orderData.currency || 'USD'}
📞 Contact: ${orderData.phoneNumber || 'Not provided'}
📝 Notes: ${orderData.notes || 'None'}
We'll contact you soon with more details.
Is there anything else I can help you with?

Generate the confirmation message now:`;

      const confirmationMessage = await this.callWithRotation(
        this.defaultModel,
        prompt,
        'ORDER_CONFIRMATION',
        ctx,
      );

      this.logger.log(
        `Order confirmation generated for order ${orderData.orderId}`,
      );
      return confirmationMessage.trim();
    } catch (error) {
      this.logger.error(
        `Error generating order confirmation: ${error.message}`,
        error.stack,
      );

      // Fallback confirmation message in English
      return `Order confirmed successfully ✅

📋 Order #${orderData.orderId}
🛍️ Items: ${orderData.items.join(', ')}
📞 Contact: ${orderData.phoneNumber || 'Not provided'}
📝 Notes: ${orderData.notes || 'None'}

We'll contact you soon with more details.
Is there anything else I can help you with?`;
    }
  }

  /**
   * Detect the language of a given text
   */
  async detectLanguage(text: string, ctx?: AiCallContext): Promise<string> {
    try {
      // If text is empty or too short, default to Uzbek
      if (!text || text.trim().length < 2) {
        return 'uz';
      }

      const prompt = `Detect the language of the following text and return only the language code (uz, ru, en).

Text: "${text}"

Rules:
- If the text contains Cyrillic characters (а, б, в, г, д, е, ё, ж, з, и, й, к, л, м, н, о, п, р, с, т, у, ф, х, ц, ч, ш, щ, ъ, ы, ь, э, ю, я) → return "ru"
- If the text contains Latin characters with Uzbek-specific letters (oʻ, gʻ, sh, ch) or common Uzbek words → return "uz"
- If the text contains only basic Latin characters and English words → return "en"
- If unsure, return "uz" (default)

Return only the language code:`;

      const languageCode = (
        await this.callWithRotation(
          this.defaultModel,
          prompt,
          'LANGUAGE_DETECTION',
          ctx,
        )
      )
        .trim()
        .toLowerCase();

      // Validate and return supported language codes
      if (['uz', 'ru', 'en'].includes(languageCode)) {
        this.logger.log(
          `Language detected: ${languageCode} for text: "${text.substring(0, 50)}..."`,
        );
        return languageCode;
      }

      // Fallback: simple character-based detection
      const hasCyrillic = /[а-яё]/i.test(text);
      const hasUzbekSpecific =
        /[oʻgʻshch]/i.test(text) ||
        /(men|sen|biz|siz|ular|bu|shu|o'sha|qayerda|qachon|nima|kim|qanday)/i.test(
          text,
        );

      if (hasCyrillic) {
        this.logger.log(
          `Fallback detection: Russian (Cyrillic) for text: "${text.substring(0, 50)}..."`,
        );
        return 'ru';
      } else if (hasUzbekSpecific) {
        this.logger.log(
          `Fallback detection: Uzbek (specific patterns) for text: "${text.substring(0, 50)}..."`,
        );
        return 'uz';
      }

      // Default to Uzbek if detection fails
      this.logger.log(
        `Fallback detection: Uzbek (default) for text: "${text.substring(0, 50)}..."`,
      );
      return 'uz';
    } catch (error) {
      this.logger.warn(`Language detection failed: ${error.message}`);
      return 'uz'; // Default to Uzbek
    }
  }

  /**
   * Translate a message to the specified language
   */
  async translateMessage(
    message: string,
    targetLanguage: string,
    ctx?: AiCallContext,
  ): Promise<string> {
    try {
      // If target language is English, return as is
      if (targetLanguage === 'en') {
        return message;
      }

      const languageNames: Record<string, string> = {
        uz: 'Uzbek',
        ru: 'Russian',
        en: 'English',
      };

      const prompt = `Translate the following message to ${languageNames[targetLanguage] || 'Uzbek'}. Keep the HTML formatting and emojis intact:

${message}

Translated message:`;

      return (await this.callWithRotation(this.defaultModel, prompt, 'TRANSLATION', ctx)).trim();
    } catch (error) {
      this.logger.warn(`Translation failed: ${error.message}`);
      return message; // Return original message if translation fails
    }
  }

  /**
   * Generate orders list response in customer's language
   */
  async generateOrdersListResponse(
    orders: any[],
    userMessage: string,
    ctx?: AiCallContext,
  ): Promise<string> {
    try {
      const ordersData = orders.map((order, index) => {
        const status = this.getStatusEmoji(order.status);
        const items = order.items || 'No items specified';
        const createdAt = new Date(order.createdAt).toLocaleDateString();
        return {
          number: index + 1,
          id: order.id,
          status,
          date: createdAt,
          items,
          totalPrice: order.totalPrice || 0,
        };
      });

      const prompt = `You are Aletis, a friendly AI assistant. The customer asked: "${userMessage}"

CUSTOMER ORDERS DATA:
${JSON.stringify(ordersData, null, 2)}

INSTRUCTIONS:
1. Respond in the EXACT same language as the customer's message
2. If customer wrote in Uzbek → respond in Uzbek
3. If customer wrote in Russian → respond in Russian
4. If customer wrote in English → respond in English
5. If no orders exist, say "You don't have any orders yet" in their language
6. If orders exist, list them nicely with emojis
7. Keep the same tone (formal/casual) as the customer's message
8. Use appropriate emojis for orders, dates, items, prices
9. End with a helpful question about what they'd like to do next

Generate a natural, friendly response:`;

      return (await this.callWithRotation(this.defaultModel, prompt, 'ORDERS_LIST', ctx)).trim();
    } catch (error) {
      this.logger.warn(
        `Failed to generate orders list response: ${error.message}`,
      );

      // Fallback to simple response
      if (orders.length === 0) {
        return "You don't have any orders yet. Would you like to place your first order?";
      }

      let message = 'Your Recent Orders:\n\n';
      orders.forEach((order, index) => {
        const status = this.getStatusEmoji(order.status);
        const items = order.items || 'No items specified';
        const createdAt = new Date(order.createdAt).toLocaleDateString();
        message += `${index + 1}. ${status} Order #${order.id}\n`;
        message += `   📅 ${createdAt}\n`;
        message += `   🛍️ ${items}\n`;
        message += `   💰 $${order.totalPrice || 0}\n\n`;
      });
      message +=
        'Would you like to know more about any specific order or place a new one?';
      return message;
    }
  }

  /**
   * Generate order cancellation response in customer's language
   */
  async generateOrderCancellationResponse(
    order: any,
    userMessage: string,
    ctx?: AiCallContext,
  ): Promise<string> {
    try {
      const prompt = `You are Aletis, a friendly AI assistant. The customer asked: "${userMessage}"

ORDER CANCELLED:
- Order ID: ${order.id}
- Status: ${order.status}
- Total: $${order.totalPrice || 0}

INSTRUCTIONS:
1. Respond in the EXACT same language as the customer's message
2. If customer wrote in Uzbek → respond in Uzbek
3. If customer wrote in Russian → respond in Russian
4. If customer wrote in English → respond in English
5. Confirm the order has been cancelled
6. Be friendly and helpful
7. Use appropriate emojis
8. Ask if they need help with anything else

Generate a natural, friendly response:`;

      return (await this.callWithRotation(this.defaultModel, prompt, 'ORDER_CANCELLATION', ctx)).trim();
    } catch (error) {
      this.logger.warn(
        `Failed to generate cancellation response: ${error.message}`,
      );

      // Fallback response
      return `❌ Order Cancelled

📋 Order #${order.id} has been successfully cancelled.

If you change your mind, you can always place a new order! Is there anything else I can help you with?`;
    }
  }

  /**
   * Get status emoji for order status
   */
  private getStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      NEW: '🆕',
      PENDING: '⏳',
      CONFIRMED: '✅',
      SHIPPED: '🚚',
      DELIVERED: '📦',
      CANCELLED: '❌',
      REFUNDED: '💰',
    };
    return statusEmojis[status] || '📋';
  }

  /**
   * Find a product by name (and optionally by organization ID)
   * @param productName - The name of the product to find
   * @param organizationId - Optional organization ID to scope the search
   * @returns Product with id, price, and currency, or null if not found
   */
  private async findProductByName(
    productName: string,
    organizationId?: number,
  ): Promise<{ id: number; price: number; currency: string } | null> {
    try {
      if (!productName || !productName.trim()) {
        return null;
      }

      const searchName = productName.trim();
      const where: any = {
        name: {
          contains: searchName,
          mode: 'insensitive',
        },
        isDeleted: false,
      };

      // If organizationId is provided, scope the search to that organization
      if (organizationId) {
        where.organizationId = organizationId;
      }

      const product = await this.prisma.product.findFirst({
        where,
        select: {
          id: true,
          price: true,
          currency: true,
        },
        orderBy: {
          createdAt: 'desc', // Get the most recent product if multiple matches
        },
      });

      if (product) {
        this.logger.log(
          `Found product "${searchName}": ID=${product.id}, Price=${product.price} ${product.currency}`,
        );
        return {
          id: product.id,
          price: product.price,
          currency: product.currency || 'USD',
        };
      }

      this.logger.warn(
        `Product not found: "${searchName}"${organizationId ? ` (orgId: ${organizationId})` : ''}`,
      );
      return null;
    } catch (error) {
      this.logger.warn(
        `Error looking up product "${productName}": ${error.message}`,
      );
      return null;
    }
  }

  async analyzeCustomerInsights(customerData: string, ctx?: AiCallContext): Promise<string> {
    const prompt = `You are a sales intelligence AI. Analyze the customer's conversation history and order data below and extract ONLY sales-relevant information.

CUSTOMER DATA:
${customerData}

LANGUAGE RULE: Write all free-text values (aiSummary, buyingBehavior.notes,
salesOpportunities[].description, frequentQuestions[], favoriteCategories[])
in Uzbek (o'zbek tilida) ONLY, regardless of what language the customer data
above is in. Keep all JSON field/key names and enum values (priceSensitivity,
aiTags, confidence, orderFrequency, type) exactly as specified below in
English — only the human-readable text content should be Uzbek.

STRICT PRIVACY RULES:
- Extract ONLY information relevant to sales and customer service
- Do NOT record health information, political or religious beliefs, personal relationships, or any data unrelated to shopping behavior
- Focus exclusively on purchasing patterns, product interests, and shopping preferences

Return a JSON object (no markdown, no code block) with EXACTLY these fields:
{
  "purchaseHistory": [{"productName": string, "price": number, "currency": string, "quantity": number, "date": string}],
  "productInterests": [{"name": string, "category": string, "confidence": "HIGH"|"MEDIUM"|"LOW"}],
  "favoriteCategories": [string],
  "frequentQuestions": [string],
  "priceSensitivity": "LOW"|"MEDIUM"|"HIGH",
  "buyingBehavior": {"avgOrderValue": number, "orderFrequency": string, "preferredLanguage": string, "notes": string},
  "aiSummary": "2-3 sentence sales-focused customer summary",
  "salesOpportunities": [{"type": string, "description": string, "suggestedProducts": [string]}],
  "aiTags": ["VIP"|"High Intent"|"Frequent Buyer"|"Price Sensitive"|"New Customer"|"At Risk"|"Loyal Customer"]
}

Rules for aiTags:
- "VIP": total order value > 500 USD equivalent or > 5 orders
- "High Intent": actively asking about products or recently browsed many items
- "Frequent Buyer": placed 3+ orders
- "Price Sensitive": frequently asks about discounts or compares prices
- "New Customer": 0-1 orders
- "At Risk": was active but no recent orders in 30+ days
- "Loyal Customer": consistent purchases over time

priceSensitivity rules:
- "HIGH": frequently asks for discounts, mentions budget constraints
- "LOW": orders without asking about prices, buys premium products
- "MEDIUM": default

Return only valid JSON, no other text.`;

    return this.callWithRotation(
      this.defaultModel,
      prompt,
      'CUSTOMER_INSIGHTS',
      ctx,
    );
  }

  /**
   * Generate a personalized win-back / re-engagement message for a dormant
   * customer. Returns a single ready-to-send message in the customer's
   * language. The whole point of the retention engine: turn a one-time buyer
   * back into an active customer.
   */
  async generateWinBackMessage(input: {
    customerName?: string | null;
    lang?: string | null;
    businessName?: string | null;
    dormantDays?: number | null;
    purchaseHistory?: any;
    favoriteCategories?: any;
    salesOpportunities?: any;
    aiSummary?: string | null;
    incentive?: string | null;
    suggestedProducts?: { name: string; price: number; currency: string }[];
    stage?: 'reminder' | 'value' | 'incentive' | 'last_chance';
  }, ctx?: AiCallContext): Promise<{ text: string; incentive?: string }> {
    const lang = ['uz', 'ru', 'en'].includes(input.lang || '')
      ? (input.lang as string)
      : 'uz';

    const langName = { uz: 'Uzbek', ru: 'Russian', en: 'English' }[lang];
    const products = (input.suggestedProducts || [])
      .map((p) => `- ${p.name} (${p.price} ${p.currency})`)
      .join('\n');

    // Escalating sequence: each stage has a distinct angle so repeated touches
    // feel like a thoughtful sequence, not the same message resent.
    const stage = input.stage ?? 'reminder';
    const offerIncentive = stage === 'incentive' || stage === 'last_chance';
    const stageGuidance = {
      reminder:
        "STAGE 1 — GENTLE REMINDER: Simply let them know they're missed. No offer, no pressure. Warm and personal.",
      value:
        'STAGE 2 — VALUE: Remind them why the shop is worth coming back to (quality, new arrivals, things in their favorite categories). Still no discount.',
      incentive:
        'STAGE 3 — INCENTIVE: Make a concrete offer using the incentive provided to nudge them over the line.',
      last_chance:
        'STAGE 4 — LAST CHANCE: Kind but time-sensitive final nudge. Light urgency (limited time), include the incentive if provided. Do not be aggressive.',
    }[stage];

    const prompt = `You are the AI sales & retention agent for "${input.businessName || 'our shop'}" in Uzbekistan.
Your job: write ONE short, warm win-back message that brings a dormant customer back to buy again.
This is part of a multi-step re-engagement sequence — write specifically for the current stage.

${stageGuidance}

CUSTOMER CONTEXT:
- Name: ${input.customerName || 'valued customer'}
- Days since last activity: ${input.dormantDays ?? 'unknown'}
- Summary: ${input.aiSummary || 'n/a'}
- Past purchases: ${JSON.stringify(input.purchaseHistory ?? []).slice(0, 600)}
- Favorite categories: ${JSON.stringify(input.favoriteCategories ?? []).slice(0, 300)}
- Sales opportunities: ${JSON.stringify(input.salesOpportunities ?? []).slice(0, 400)}
${products ? `SUGGESTED PRODUCTS TO MENTION:\n${products}` : ''}
${offerIncentive && input.incentive ? `INCENTIVE TO OFFER: ${input.incentive}` : ''}

RULES:
- Write in ${langName} ONLY.
- Tone: friendly, personal, not pushy. Like a shop owner who genuinely remembers them.
- Reference what they bought/liked before to feel personal (do NOT invent purchases not listed).
- Keep it SHORT (2-4 sentences). 1-2 tasteful emojis max.
- End with a light call to action (a question or invitation to come back).
- ${offerIncentive && input.incentive ? 'Naturally include the incentive above.' : 'Do NOT invent discounts or prices that are not provided.'}
- Output ONLY the message text. No quotes, no labels, no markdown.

Message:`;

    try {
      const text = (
        await this.callWithRotation(
          this.defaultModel,
          prompt,
          'WIN_BACK',
          ctx,
        )
      ).trim();
      return { text, incentive: input.incentive ?? undefined };
    } catch (error: any) {
      this.logger.error(`Win-back generation failed: ${error.message}`);
      // Language-aware fallback so the engine never silently no-ops
      const fallback: Record<string, string> = {
        uz: `Salom${input.customerName ? ', ' + input.customerName : ''}! 👋 Sizni sog'inib qoldik. Yangi mahsulotlarimizni ko'rib chiqishni xohlaysizmi?`,
        ru: `Здравствуйте${input.customerName ? ', ' + input.customerName : ''}! 👋 Мы по вам соскучились. Хотите взглянуть на наши новинки?`,
        en: `Hi${input.customerName ? ' ' + input.customerName : ''}! 👋 We've missed you. Want to see what's new in our shop?`,
      };
      return { text: fallback[lang], incentive: input.incentive ?? undefined };
    }
  }

  /**
   * Write a short segmented broadcast message (campaign) in the customer's
   * language. Segment sets the angle (welcome new buyers, thank VIPs, re-engage
   * at-risk, etc.). Falls back to a safe generic line on failure.
   */
  async generateBroadcastMessage(input: {
    campaignName: string;
    segment: string;
    businessName?: string | null;
    customerName?: string | null;
    lang?: string | null;
    incentive?: string | null;
  }, ctx?: AiCallContext): Promise<string> {
    const lang = ['uz', 'ru', 'en'].includes(input.lang || '')
      ? (input.lang as string)
      : 'uz';
    const langName = { uz: 'Uzbek', ru: 'Russian', en: 'English' }[lang];

    const segmentAngle: Record<string, string> = {
      ALL_BUYERS: 'a friendly general update to past customers',
      NEW: 'a warm welcome to a recently joined customer, invite them to explore',
      VIP: 'a heartfelt thank-you to a loyal, high-value customer',
      AT_RISK: 'a gentle re-engagement for a customer who is drifting away',
      DORMANT: 'a warm win-back for a customer who has not bought in a while',
    };

    const prompt = `You are the AI sales & retention agent for "${input.businessName || 'our shop'}" in Uzbekistan.
Write ONE short broadcast message for this campaign: "${input.campaignName}".
Audience angle: ${segmentAngle[input.segment] || 'a friendly message to customers'}.

CUSTOMER:
- Name: ${input.customerName || 'valued customer'}
${input.incentive ? `INCENTIVE TO OFFER: ${input.incentive}` : ''}

RULES:
- Write in ${langName} ONLY.
- Warm, personal, not spammy. 2-3 sentences. 1-2 tasteful emojis max.
- ${input.incentive ? 'Naturally include the incentive above.' : 'Do NOT invent discounts or prices.'}
- End with a light call to action.
- Output ONLY the message text. No quotes, labels, or markdown.

Message:`;

    try {
      return (
        await this.callWithRotation(
          this.defaultModel,
          prompt,
          'CAMPAIGN_BROADCAST',
          ctx,
        )
      ).trim();
    } catch (error: any) {
      this.logger.error(`Broadcast generation failed: ${error.message}`);
      const fallback: Record<string, string> = {
        uz: `Salom${input.customerName ? ', ' + input.customerName : ''}! 👋 Yangiliklarimizni ko'rib chiqing.`,
        ru: `Здравствуйте${input.customerName ? ', ' + input.customerName : ''}! 👋 Загляните к нам за новинками.`,
        en: `Hi${input.customerName ? ' ' + input.customerName : ''}! 👋 Come check out what's new with us.`,
      };
      return fallback[lang];
    }
  }

  /**
   * Transcribe a customer voice message to text using Gemini's audio support.
   * Returns '' on failure or when nothing intelligible is found, so the caller
   * can fall back gracefully. `mimeType` is e.g. 'audio/ogg' for Telegram voice.
   */
  async transcribeAudio(base64: string, mimeType: string, ctx?: AiCallContext): Promise<string> {
    const prompt =
      'Transcribe this voice message to plain text. It may be in Uzbek, Russian or English. ' +
      'Output ONLY the transcription with no quotes, labels or commentary. ' +
      'If there is no intelligible speech, output nothing.';
    try {
      const text = await this.callWithRotation(this.defaultModel, [
        { text: prompt },
        { inlineData: { mimeType, data: base64 } },
      ], 'AUDIO_TRANSCRIPTION', ctx);
      return text.trim();
    } catch (error: any) {
      this.logger.error(`Audio transcription failed: ${error.message}`);
      return '';
    }
  }

  // ─── Replenishment / consumption prediction ───────────────────────────────

  /**
   * Classify whether a product is a consumable (gets used up and repurchased)
   * and, if so, estimate how many days a single unit typically lasts one buyer.
   * Result is cached onto the Product so this runs at most once per product.
   */
  async classifyConsumable(input: {
    name: string;
    category?: string | null;
    description?: string | null;
  }, ctx?: AiCallContext): Promise<{
    consumable: boolean;
    estimatedLifespanDays: number | null;
    unit: string | null;
  }> {
    const prompt = `Classify a retail product for a replenishment-reminder system.

PRODUCT:
- Name: ${input.name}
- Category: ${input.category || 'unknown'}
- Description: ${(input.description || '').slice(0, 300)}

A "consumable" is a product that gets used up and bought again on a rough cycle
(shampoo, vitamins, coffee, diapers, pet food, cosmetics, supplements, detergent).
A durable good is NOT consumable (electronics, GPU, phone, furniture, clothing, tools).

Return a JSON object (no markdown, no code block):
{
  "consumable": <true|false>,
  "estimatedLifespanDays": <integer days one unit lasts a typical single household, or null if not consumable>,
  "unit": "<the consumption unit, e.g. 'bottle','pack','tablet', or null>"
}
JSON only:`;

    try {
      const raw = this.stripJson(
        await this.callWithRotation(
          this.defaultModel,
          prompt,
          'CONSUMABLE_CLASSIFICATION',
          ctx,
        ),
      );
      const parsed = JSON.parse(raw);
      const lifespan = Number(parsed.estimatedLifespanDays);
      return {
        consumable: parsed.consumable === true,
        estimatedLifespanDays:
          Number.isFinite(lifespan) && lifespan > 0
            ? Math.round(lifespan)
            : null,
        unit: typeof parsed.unit === 'string' ? parsed.unit : null,
      };
    } catch (error: any) {
      this.logger.error(`classifyConsumable failed: ${error.message}`);
      return { consumable: false, estimatedLifespanDays: null, unit: null };
    }
  }

  /**
   * Extract a usage rate ("kuniga 2 mahal", "twice a day") for a given product
   * from recent conversation text, plus the pack size if the customer mentioned
   * it. Used for first-purchase depletion prediction (the vitamin/prescription case).
   */
  async extractUsageRate(input: {
    productName: string;
    recentMessages: string;
  }, ctx?: AiCallContext): Promise<{ unitsPerDay: number | null; packSize: number | null }> {
    const prompt = `From the conversation below, find how often the customer uses "${input.productName}"
and the pack/bottle size if mentioned. The chat may be in Uzbek, Russian or English
(e.g. "kuniga 2 mahal" = 2 times a day, "60 tabletka" = pack of 60).

CONVERSATION:
${input.recentMessages.slice(0, 1500)}

Return a JSON object (no markdown):
{
  "unitsPerDay": <number of units consumed per day, or null if not stated>,
  "packSize": <number of units in one pack/bottle, or null if not stated>
}
Only report values actually implied by the text. JSON only:`;

    try {
      const raw = this.stripJson(
        await this.callWithRotation(
          this.defaultModel,
          prompt,
          'USAGE_RATE_EXTRACTION',
          ctx,
        ),
      );
      const parsed = JSON.parse(raw);
      const perDay = Number(parsed.unitsPerDay);
      const pack = Number(parsed.packSize);
      return {
        unitsPerDay: Number.isFinite(perDay) && perDay > 0 ? perDay : null,
        packSize: Number.isFinite(pack) && pack > 0 ? Math.round(pack) : null,
      };
    } catch (error: any) {
      this.logger.error(`extractUsageRate failed: ${error.message}`);
      return { unitsPerDay: null, packSize: null };
    }
  }

  /**
   * Compose a short, warm "your X is probably running low — reorder?" nudge in
   * the customer's language. Mirrors generateWinBackMessage.
   */
  async generateReplenishmentMessage(input: {
    customerName?: string | null;
    lang?: string | null;
    businessName?: string | null;
    productName: string;
    daysLeft: number;
    price?: number | null;
    currency?: string | null;
  }, ctx?: AiCallContext): Promise<{ text: string }> {
    const lang = ['uz', 'ru', 'en'].includes(input.lang || '')
      ? (input.lang as string)
      : 'uz';
    const langName = { uz: 'Uzbek', ru: 'Russian', en: 'English' }[lang];
    const runningOut = input.daysLeft <= 0;

    const prompt = `You are the AI sales & retention agent for "${input.businessName || 'our shop'}" in Uzbekistan.
Write ONE short, caring message reminding a customer their consumable is about to run out, and offer to reorder.

CONTEXT:
- Customer name: ${input.customerName || 'valued customer'}
- Product: ${input.productName}
- Estimated status: ${runningOut ? 'likely already run out' : `about ${input.daysLeft} day(s) left`}
${input.price ? `- Price to reorder: ${input.price} ${input.currency || ''}` : ''}

RULES:
- Write in ${langName} ONLY.
- Tone: friendly and helpful, like a shop owner who noticed and wants to help — not pushy.
- Mention the specific product by name and that it's probably running low.
- Keep it SHORT (2-3 sentences). 1-2 tasteful emojis max.
- End with an easy call to action to reorder (a question).
- Do NOT invent discounts or prices not provided.
- Output ONLY the message text. No quotes, no labels, no markdown.

Message:`;

    try {
      const text = (
        await this.callWithRotation(
          this.defaultModel,
          prompt,
          'REPLENISHMENT_REMINDER',
          ctx,
        )
      ).trim();
      return { text };
    } catch (error: any) {
      this.logger.error(`Replenishment generation failed: ${error.message}`);
      const fallback: Record<string, string> = {
        uz: `Salom${input.customerName ? ', ' + input.customerName : ''}! 👋 "${input.productName}" tugab qolgan bo'lsa kerak. Yangisiga buyurtma beramizmi?`,
        ru: `Здравствуйте${input.customerName ? ', ' + input.customerName : ''}! 👋 Похоже, "${input.productName}" уже заканчивается. Оформить новый заказ?`,
        en: `Hi${input.customerName ? ' ' + input.customerName : ''}! 👋 Your "${input.productName}" is probably running low. Want to reorder?`,
      };
      return { text: fallback[lang] };
    }
  }

  /** Strip an optional ```json fenced code block from a model response. */
  private stripJson(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  async matchProductsInContext(
    products: {
      id: number;
      name: string;
      price: number;
      currency: string;
      description: string;
      quantity?: number;
    }[],
    searchQuery: string,
    userMessage: string,
    ctx?: AiCallContext,
  ): Promise<{
    matches: { id: number; caption: string }[];
    noResultText: string;
  }> {
    try {
      const productList = products
        .map((p) => {
          const stock =
            p.quantity === undefined
              ? ''
              : p.quantity <= 0
                ? ' | OUT OF STOCK'
                : ` | ${p.quantity} in stock`;
          return `ID:${p.id} | ${p.name} | ${p.price} ${p.currency}${p.description ? ` | ${p.description.substring(0, 80)}` : ''}${stock}`;
        })
        .join('\n');

      const lang = userMessage;
      const prompt = `You are a strict shop assistant. Customer wants: "${searchQuery}"

OUR PRODUCTS:
${productList}

RELEVANCE RULES (follow strictly):
- Only include a product if it is a DIRECT, GENUINE match for what the customer is asking for.
- Do NOT include products that are merely in the same store or have a coincidental word overlap.
- Do NOT return a product just because it is the "closest" thing if it is still clearly unrelated.
- If NONE of the listed products match what the customer wants, return "matches": [] and explain politely in "noResultText".

Return a JSON object (no markdown, no code block) with:
- "matches": array of truly matching products. Each item: { "id": <integer product ID>, "caption": "<short attractive product card text>" }
  - caption must be in the SAME language as "${lang}"
  - write a highly engaging, personalized product caption. Always include the product name, price (and currency), and stock status.
  - If the product is IN STOCK (quantity > 0), add a catchy 1-2 sentence description. Do NOT add a call to action at the end of each product.
  - If the product is OUT OF STOCK (quantity <= 0), clearly state it's currently unavailable.
  - Use Telegram HTML formatting, NOT markdown: wrap the product name in <b>...</b> for bold. Do NOT use *asterisks* for bold — they render literally.
  - Use emojis in caption: 🛍️ for name, 💰 for price, 📦 for stock, ✨ for features
  - Keep caption under 250 characters total
- "noResultText": short message in the SAME language as "${lang}" if nothing matched. Empty string if something matched.

Only match products from the list above. Never suggest outside items.
JSON only:`;

      const rawResponse = await this.callWithRotation(
        this.defaultModel,
        prompt,
        'PRODUCT_MATCHING',
        ctx,
        { responseMimeType: 'application/json' }
      );
      const raw = this.stripJson(rawResponse);
      const parsed = JSON.parse(raw);
      return {
        matches: Array.isArray(parsed.matches) ? parsed.matches : [],
        noResultText: parsed.noResultText || '',
      };
    } catch (error: any) {
      this.logger.error(
        `Error matching products in context: ${error.message}`,
        error.stack,
      );
      return { matches: [], noResultText: '' };
    }
  }
}
