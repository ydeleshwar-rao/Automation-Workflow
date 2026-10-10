export const BRAND_COLORS = {
  PRIMARY: "#ff4f00",
  PRIMARY_HOVER: "#e64600",
  SERVICEM8: "#7cc736",
  LEADSHUB: "#3fbfbb",
  COMMUSOFT: "#f58320",
} as const;

export const UI_MESSAGES = {
  CONNECT_SUCCESS_GHL: "Successfully connected to Leads Hub!",
  CONNECT_SUCCESS_SERVICEM8: "Successfully connected to ServiceM8!",
  DISCONNECT_SUCCESS: (service: string) => `Disconnected from ${service}`,
  DISCONNECT_ERROR: "Failed to disconnect. Please try again.",
} as const;
