import axiosInstance from "./client"

export interface CheckoutRequest {
  items: {
    productId: number;
    quantity: number;
    price: number;
  }[];
  payments?: {
    provider: 'POS_CASH' | 'POS_CARD';
    amount: number;
  }[];
}

export const posApi = {
  async checkout(payload: CheckoutRequest) {
    const { data } = await axiosInstance.post('/v1/pos/checkout', payload);
    return data;
  },
  
  async openShift(startingCash: number) {
    const { data } = await axiosInstance.post('/v1/pos/shifts/open', { startingCash });
    return data;
  },

  async getCurrentShift() {
    const { data } = await axiosInstance.get('/v1/pos/shifts/current');
    return data;
  },

  async closeShift(shiftId: number, actualCash: number) {
    const { data } = await axiosInstance.post(`/v1/pos/shifts/${shiftId}/close`, { actualCash });
    return data;
  }
}

export default posApi;
