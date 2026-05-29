/**
 * Static field definitions for ServiceM8 action events.
 * Add a new entry here whenever a new event needs configure fields.
 */

export interface Sm8FieldOption {
  label: string;
  value: string;
}

export interface Sm8FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: Sm8FieldOption[]; // only for type="select"
}

/**
 * Map of action_key → field definitions shown on the Configure step.
 * The action_key must match exactly what the API returns in `action_key`.
 */
export const SM8_EVENT_FIELDS: Record<string, Sm8FieldDef[]> = {
  job_queued: [
    {
      name: "queue_uuid",
      label: "Queue",
      type: "select",
      required: true,
      placeholder: "Choose a queue...",
      options: [
        // Populated at runtime from /listqueues — value = uuid, label = name
      ],
    },
    {
      name: "category_uuid",
      label: "Job Category",
      type: "select",
      required: false,
      placeholder: "Choose value...",
      options: [
        // Populated at runtime from /listcategories
      ],
    },
  ],


  job_completed: [
    {
      name: "category_uuid",
      label: "Job Category",
      type: "select",
      required: false,
      placeholder: "Choose value...",
      options: [
        // Populated at runtime from /listcategories
      ],
    },
  ],
  

  create_job: [
    {
      name: "customer_name",
      label: "Customer Name",
      type: "text",
      required: true,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_status",
      label: "Job Status",
      type: "select",
      required: true,
      placeholder: "Choose status...",
      options: [
        { label: "Quote", value: "Quote" },
        { label: "Work Order", value: "Work Order" },
      ],
    },
    {
      name: "job_address",
      label: "Job Address",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_address",
      label: "Billing Address",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_description",
      label: "Job Description",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "purchase_order_number",
      label: "Purchase Order Number",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "work_completed",
      label: "Work Completed",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_contact_first_name",
      label: "Job Contact First Name",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_contact_last_name",
      label: "Job Contact Last Name",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_contact_phone",
      label: "Job Contact Phone",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_contact_mobile",
      label: "Job Contact Mobile",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_contact_email",
      label: "Job Contact E-Mail Address",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_contact_first_name",
      label: "Billing Contact First Name",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_contact_last_name",
      label: "Billing Contact Last Name",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_contact_phone",
      label: "Billing Contact Phone",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_contact_mobile",
      label: "Billing Contact Mobile",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_contact_email",
      label: "Billing Contact E-Mail",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
  ],


  job_quote_sent: [
    {
      name: "category_uuid",
      label: "Job Category (Optional Filter)",
      type: "select",
      required: false,
      placeholder: "All categories...",
      options: [],
    },
  ],

  job_quote_accepted: [
    {
      name: "category_uuid",
      label: "Job Category (Optional Filter)",
      type: "select",
      required: false,
      placeholder: "All categories...",
      options: [],
    },
    {
      name: "queue_uuid",
      label: "Queue (Optional Filter)",
      type: "select",
      required: false,
      placeholder: "All queues...",
      options: [],
    },
  ],

  update_job: [
    {
      name: "job_uuid",
      label: "Job ID",
      type: "text",
      required: true,
      placeholder: "Enter job UUID or insert from trigger data...",
    },
    {
      name: "job_status",
      label: "Job Status",
      type: "select",
      required: false,
      placeholder: "Leave unchanged...",
      options: [
        { label: "Quote",        value: "Quote" },
        { label: "Work Order",   value: "Work Order" },
        { label: "Pending",      value: "Pending" },
        { label: "In Progress",  value: "In Progress" },
        { label: "Completed",    value: "Completed" },
        { label: "Unsuccessful", value: "Unsuccessful" },
      ],
    },
    {
      name: "queue_uuid",
      label: "Move to Queue",
      type: "select",
      required: false,
      placeholder: "Leave unchanged...",
      options: [],
    },
    {
      name: "job_address",
      label: "Job Address",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_address",
      label: "Billing Address",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "job_description",
      label: "Job Description",
      type: "textarea",
      required: false,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "purchase_order_number",
      label: "Purchase Order Number",
      type: "text",
      required: false,
      placeholder: "Enter text or insert data...",
    },
  ],

  move_job_to_queue: [
    {
      name: "job_uuid",
      label: "Job ID",
      type: "text",
      required: true,
      placeholder: "Enter job UUID or insert from trigger data...",
    },
    {
      name: "queue_uuid",
      label: "Queue",
      type: "select",
      required: true,
      placeholder: "Choose a queue...",
      options: [
        // Populated at runtime from /listqueues — value = uuid, label = name
      ],
    },
  ],

  create_client: [
    {
      name: "name",
      label: "Name",
      type: "text",
      required: true,
      placeholder: "Enter text or insert data...",
    },
    {
      name: "address",
      label: "Address",
      type: "textarea",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "billing_address",
      label: "Billing Address",
      type: "textarea",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "fax_number",
      label: "Fax Number",
      type: "text",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "website",
      label: "Website",
      type: "text",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "first_name",
      label: "First Name",
      type: "text",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "last_name",
      label: "Last Name",
      type: "text",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "phone",
      label: "Phone Number",
      type: "text",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "mobile",
      label: "Mobile Number",
      type: "text",
      placeholder: "Enter text or insert data...",
    },
    {
      name: "email",
      label: "E-Mail Address",
      type: "text",
      placeholder: "Enter text or insert data...",
    },
  ],

}