import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const agentTools: FunctionDeclaration[] = [
  {
    name: 'search_products',
    description: 'Search for products in the store by name, keyword, or category. Use this whenever the customer asks about product availability or wants to see options.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        searchQuery: {
          type: SchemaType.STRING,
          description: 'The search query or keyword (e.g., "black t-shirt", "iphone").',
        },
      },
      required: ['searchQuery'],
    },
  },
  {
    name: 'get_product',
    description: 'Get detailed information about a specific product by its ID.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: {
          type: SchemaType.NUMBER,
          description: 'The numeric ID of the product.',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'check_inventory',
    description: 'Check stock availability for a specific product or variant.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: {
          type: SchemaType.NUMBER,
          description: 'The numeric ID of the product.',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'create_order',
    description: 'Create an order for the customer. Ensure you have the delivery address, payment method, and contact info before calling this tool.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        customerName: {
          type: SchemaType.STRING,
          description: 'The name of the customer.',
        },
        customerContact: {
          type: SchemaType.STRING,
          description: 'The phone number or email of the customer.',
        },
        deliveryAddress: {
          type: SchemaType.STRING,
          description: 'The delivery address provided by the customer.',
        },
        paymentMethod: {
          type: SchemaType.STRING,
          description: 'The payment method chosen by the customer (e.g., cash, card).',
        },
        items: {
          type: SchemaType.ARRAY,
          description: 'List of items to order.',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              productId: {
                type: SchemaType.NUMBER,
                description: 'The numeric ID of the product.',
              },
              quantity: {
                type: SchemaType.NUMBER,
                description: 'The quantity of this product to order.',
              },
            },
            required: ['productId', 'quantity'],
          },
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Any special requests or details from the customer.',
        },
      },
      required: ['customerName', 'customerContact', 'items'],
    },
  },
  {
    name: 'get_customer_orders',
    description: 'Retrieve the customer\'s recent orders to check status or history.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: 'The maximum number of orders to retrieve (default is 5).',
        },
      },
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel a specific order for the customer.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: {
          type: SchemaType.NUMBER,
          description: 'The ID of the order to cancel.',
        },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Escalate the conversation to a human support agent when the customer is angry, wants to talk to a manager, or has an issue you cannot resolve.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: {
          type: SchemaType.STRING,
          description: 'Short summary of why the customer needs a human.',
        },
        sentiment: {
          type: SchemaType.STRING,
          description: 'Sentiment of the customer: URGENT, NORMAL, or COMPLAINT.',
        },
      },
      required: ['reason', 'sentiment'],
    },
  },
];
