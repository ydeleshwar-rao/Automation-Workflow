import { flattenWebhookPayload } from "./autoMapper";
import { store } from "@/src/store/store";
import { fieldLabelsApi, type FieldLabels } from "./apiIntegrations/fieldLabelsApi";

export interface EmailTemplateOptions {
  nodeId: string | number;
  payload: Record<string, any>;
  title?: string;
  companyName?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

const labelOverrides: Record<string, string> = {
  firstname: "First Name",
  lastname: "Last Name",
  emailaddress: "Email Address",
  phonenumber: "Phone Number",
  hearaboutus: "Hear About Us",
  leadsource: "Lead Source",
  refid: "Ref ID",
};

function escapeHtmlCell(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLabel(key: string): string {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (labelOverrides[normalized]) return labelOverrides[normalized];

  let label = key.replace(/^web_mail_/, "");
  label = label.replace(/([a-zA-Z])(\d)/g, "$1 $2");
  label = label.replace(/(\d)([a-zA-Z])/g, "$1 $2");
  label = label.replace(/([a-z])([A-Z])/g, "$1 $2");
  label = label.replace(/[_-]/g, " ");
  label = label.replace(/\s+/g, " ").trim();
  label = label.replace(/\b\w/g, (firstLetter) => firstLetter.toUpperCase());
  return label;
}

const LABEL_CACHE_PREFIX = "label_cache_";

function readCachedLabels(cacheKey: string): FieldLabels | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    return cached ? (JSON.parse(cached) as FieldLabels) : null;
  } catch {
    return null;
  }
}

function writeCachedLabels(cacheKey: string, labels: FieldLabels) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(labels));
  } catch {
    // Storage full or blocked — labels are just regenerated next time
  }
}

/** AI labels come from the backend; on any failure the template falls back to formatLabel(). */
async function fetchFieldLabels(fieldKeys: string[]): Promise<FieldLabels> {
  const cacheKey = LABEL_CACHE_PREFIX + [...fieldKeys].sort().join(",");
  const cachedLabels = readCachedLabels(cacheKey);
  if (cachedLabels) return cachedLabels;

  const request = store.dispatch(fieldLabelsApi.endpoints.generateFieldLabels.initiate(fieldKeys));
  try {
    const labels = await request.unwrap();
    if (Object.keys(labels).length > 0) writeCachedLabels(cacheKey, labels);
    return labels;
  } catch {
    return {};
  } finally {
    request.reset();
  }
}

/**
 * Builds an HTML email skeleton with placeholders `{{nodeId__flatKey}}` (double underscore)
 * for each key from flattenWebhookPayload.
 */
export async function generateEmailTemplate({
  nodeId,
  payload,
  title,
  companyName,
  websiteUrl,
  logoUrl,
}: EmailTemplateOptions): Promise<string> {
  const flat = flattenWebhookPayload(payload);
  const aiLabels = await fetchFieldLabels(Object.keys(flat));
  const id = String(nodeId);
  const skipKeys = new Set([
    "web_mail_color_code",
    "web_mail_color_code 2",
    "web_mail_color_code_2",
    "web_mail_social_icon",
    "web_mail_reason_icon",
    "web_mail_social_url",
    "web_mail_copyright_text",
    "web_mail_reason_heading",
    "web_mail_site_logo",
    "web_mail_main_website_url",
    "web_mail_company_name",
    "web_mail_company_email",
    "web_mail_company_phone_number",
    "web_mail_contact_page_url",
    "web_mail_privacy_policy_url",
    "web_mail_terms_condition_url",
  ]);

  const rows = Object.entries(flat)
    .filter(([key, value]) => {
      if (skipKeys.has(key)) return false;
      if (value === "" || value === null || value === undefined) return false;
      return true;
    })
    .map(([key]) => {
      const label = aiLabels[key] || formatLabel(key);
      const cellToken = `{{${id}__${key}}}`;
      const isLogoField =
        key.toLowerCase().includes("site_logo") || key.toLowerCase().includes("logo");
      const cellContent = isLogoField
        ? `<img src="${cellToken}" width="150" alt="Logo">`
        : cellToken;
      return `
        <tr>
          <td>${escapeHtmlCell(label)}</td>
          <td>${cellContent}</td>
        </tr>`;
    })
    .join("\n");

  const logoSrc =
    logoUrl !== undefined && logoUrl !== ""
      ? escapeHtmlCell(logoUrl)
      : `{{${id}__web_mail_site_logo}}`;

  const company =
    companyName !== undefined && companyName !== ""
      ? escapeHtmlCell(companyName)
      : `{{${id}__web_mail_company_name}}`;

  const website =
    websiteUrl !== undefined && websiteUrl !== ""
      ? escapeHtmlCell(websiteUrl)
      : `{{${id}__web_mail_main_website_url}}`;

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    .border-style { border-top: 10px solid #578b90; position: relative; }
    .container { max-width: 600px; margin: 0 auto; }
    td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; }
    tr { border-bottom: 1px solid #f2f2f2; }
  </style>
</head>
<body>
<div class="container">
  <header style="padding:10px;background-color:#d3e0e9;">
    <table style="width:100%;border-collapse:collapse;font-family:arial">
      <thead>
        <tr style="font-size:small;padding:20px;border:0;">
          <td colspan="2" rowspan="3" style="padding:0 15px;text-align:center;border:0;">
            <a href="${website}" target="_blank">
              <img style="padding:0.1em" src="${logoSrc}" alt="${company}" width="150">
            </a>
          </td>
        </tr>
      </thead>
    </table>
  </header>

  <table style="width:100%;border-collapse:collapse;border-color:#ccc;font-family:arial;font-size:14px" border="1">
    <thead>
      <tr>
        <th colspan="4" style="background-color:#1c95c9;color:#fff;">
          <h3 style="margin:0;text-align:center">${title || "Submission Details"}</h3>
        </th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td style="text-align:center;padding:1em;background-image:linear-gradient(#eee,#fff);" colspan="3">
          <small>Thank you for choosing
            <strong>
              <a style="color:#1c95c9;" href="${website}" target="_blank">${company}</a>
            </strong>
          </small>
        </td>
      </tr>
    </tfoot>
  </table>
</div>
</body>
</html>`;
}
