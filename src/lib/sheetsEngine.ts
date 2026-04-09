import { google, sheets_v4 } from "googleapis";

type InputMapping = { label: string; range: string }[];
type OutputMapping = { tenantId: number; range: string }[];

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Brak GOOGLE_SERVICE_ACCOUNT_JSON w zmiennych środowiskowych.");

  const credentials = JSON.parse(
    raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8")
  );

  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export async function writeInputValues(
  spreadsheetId: string,
  inputMapping: InputMapping,
  values: Record<string, string>
) {
  const sheets = getSheetsClient();

  const data = inputMapping
    .filter((m) => values[m.label] !== undefined)
    .map((m) => ({
      range: m.range,
      values: [[values[m.label]]],
    }));

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });
}

export async function triggerRecalc(spreadsheetId: string) {
  const sheets = getSheetsClient();
  // Dummy read to force recalculation
  await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A1",
  });
}

export async function readOutputValues(
  spreadsheetId: string,
  outputMapping: OutputMapping
): Promise<{ tenantId: number; amount: number }[]> {
  const sheets = getSheetsClient();

  const ranges = outputMapping.map((m) => m.range);
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });

  const valueRanges = response.data.valueRanges ?? [];

  return outputMapping.map((m, i) => {
    const raw = valueRanges[i]?.values?.[0]?.[0];
    const amount = parseFloat(
      String(raw ?? "0").replace(",", ".").replace(/[^\d.-]/g, "")
    );
    return {
      tenantId: m.tenantId,
      amount: isNaN(amount) ? 0 : amount,
    };
  });
}

export async function writeNamedRanges(
  spreadsheetId: string,
  values: Record<string, string>
): Promise<void> {
  const sheets = getSheetsClient();
  const data = Object.entries(values)
    .filter(([, v]) => v !== "")
    .map(([range, value]) => ({ range, values: [[value]] }));
  if (data.length === 0) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}

export async function exportSheetAsPdf(
  spreadsheetId: string,
  gid?: string
): Promise<Buffer> {
  const auth = getAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) throw new Error("Nie udało się uzyskać tokenu dostępu.");

  const params = new URLSearchParams({
    format: "pdf",
    portrait: "true",
    fitw: "true",
    gridlines: "false",
    printtitle: "false",
    sheetnames: "false",
    pagenum: "UNDEFINED",
  });
  if (gid) params.set("gid", gid);

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${params}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Eksport PDF nieudany: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export function parseInputMapping(json: string): InputMapping {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: Record<string, unknown>) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.label === "string" &&
        typeof item.range === "string"
    ) as InputMapping;
  } catch {
    return [];
  }
}

export function parseOutputMapping(json: string): OutputMapping {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: Record<string, unknown>) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.tenantId === "number" &&
        typeof item.range === "string"
    ) as OutputMapping;
  } catch {
    return [];
  }
}
