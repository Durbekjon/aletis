import axiosInstance from "./client"

export interface FileUploadResponse {
  id: number
  filename: string
  originalName: string
  mimeType: string
  size: number
  key: string
  url: string
  uploadedAt: string
  uploadedBy: number
}


export const filesApi = {
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await axiosInstance.post<FileUploadResponse>("/v1/files/upload", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  async uploadManyFiles(files: File[]): Promise<any[]> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const { data } = await axiosInstance.post<any[]>("/v1/files/upload-many", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  async getRecentFiles(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const queryString = searchParams.toString()
    const url = queryString ? `/v1/files/recent?${queryString}` : "/v1/files/recent"
    
    const { data } = await axiosInstance.get(url)
    return data
  },

  async deleteFile(id: number): Promise<void> {
    await axiosInstance.delete(`/v1/files/${id}`)
  },

  async deleteFileByKey(key: string): Promise<void> {
    await axiosInstance.delete(`/v1/files/by-key/${key}`)
  },

  async deleteManyFiles(fileIds: number[]): Promise<void> {
    await axiosInstance.delete("/v1/files/delete-many", {
      data: { fileIds }
    })
  }
}

export default filesApi


