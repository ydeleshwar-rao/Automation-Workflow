"use client";

import axiosInstance from "@/src/services/apiClient";

export type WhatsAppStatus = {
  connected?: boolean;
  status?: string;
  phone?: string;
  phone_number?: string;
  qr?: string;
  qrCode?: string;
  qr_code?: string;
  message?: string;
};

export async function connectWhatsApp(options: { reset?: boolean } = {}) {
  const res = await axiosInstance.post("/whatsapp/connect", options);
  return res.data?.data ?? res.data;
}

export async function getWhatsAppQr(): Promise<WhatsAppStatus> {
  const res = await axiosInstance.get("/whatsapp/qr");
  return res.data?.data ?? res.data;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const res = await axiosInstance.get("/whatsapp/status");
  return res.data?.data ?? res.data;
}

export async function disconnectWhatsApp() {
  const res = await axiosInstance.delete("/whatsapp/disconnect");
  return res.data?.data ?? res.data;
}

export async function sendWhatsAppText(input: { to: string; message: string }) {
  const res = await axiosInstance.post("/whatsapp/messages/text", input);
  return res.data?.data ?? res.data;
}

export async function sendWhatsAppImage(input: { to: string; url: string; caption?: string; mimetype?: string }) {
  const res = await axiosInstance.post("/whatsapp/messages/image", input);
  return res.data?.data ?? res.data;
}

export async function sendWhatsAppDocument(input: {
  to: string;
  url: string;
  filename?: string;
  caption?: string;
  mimetype?: string;
}) {
  const res = await axiosInstance.post("/whatsapp/messages/document", input);
  return res.data?.data ?? res.data;
}

export async function sendWhatsAppLocation(input: {
  to: string;
  lat: number | string;
  lng: number | string;
  name?: string;
  address?: string;
}) {
  const res = await axiosInstance.post("/whatsapp/messages/location", input);
  return res.data?.data ?? res.data;
}
