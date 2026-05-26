import axios from "axios";

type BigQueryClientRow = {
  client_name?: string | null;
  display_name?: string | null;
  clientkey?: string | null;
};

const CLIENT_KEY_LOOKUP_URL =
  `${process.env.NEXT_PUBLIC_API_URL}/bigquery/getclientskeydetails`;

export function normalizeLookupValue(value: string | null | undefined) {
  return value
    ?.toLowerCase()
    .replace(
      /\b(ltd|limited|llc|inc|engineer|engineers|services|solutions|heating|electrical|energy|group|plumbing|renewables)\b/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim() ?? "";
}

export function includesMatch(source: string | null | undefined, target: string | null | undefined) {
  const normalizedSource = normalizeLookupValue(source);
  const normalizedTarget = normalizeLookupValue(target);

  return Boolean(
    normalizedSource &&
      normalizedTarget &&
      (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)),
  );
}

export function generateGnKey() {
  return `gn_${Math.random().toString(36).slice(2, 10)}`;
}

export async function resolveClientKey(companyName: string, clientContactName?: string) {
  try {
    const { data: result } = await axios.get(CLIENT_KEY_LOOKUP_URL);
    const rows: BigQueryClientRow[] = result?.data?.rows ?? [];

    const matchedRow =
      rows.find((row) => includesMatch(companyName, row.client_name)) ||
      rows.find((row) => includesMatch(companyName, row.display_name)) ||
      rows.find((row) => includesMatch(clientContactName, row.client_name)) ||
      rows.find((row) => includesMatch(clientContactName, row.display_name));

    return matchedRow?.clientkey?.trim() || generateGnKey();
  } catch {
    return generateGnKey();
  }
}
