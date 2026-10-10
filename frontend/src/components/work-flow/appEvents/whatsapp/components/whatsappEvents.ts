export const WHATSAPP_TRIGGER_EVENTS = [
  {
    id: "message_received",
    label: "New Message Received",
    description: "Triggers when a new WhatsApp message is received.",
  },
  {
    id: "message_status_updated",
    label: "Message Status Updated",
    description: "Triggers when a WhatsApp message status changes.",
  },
];

export const WHATSAPP_ACTION_EVENTS = [
  {
    id: "send_text_message",
    label: "Send Text Message",
    description: "Send a WhatsApp text message through the connected phone.",
  },
  {
    id: "send_image",
    label: "Send Image",
    description: "Send an image URL with an optional caption.",
  },
  {
    id: "send_document",
    label: "Send Document/PDF",
    description: "Send a document or PDF URL with an optional filename.",
  },
  {
    id: "send_template_message",
    label: "Send Template Message",
    description: "Send a reusable template-style text message.",
  },
  {
    id: "send_location",
    label: "Send Location",
    description: "Send latitude and longitude to a WhatsApp chat.",
  },
];
