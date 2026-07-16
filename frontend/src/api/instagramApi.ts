import axiosInstance from "./client"

export interface InstagramAccount {
  id: number
  instagramUserId: string
  instagramUsername: string | null
  tokenExpiresAt: string | null
  createdAt: string
}

export const instagramApi = {
  // Get the Instagram OAuth consent-screen URL for the current org
  async getConnectUrl(): Promise<{ url: string }> {
    const { data } = await axiosInstance.get<{ url: string }>("/v1/instagram/connect")
    return data
  },

  // Get the current org's connected Instagram account, if any
  async getAccount(): Promise<InstagramAccount | null> {
    const { data } = await axiosInstance.get<InstagramAccount | null>("/v1/instagram/account")
    return data
  },

  // Disconnect the current org's Instagram account
  async disconnect(): Promise<void> {
    await axiosInstance.delete("/v1/instagram/account")
  },
}

export default instagramApi
