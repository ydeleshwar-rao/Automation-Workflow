import axiosInstance from "@/src/services/apiClient";

/** Fetches the server's RSA public key used to encrypt SMTP credentials before transit. */
export const getSmtpPublicKey = async (): Promise<string> => {
  const response = await axiosInstance.get<{ data: { publicKey: string } }>(
    "/mail/public-key"
  );
  return response.data.data.publicKey;
};
