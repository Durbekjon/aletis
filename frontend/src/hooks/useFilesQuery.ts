import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import filesApi from '@/src/api/filesApi'

export function useUploadFileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: filesApi.uploadFile,
    onSuccess: () => {
      toast.success("File uploaded successfully!")
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: (error) => {
      toast.error(`Failed to upload file: ${error.message}`)
    },
  })
}

export function useUploadManyFilesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: filesApi.uploadManyFiles,
    onSuccess: (data) => {
      toast.success(`${data.length} files uploaded successfully!`)
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: (error) => {
      toast.error(`Failed to upload files: ${error.message}`)
    },
  })
}

export function useDeleteFileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: filesApi.deleteFile,
    onSuccess: () => {
      toast.success("File deleted successfully!")
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: (error) => {
      toast.error(`Failed to delete file: ${error.message}`)
    },
  })
}

export function useDeleteFileByKeyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: filesApi.deleteFileByKey,
    onSuccess: () => {
      toast.success("File deleted successfully!")
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: (error) => {
      toast.error(`Failed to delete file: ${error.message}`)
    },
  })
}
