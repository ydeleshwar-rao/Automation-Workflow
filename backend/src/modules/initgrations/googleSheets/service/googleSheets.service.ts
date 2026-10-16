import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import type { GoogleSheetsIntegration } from "@prisma/client";
import { ApiError } from "../../../../utils/ApiError.js";
import { refreshGoogleSheetsAccessToken } from "../utils/refreshAccessToken.js";
import {
  googleSheetsRepository,
  type GoogleSheetWatchKey,
} from "../repositories/googleSheets.repository.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHEETS_BASE       = "https://sheets.googleapis.com/v4";
const DRIVE_BASE        = "https://www.googleapis.com/drive/v3";
const GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL  = "https://oauth2.googleapis.com/token";
const API_TIMEOUT_MS    = 30_000;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

const refreshLocks = new Map<string, Promise<any>>();

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoogleSheetsIntegrationRow = GoogleSheetsIntegration;

export type TriggerType =
  | "new_row"
  | "new_or_updated_row"
  | "new_spreadsheet"
  | "new_worksheet";

// ─── Integration row helpers ──────────────────────────────────────────────────

const getIntegrationRaw = async (userId: string): Promise<GoogleSheetsIntegrationRow> => {
  const integration = await googleSheetsRepository.findIntegrationByUserId(userId);

  if (!integration) {
    throw new ApiError(
      404,
      "Google Sheets integration not found. Please connect your account first."
    );
  }
  return integration;
};

export const getIntegration = async (
  userId: string,
  forceRefresh = false
): Promise<GoogleSheetsIntegrationRow> => {
  const row = await getIntegrationRaw(userId);

  if (row.needs_reauth) {
    throw new ApiError(401, "Google Sheets requires re-authentication. Please reconnect.");
  }

  const isExpiringSoon = row.expires_at.getTime() <= Date.now() + REFRESH_BUFFER_MS;

  if (!isExpiringSoon && !forceRefresh) return row;

  const lockKey = `googlesheets:refresh:${userId}`;
  if (refreshLocks.has(lockKey)) {
    await refreshLocks.get(lockKey);
    return await getIntegrationRaw(userId);
  }

  const refreshPromise = refreshGoogleSheetsAccessToken(userId, row.refresh_token)
    .then(() => getIntegrationRaw(userId))
    .finally(() => refreshLocks.delete(lockKey));

  refreshLocks.set(lockKey, refreshPromise);
  return await refreshPromise;
};

// ─── Axios clients ────────────────────────────────────────────────────────────

const getSheetsClient = (token: string): AxiosInstance =>
  axios.create({
    baseURL: SHEETS_BASE,
    timeout: API_TIMEOUT_MS,
    headers: { Authorization: `Bearer ${token}` },
  });

const getDriveClient = (token: string): AxiosInstance =>
  axios.create({
    baseURL: DRIVE_BASE,
    timeout: API_TIMEOUT_MS,
    headers: { Authorization: `Bearer ${token}` },
  });

// Auto-retry on 401 with token refresh
async function sheetsRequest<T>(
  userId: string,
  fn: (sheets: AxiosInstance, drive: AxiosInstance) => Promise<T>
): Promise<T> {
  let integration = await getIntegration(userId);
  let sheets = getSheetsClient(integration.access_token);
  let drive  = getDriveClient(integration.access_token);

  try {
    return await fn(sheets, drive);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      console.warn(`[GoogleSheets] 401 for user=${userId} — forcing token refresh`);
      integration = await getIntegration(userId, true);
      sheets = getSheetsClient(integration.access_token);
      drive  = getDriveClient(integration.access_token);
      return await fn(sheets, drive);
    }
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Converts A1 range rows array into array of key-value objects using header row
function rowsToObjects(
  headers: string[],
  rows: string[][]
): Array<Record<string, string>> {
  return rows.map((row) => {
    const rowObject: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      rowObject[header || `column_${columnIndex + 1}`] = row[columnIndex] ?? "";
    });
    return rowObject;
  });
}

// Row 1 holds the headers, so data rows start at sheet row 2
const FIRST_DATA_ROW_NUMBER = 2;

