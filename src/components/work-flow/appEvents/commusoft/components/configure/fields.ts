/**
 * Static field definitions for Commusoft trigger & action events.
 * Keys must match action_key values returned by the backend
 * (/automation/action-event-types/commusoft/triggers|actions).
 */

export interface CommusoftFieldOption {
  label: string;
  value: string;
}

export interface CommusoftFieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: CommusoftFieldOption[]; // only for type="select"
}

// Commusoft /jobs status enum (from API docs).
const JOB_STATUS_OPTIONS: CommusoftFieldOption[] = [
  { label: "Ongoing", value: "ongoing" },
  { label: "Reserved", value: "reserved" },
  { label: "On Hold", value: "on_hold" },
  { label: "Waiting for Customer", value: "waiting_for_customer" },
  { label: "Completed", value: "completed" },
];

const JOB_PRIORITY_OPTIONS: CommusoftFieldOption[] = [
  { label: "Not Important", value: "Not_Important" },
  { label: "Medium Importance", value: "Medium_Importance" },
  { label: "Important", value: "Important" },
  { label: "Urgent", value: "Urgent" },
];

export const COMMUSOFT_EVENT_FIELDS: Record<string, CommusoftFieldDef[]> = {
  // ─── Triggers ──────────────────────────────────────────────────────────────
  job_completed: [
    {
      name: "category",
      label: "Job Category",
      type: "text",
      required: false,
      placeholder: "Optional — filter by category",
    },
  ],

  job_closed: [
    {
      name: "category",
      label: "Job Category",
      type: "text",
      required: false,
      placeholder: "Optional — filter by category",
    },
  ],

  new_job: [
    {
      name: "status",
      label: "Status",
      type: "select",
      required: false,
      placeholder: "Any status",
      options: JOB_STATUS_OPTIONS,
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      required: false,
      placeholder: "Any priority",
      options: JOB_PRIORITY_OPTIONS,
    },
    {
      name: "customerID",
      label: "Customer ID",
      type: "text",
      required: false,
      placeholder: "Optional — only jobs for this customer",
    },
  ],

  // new_client has no server-side filters — /customers API accepts no params.

  // ─── Actions ───────────────────────────────────────────────────────────────
  create_client: [
    {
      name: "customer_type",
      label: "Customer Type",
      type: "select",
      required: true,
      placeholder: "Choose customer type...",
      options: [], // loaded dynamically from /commusoft/customertypes
    },
    {
      name: "address_line_1",
      label: "Address Line 1",
      type: "textarea",
      required: true,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "company_name",
      label: "Company Name",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "company_landline",
      label: "Company Landline",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "company_email",
      label: "Company Email",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "title",
      label: "Title",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "email",
      label: "Email",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "surname",
      label: "Surname",
      type: "text",
      required: true,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "name",
      label: "Name",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "address_line_2",
      label: "Address Line 2",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "address_line_3",
      label: "Address Line 3",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "town",
      label: "Town",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "county",
      label: "County",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "postcode",
      label: "Postcode",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "landline",
      label: "Landline",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "mobile",
      label: "Mobile",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "country_code",
      label: "Country Code",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
  ],

  create_job: [
    {
      name: "description",
      label: "Job Description",
      type: "textarea",
      required: true,
      placeholder: "Enter job description...",
    },
    // Customer lookup — any ONE of these is accepted by the backend.
    {
      name: "customer_id",
      label: "Customer ID",
      type: "text",
      required: false,
      placeholder: "Direct Commusoft customer id (optional)",
    },
    {
      name: "customer_uuid",
      label: "Customer UUID",
      type: "text",
      required: false,
      placeholder: "Commusoft customer uuid (optional)",
    },
    {
      name: "customer_name",
      label: "Customer Name",
      type: "text",
      required: false,
      placeholder: "Looked up live against /customers",
    },
    {
      name: "email",
      label: "Customer Email",
      type: "text",
      required: false,
      placeholder: "Looked up live against /customers",
    },
    // Optional job fields
    {
      name: "priority",
      label: "Priority",
      type: "select",
      required: false,
      placeholder: "Default",
      options: JOB_PRIORITY_OPTIONS,
    },
    {
      name: "po_number",
      label: "PO Number",
      type: "text",
      required: false,
      placeholder: "Purchase order number",
    },
    {
      name: "quoted_amount",
      label: "Quoted Amount",
      type: "text",
      required: false,
      placeholder: "e.g. 200 + VAT",
    },
    {
      name: "engineer_notes",
      label: "Engineer Notes",
      type: "textarea",
      required: false,
      placeholder: "Notes for the engineer",
    },
    {
      name: "access_notes",
      label: "Access Notes",
      type: "textarea",
      required: false,
      placeholder: "Access instructions",
    },
    {
      name: "access_method",
      label: "Access Method",
      type: "select",
      required: false,
      placeholder: "Default",
      options: [
        { label: "Communicate with Work Address", value: "communicate_with_work_address" },
        { label: "Agent Has Keys", value: "agent_has_keys" },
        { label: "We Have Keys", value: "we_have_keys" },
        { label: "Landlord Has Keys", value: "landlord_has_keys" },
        { label: "Unknown", value: "unknown" },
      ],
    },
  ],
};
