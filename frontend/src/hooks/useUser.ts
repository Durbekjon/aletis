import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authApi, type UserResponse, type UpdateProfilePayload, type UpdatePasswordPayload } from "@/src/api/authApi"
import { toast } from "sonner"

export function useUserQuery() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] })
      toast.success("Profile updated successfully ✅")
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update profile"
      toast.error(message)
    },
  })
}

export function useUpdatePasswordMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePasswordPayload) => authApi.updatePassword(payload),
    onSuccess: () => {
      toast.success("Password updated successfully ✅")
    },
    onError: (error: any) => {
      const status = error?.response?.status
      const message =
        status === 401
          ? "Old password is incorrect"
          : error?.response?.data?.message || "Failed to update password"
      toast.error(message)
    },
  })
}

