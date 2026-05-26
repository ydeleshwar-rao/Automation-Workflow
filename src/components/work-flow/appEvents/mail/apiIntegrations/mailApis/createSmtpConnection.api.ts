import axiosInstance from "@/src/services/apiClient";
import type {
  CreateSmtpConnectionPayload,
  CreateSmtpConnectionResponse,
  GetConnectionsResponse,
} from "../types/mailApis.type";

/**
 * POST /mail/smtpcreate
 * Creates and verifies a new global SMTP connection (admin/developer only).
 */
export const createSmtpConnection = async (
  payload: CreateSmtpConnectionPayload
): Promise<CreateSmtpConnectionResponse["data"]> => {
  const response = await axiosInstance.post<CreateSmtpConnectionResponse>(
    "/mail/smtpcreate",
    payload
  );
  return response.data.data;
};

/**
 * GET /mail/getconnections
 * Fetches all global SMTP connections (visible to all authenticated users).
 */
export const getSmtpConnections = async (): Promise<GetConnectionsResponse["data"]> => {
  const response = await axiosInstance.get<GetConnectionsResponse>("/mail/getconnections");
  return response.data.data;
};
