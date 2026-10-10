import axiosInstance from "@/src/services/apiClient";
import type {
  SendEmailPayload,
  SendEmailResponse,
} from "../types/mailApis.type";

/**
 * POST /mail/send
 * Sends an email using a saved SMTP connection.
 */
export const sendEmail = async (
  payload: SendEmailPayload
): Promise<SendEmailResponse["data"]> => {
  const response = await axiosInstance.post<SendEmailResponse>(
    "/mail/send",
    payload
  );
  return response.data.data;
};
