import axios from "axios";
import { getValidAccessToken } from "../../../../common/function.js";

function normalizePhoneForCompare(raw: unknown): string {
  return String(raw ?? "").replace(/[^\d+]/g, "");
}

function extractContactIdFromDuplicateBody(body: any): string | null {
  return (
    body?.contact?.id ??
    body?.contactId ??
    body?.id ??
    body?.meta?.contactId ??
    body?.meta?.contact_id ??
    null
  );
}

function isDuplicateContactError(err: any): boolean {
  const status = err?.response?.status;
  const body = err?.response?.data;
  const text = [
    body?.message,
    body?.error,
    body?.msg,
    err?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return status === 409 || text.includes("duplicated contact") || text.includes("duplicate contact");
}

async function findExistingContactId(
  accessToken: string,
  locationId: string,
  cleanedData: Record<string, any>
): Promise<string | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Version: "2021-07-28",
    Accept: "application/json",
  };

  const duplicateAttempts = [
    cleanedData.email ? { email: cleanedData.email } : null,
    cleanedData.phone ? { phone: cleanedData.phone } : null,
  ].filter(Boolean) as Array<Record<string, string>>;

  for (const attempt of duplicateAttempts) {
    try {
      const response = await axios.get(
        "https://services.leadconnectorhq.com/contacts/search/duplicate",
        {
          headers,
          params: { locationId, ...attempt },
        }
      );

      const id = response.data?.contact?.id ?? response.data?.id ?? null;
      if (id) return id;
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.warn(
          "Contact duplicate lookup failed:",
          err.response?.data ?? err.message
        );
      }
    }
  }

  const listQueries = [cleanedData.email, cleanedData.phone].filter(Boolean);
  for (const query of listQueries) {
    try {
      const response = await axios.get(
        "https://services.leadconnectorhq.com/contacts/",
        {
          headers,
          params: {
            locationId,
            query,
            limit: 20,
          },
        }
      );

      const contacts = response.data?.contacts ?? [];
      const targetEmail = String(cleanedData.email ?? "").toLowerCase();
      const targetPhone = normalizePhoneForCompare(cleanedData.phone);
      const match = contacts.find((contact: any) => {
        const emailMatches =
          targetEmail &&
          String(contact.email ?? "").toLowerCase() === targetEmail;
        const phoneMatches =
          targetPhone &&
          normalizePhoneForCompare(contact.phone) === targetPhone;
        return emailMatches || phoneMatches;
      });

      if (match?.id) return match.id;
    } catch (err: any) {
      console.warn(
        "Contact list lookup failed:",
        err.response?.data ?? err.message
      );
    }
  }

  return null;
}

const GHL_CONTACTS_URL = "https://services.leadconnectorhq.com/contacts/";
const GHL_API_VERSION = "2021-07-28";

/** Maps a GHL contact to the snake_case shape the frontend already consumes. */
function formatGhlContact(contact: any) {
  return {
    ghl_contact_id: contact.id,
    location_id: contact.locationId,

    first_name: contact.firstName,
    last_name: contact.lastName,
    first_name_raw: contact.firstNameRaw,
    last_name_raw: contact.lastNameRaw,
    contact_name: contact.contactName,

    email: contact.email,
    additional_emails: contact.additionalEmails,
    phone: contact.phone,
    dnd: contact.dnd,
    dnd_settings: contact.dndSettings,

    address1: contact.address1,
    city: contact.city,
    state: contact.state,
    postal_code: contact.postalCode,
    country: contact.country,

    company_name: contact.companyName,
    business_id: contact.businessId,
    website: contact.website,
    type: contact.type,
    source: contact.source,
    assigned_to: contact.assignedTo,

    tags: contact.tags,
    followers: contact.followers,
    profile_photo: contact.profilePhoto,
    timezone: contact.timezone,
    attributions: contact.attributions,

    custom_fields: contact.customFields,
    date_of_birth: contact.dateOfBirth,

    date_added: contact.dateAdded,
    date_updated: contact.dateUpdated,
    start_after: contact.startAfter,
  };
}

/** Contacts are read live from GHL — we do not keep a local copy. */
export async function getContacts(locationId: string) {
  const accessToken = await getValidAccessToken(locationId);

  const response = await axios.get(GHL_CONTACTS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: GHL_API_VERSION,
      Accept: "application/json",
    },
    params: { locationId },
  });

  const contacts: any[] = response.data?.contacts ?? [];
  return contacts.map(formatGhlContact);
}


export async function createContact(
  locationId: string,
  rawData: any
): Promise<{ contactId: string; created: boolean }> {
  try {
    console.log("locationid", locationId);

    // ================= TOKEN =================
    const accessToken = await getValidAccessToken(locationId);

    if (!accessToken) {
      throw new Error(`Access token not found for location: ${locationId}`);
    }

    // ================= CLEAN RAW DATA =================
    // Supports two formats:
    //   1. Keys with "contact." prefix  → strips prefix + converts snake_case to camelCase
    //   2. Keys already in camelCase    → used as-is
    console.log("calling_the_service", rawData);

    const hasPrefixedKeys = Object.keys(rawData).some((key) =>
      key.startsWith("contact.")
    );

    const cleanedData: any = {};

    if (hasPrefixedKeys) {
      Object.entries(rawData).forEach(([key, value]) => {
        if (!key.startsWith("contact.")) return;
        const withoutPrefix = key.replace("contact.", "");
        const camelKey = withoutPrefix.replace(/_([a-z])/g, (_, c) =>
          c.toUpperCase()
        );
        cleanedData[camelKey] = value;
      });
    } else {
      Object.assign(cleanedData, rawData);
    }

    const contactPayload: any = { ...cleanedData, locationId };

    // convert tags string → array
    if (contactPayload.tags && typeof contactPayload.tags === "string") {
      contactPayload.tags = contactPayload.tags
        .split(",")
        .map((tag: string) => tag.trim());
    }

    // ================= CHECK IF CONTACT EXISTS =================
    const searchQuery: string | undefined =
      cleanedData.email ?? cleanedData.phone;

    if (!searchQuery) {
      throw new Error(
        "At least one of 'email' or 'phone' must be provided to check for an existing contact."
      );
    }

    console.log("🔍 Searching for existing contact:", searchQuery);

    let existingContactId = await findExistingContactId(
      accessToken,
      locationId,
      cleanedData
    );

    if (existingContactId) {
      console.log("✅ Contact already exists:", existingContactId);
    }

    // ================= RETURN EXISTING OR CREATE NEW =================
    if (existingContactId) {
      return { contactId: existingContactId, created: false };
    }

    console.log("📤 Contact not found — creating new contact...");
    console.log("📤 Contact payload:", JSON.stringify(contactPayload, null, 2));

    let contactResponse;
    try {
      contactResponse = await axios.post(
        "https://services.leadconnectorhq.com/contacts/",
        contactPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: "2021-07-28",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
    } catch (err: any) {
      if (isDuplicateContactError(err)) {
        const bodyContactId = extractContactIdFromDuplicateBody(err.response?.data);
        const recoveredContactId =
          bodyContactId ??
          (await findExistingContactId(accessToken, locationId, cleanedData));

        if (recoveredContactId) {
          console.log("✅ Duplicate contact recovered:", recoveredContactId);
          return { contactId: recoveredContactId, created: false };
        }
      }

      throw err;
    }

    const contactId = contactResponse.data.contact.id;
    console.log("✅ Contact created:", contactId);

    return { contactId, created: true };
  } catch (error: any) {
    console.error("❌ Error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to create contact"
    );
  }
}
