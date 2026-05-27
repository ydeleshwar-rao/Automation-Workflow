import { useMutation, useQuery } from "@tanstack/react-query"
import { createSmtpConnection, getSmtpConnections } from "../mailApis/createSmtpConnection.api"
import { CreateSmtpConnectionPayload } from "../types/mailApis.type"

export const useCreateSmtpConnection = () => {
  return useMutation({
    mutationFn: (data: CreateSmtpConnectionPayload) =>
      createSmtpConnection(data),
  })
}

export const useGetSmtpConnections = () => {
  return useQuery({
    queryKey: ["smtpConnections"],
    queryFn: () => getSmtpConnections(),
  })
}