/** sha256 of the row's JSON — lets us detect changes without storing row contents. */
function hashRow(rowObject: Record<string, string>): string {
  return crypto.createHash("sha256").update(JSON.stringify(rowObject)).digest("hex");
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GoogleSheetsService {

  // ── OAuth ───────────────────────────────────────────────────────────────────

  static getConnectUrl(userId: string): string {
    const clientId    = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_SHEETS_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new ApiError(
        500,
        "Google Sheets config missing (GOOGLE_CLIENT_ID / GOOGLE_SHEETS_REDIRECT_URI)"
      );
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id:     clientId,
      redirect_uri:  redirectUri,
      scope:         GOOGLE_SCOPES,
      access_type:   "offline",
      prompt:        "consent",
      state: Buffer.from(
        JSON.stringify({ userId, app: "google_sheets" })
      ).toString("base64url"),
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(userId: string, code: string): Promise<void> {
    const redirectUri = process.env.GOOGLE_SHEETS_REDIRECT_URI!;

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  redirectUri,
        code,
      }),
    });

    const body: any = await res.json();
    if (!res.ok || body.error) {
      throw new ApiError(400, `Google OAuth failed: ${body.error_description || body.error}`);
    }
    if (!body.refresh_token) {
      throw new ApiError(
        400,
        "Google did not return a refresh_token. Revoke access at myaccount.google.com/permissions and reconnect."
      );
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (body.expires_in || 3600));

    await googleSheetsRepository.saveTokens(userId, {
      access_token:  body.access_token,
      refresh_token: body.refresh_token,
      expires_at:    expiresAt,
    });

    console.log(`[GoogleSheets] ✅ Connected user=${userId}`);
  }

  static async getConnectionStatus(userId: string) {
    const integration = await googleSheetsRepository.findIntegrationByUserId(userId);

    if (!integration) return { connected: false };
    return {
      connected:    true,
      needs_reauth: integration.needs_reauth,
      expires_at:   integration.expires_at,
    };
  }

  static async disconnect(userId: string) {
    const integration = await googleSheetsRepository.findIntegrationByUserId(userId);

    // Revoke token at Google; a failed revoke must not block disconnecting locally
    if (integration?.access_token) {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${integration.access_token}`,
        { method: "POST" }
      ).catch(() => {});
    }

    // Row fingerprints go with their watches (ON DELETE CASCADE)
    await googleSheetsRepository.deleteIntegration(userId);
    await googleSheetsRepository.deleteWatchesForUser(userId);

    return { disconnected: true };
  }

  // ── Triggers ─────────────────────────────────────────────────────────────────
  // (Zapier-style polling triggers)

  // ── Trigger: New Spreadsheet — polls Drive for newly created sheets ──────────

  static async listSpreadsheets(userId: string) {
    const spreadsheets: any[] = [];
    let pageToken: string | undefined;

    await sheetsRequest(userId, async (_, drive) => {
      do {
        const { data } = await drive.get("/files", {
          params: {
            q:         "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            fields:    "nextPageToken, files(id, name, webViewLink, createdTime, modifiedTime)",
            orderBy:   "modifiedTime desc",
            pageSize:  100,
            ...(pageToken ? { pageToken } : {}),
          },
        });

        for (const f of data.files ?? []) {
          spreadsheets.push({
            spreadsheet_id: f.id,
            title:          f.name ?? "",
            url:            f.webViewLink ?? "",
            created_time:   f.createdTime ?? null,
            modified_time:  f.modifiedTime ?? null,
          });
        }

        pageToken = data.nextPageToken;
      } while (pageToken);
    });

    return spreadsheets;
  }

  // ── Trigger: New Worksheet — polls a spreadsheet for new sheets/tabs ─────────

  static async listWorksheets(userId: string, spreadsheetId: string) {
    return sheetsRequest(userId, async (sheets) => {
      const { data } = await sheets.get(`/spreadsheets/${spreadsheetId}`, {
        params: { fields: "sheets(properties(sheetId,title,index,sheetType))" },
      });

      return (data.sheets ?? []).map((sheet: any) => ({
        sheet_id:   sheet.properties.sheetId,
        title:      sheet.properties.title,
        index:      sheet.properties.index,
        sheet_type: sheet.properties.sheetType,
      }));
    });
  }

  // ── Trigger: New Spreadsheet Row ─────────────────────────────────────────────
  // Returns rows added since the watch's last_row_count.

  static async getNewRows(
    userId: string,
    spreadsheetId: string,
    sheetName: string = "Sheet1"
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const range = `${sheetName}!A1:ZZ`;
      const { data } = await sheets.get(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
      );

      const allRows: string[][] = data.values ?? [];
      if (allRows.length < 2) return { headers: [], new_rows: [], total_rows: 0 };

      const headers = allRows[0]!.map(String);
      const dataRows = allRows.slice(1);

      // Fetch last known row count from watch
      const watch = await googleSheetsRepository.findWatch({
        user_id:        userId,
        spreadsheet_id: spreadsheetId,
        sheet_name:     sheetName,
        trigger_type:   "new_row",
      });

      const lastCount = watch?.last_row_count ?? 0;
      const newDataRows = dataRows.slice(lastCount);
      const newRows = rowsToObjects(headers, newDataRows);

      // Update row count in watch
      if (watch && newRows.length > 0) {
        await googleSheetsRepository.markWatchSynced(watch.id, dataRows.length);
      }

      return { headers, new_rows: newRows, total_rows: dataRows.length };
    });
  }

  // ── Trigger: New or Updated Row ───────────────────────────────────────────────
  // Compares a sha256 fingerprint of every row against the fingerprints stored
  // for the new_or_updated_row watch and returns changed rows. Row contents are
  // never stored. Without a watch every row is reported and nothing is persisted.

  static async getUpdatedRows(
    userId: string,
    spreadsheetId: string,
    sheetName: string = "Sheet1"
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const range = `${sheetName}!A1:ZZ`;
      const { data } = await sheets.get(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
      );

      const allRows: string[][] = data.values ?? [];
      if (allRows.length < 2) return { headers: [], changed_rows: [] };

      const headers = allRows[0]!.map(String);
      const dataRows = allRows.slice(1);
      const currentObjects = rowsToObjects(headers, dataRows);

      const watch = await googleSheetsRepository.findWatch({
        user_id:        userId,
        spreadsheet_id: spreadsheetId,
        sheet_name:     sheetName,
        trigger_type:   "new_or_updated_row",
      });
      const storedFingerprints = watch
        ? await googleSheetsRepository.findRowFingerprints(watch.id)
        : [];
      const storedHashByRowNumber = new Map(
        storedFingerprints.map((fingerprint) => [fingerprint.row_number, fingerprint.content_hash])
      );

      const changedRows: Array<{ row_number: number; data: Record<string, string> }> = [];
      const changedFingerprints: Array<{ row_number: number; content_hash: string }> = [];

      currentObjects.forEach((rowObject, rowIndex) => {
        const rowNumber = rowIndex + FIRST_DATA_ROW_NUMBER;
        const contentHash = hashRow(rowObject);
        if (storedHashByRowNumber.get(rowNumber) === contentHash) return;

        changedRows.push({ row_number: rowNumber, data: rowObject });
        changedFingerprints.push({ row_number: rowNumber, content_hash: contentHash });
      });

      if (watch && currentObjects.length > 0) {
        await googleSheetsRepository.saveRowFingerprints(watch.id, changedFingerprints);
        await googleSheetsRepository.markWatchSynced(watch.id);
      }

      return { headers, changed_rows: changedRows };
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────────
  // (Zapier-style actions that write back to Google Sheets)

  // ── Action: Get All Rows ──────────────────────────────────────────────────────

  static async getRows(
    userId: string,
    spreadsheetId: string,
    sheetName: string = "Sheet1",
    range?: string
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const fullRange = range ?? `${sheetName}!A1:ZZ`;
      const { data } = await sheets.get(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}`
      );

      const allRows: string[][] = data.values ?? [];
      if (!allRows.length) return { headers: [], rows: [], total: 0 };

      const headers = allRows[0]!.map(String);
      const rows = rowsToObjects(headers, allRows.slice(1));

      return { headers, rows, total: rows.length };
    });
  }

  // ── Action: Append Row ────────────────────────────────────────────────────────

  static async appendRow(
    userId: string,
    spreadsheetId: string,
    sheetName: string,
    rowData: Record<string, string>
  ) {
    return sheetsRequest(userId, async (sheets) => {
      // Get headers first to order values correctly
      const headerRange = `${sheetName}!1:1`;
      const { data: headerData } = await sheets.get(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}`
      );
      const headers: string[] = headerData.values?.[0]?.map(String) ?? [];

      // Build row in header order; unknown keys appended at end
      const values = headers.length
        ? headers.map((header) => rowData[header] ?? "")
        : Object.values(rowData);

      const range = `${sheetName}!A:A`;
      const { data } = await sheets.post(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
        { values: [values] },
        { params: { valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS" } }
      );

      return {
        updated_range:  data.updates?.updatedRange,
        updated_rows:   data.updates?.updatedRows,
        updated_cells:  data.updates?.updatedCells,
      };
    });
  }

  // ── Action: Update Row ────────────────────────────────────────────────────────

  static async updateRow(
    userId: string,
    spreadsheetId: string,
    sheetName: string,
    rowNumber: number,
    rowData: Record<string, string>
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const headerRange = `${sheetName}!1:1`;
      const { data: headerData } = await sheets.get(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}`
      );
      const headers: string[] = headerData.values?.[0]?.map(String) ?? [];

      const values = headers.length
        ? headers.map((header) => rowData[header] ?? "")
        : Object.values(rowData);

      const range = `${sheetName}!A${rowNumber}`;
      const { data } = await sheets.put(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { values: [values] },
        { params: { valueInputOption: "USER_ENTERED" } }
      );

      return {
        updated_range: data.updatedRange,
        updated_rows:  data.updatedRows,
        updated_cells: data.updatedCells,
      };
    });
  }

  // ── Action: Look Up Row ───────────────────────────────────────────────────────

  static async lookupRow(
    userId: string,
    spreadsheetId: string,
    sheetName: string,
    columnName: string,
    searchValue: string
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const range = `${sheetName}!A1:ZZ`;
      const { data } = await sheets.get(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
      );

      const allRows: string[][] = data.values ?? [];
      if (allRows.length < 2) return { found: false, row: null };

      const headers = allRows[0]!.map(String);
      const colIndex = headers.indexOf(columnName);
      if (colIndex === -1) throw new ApiError(400, `Column "${columnName}" not found in sheet`);

      const dataRows = allRows.slice(1);
      const matchIndex = dataRows.findIndex(
        (row) => (row[colIndex] ?? "") === searchValue
      );

      if (matchIndex === -1) return { found: false, row: null };

      const matchedRow = dataRows[matchIndex];
      return {
        found:      true,
        row_number: matchIndex + 2,
        row:        matchedRow ? rowsToObjects(headers, [matchedRow])[0] ?? null : null,
      };
    });
  }

  // ── Action: Delete Row ────────────────────────────────────────────────────────

  static async deleteRow(
    userId: string,
    spreadsheetId: string,
    sheetName: string,
    rowNumber: number
  ) {
    return sheetsRequest(userId, async (sheets) => {
      // Get sheetId from name
      const { data: meta } = await sheets.get(`/spreadsheets/${spreadsheetId}`, {
        params: { fields: "sheets(properties(sheetId,title))" },
      });
      const sheet = (meta.sheets ?? []).find(
        (sheetEntry: any) => sheetEntry.properties.title === sheetName
      );
      if (!sheet) throw new ApiError(404, `Sheet "${sheetName}" not found`);

      const sheetId = sheet.properties.sheetId;
      const zeroIndex = rowNumber - 1;

      await sheets.post(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension:  "ROWS",
                startIndex: zeroIndex,
                endIndex:   zeroIndex + 1,
              },
            },
          },
        ],
      });

      return { deleted: true, row_number: rowNumber };
    });
  }

  // ── Action: Clear Row ─────────────────────────────────────────────────────────

  static async clearRow(
    userId: string,
    spreadsheetId: string,
    sheetName: string,
    rowNumber: number
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const range = `${sheetName}!${rowNumber}:${rowNumber}`;
      await sheets.post(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`
      );
      return { cleared: true, row_number: rowNumber };
    });
  }

  // ── Action: Create Spreadsheet ────────────────────────────────────────────────

  static async createSpreadsheet(
    userId: string,
    title: string,
    sheetNames: string[] = ["Sheet1"]
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const { data } = await sheets.post("/spreadsheets", {
        properties: { title },
        sheets: sheetNames.map((name) => ({
          properties: { title: name },
        })),
      });

      return {
        spreadsheet_id: data.spreadsheetId,
        title:          data.properties?.title,
        url:            data.spreadsheetUrl,
        sheets:         (data.sheets ?? []).map((sheet: any) => ({
          sheet_id: sheet.properties.sheetId,
          title:    sheet.properties.title,
        })),
      };
    });
  }

  // ── Action: Create Worksheet (add a sheet/tab) ────────────────────────────────

  static async createWorksheet(
    userId: string,
    spreadsheetId: string,
    sheetTitle: string
  ) {
    return sheetsRequest(userId, async (sheets) => {
      const { data } = await sheets.post(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      });

      const addedSheet = data.replies?.[0]?.addSheet?.properties;
      return {
        sheet_id: addedSheet?.sheetId,
        title:    addedSheet?.title,
        index:    addedSheet?.index,
      };
    });
  }

  // ── Watch Management (polling subscriptions) ───────────────────────────────────

  static async createWatch(
    userId: string,
    spreadsheetId: string,
    sheetName: string,
    triggerType: TriggerType
  ) {
    await googleSheetsRepository.saveWatch(
      buildWatchKey(userId, spreadsheetId, sheetName, triggerType)
    );
    return { watched: true, spreadsheet_id: spreadsheetId, sheet_name: sheetName, trigger_type: triggerType };
  }

  static async deleteWatch(
    userId: string,
    spreadsheetId: string,
    sheetName: string,
    triggerType: TriggerType
  ) {
    await googleSheetsRepository.deleteWatch(
      buildWatchKey(userId, spreadsheetId, sheetName, triggerType)
    );
    return { unwatched: true };
  }

  static listWatches(userId: string) {
    return googleSheetsRepository.findWatchesByUserId(userId);
  }

  // ── Sync: Poll all active watches (called by polling engine) ─────────────────

  static async syncAllWatches(userId: string) {
    const watches = await googleSheetsRepository.findActiveWatchesByUserId(userId);

    if (!watches.length) return { message: "No active watches", results: {} };

    const results: Record<string, any> = {};

    for (const watch of watches) {
      const key = `${watch.spreadsheet_id}:${watch.sheet_name}:${watch.trigger_type}`;
      try {
        if (watch.trigger_type === "new_row") {
          const newRowsResult = await GoogleSheetsService.getNewRows(userId, watch.spreadsheet_id, watch.sheet_name);
          results[key] = { new_rows: newRowsResult.new_rows.length };
        } else if (watch.trigger_type === "new_or_updated_row") {
          const updatedRowsResult = await GoogleSheetsService.getUpdatedRows(userId, watch.spreadsheet_id, watch.sheet_name);
          results[key] = { changed_rows: updatedRowsResult.changed_rows.length };
        } else if (watch.trigger_type === "new_spreadsheet") {
          const spreadsheets = await GoogleSheetsService.listSpreadsheets(userId);
          results[key] = { total_spreadsheets: spreadsheets.length };
        } else if (watch.trigger_type === "new_worksheet") {
          const worksheets = await GoogleSheetsService.listWorksheets(userId, watch.spreadsheet_id);
          results[key] = { total_worksheets: worksheets.length };
        }
      } catch (err: any) {
        results[key] = { error: err.message };
      }
    }

    return results;
  }

  // ── Live reads in the shape of the former "cached" endpoints ──────────────────
  // Vendor data is not copied into our database (credentials/config only), so
  // these fetch from Google and keep the response keys the frontend already uses.

  static async getSpreadsheetsFromDb(userId: string) {
    const spreadsheets = await GoogleSheetsService.listSpreadsheets(userId);
    return spreadsheets.map((spreadsheet) => ({
      ...spreadsheet,
      user_id:   userId,
      google_id: spreadsheet.spreadsheet_id,
    }));
  }

  static async getCachedRows(
    userId: string,
    spreadsheetId: string,
    sheetName: string = "Sheet1"
  ) {
    const { rows } = await GoogleSheetsService.getRows(userId, spreadsheetId, sheetName);
    return rows.map((rowData, rowIndex) => ({
      user_id:        userId,
      spreadsheet_id: spreadsheetId,
      sheet_name:     sheetName,
      row_number:     rowIndex + FIRST_DATA_ROW_NUMBER,
      row_data:       rowData,
    }));
  }
}

function buildWatchKey(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  triggerType: TriggerType
): GoogleSheetWatchKey {
  return {
    user_id:        userId,
    spreadsheet_id: spreadsheetId,
    sheet_name:     sheetName,
    trigger_type:   triggerType,
  };
}
