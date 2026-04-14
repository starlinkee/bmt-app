import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Brak GOOGLE_SERVICE_ACCOUNT_JSON w zmiennych środowiskowych.");

  const credentials = JSON.parse(
    raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8")
  );

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() });
}

/**
 * Finds or creates a folder with the given name inside the optional parent.
 * Returns the folder ID.
 */
export async function getOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const drive = getDriveClient();

  const parentFilter = parentId
    ? ` and '${parentId}' in parents`
    : "";
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder'${parentFilter} and trashed=false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const existing = res.data.files ?? [];
  if (existing.length > 0 && existing[0].id) {
    return existing[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) throw new Error("Nie udało się utworzyć folderu w Drive.");
  return created.data.id;
}

/**
 * Ensures a YYYY/MM folder structure exists under rootFolderId.
 * Returns the ID of the month folder.
 */
export async function ensureYearMonthFolder(
  year: number,
  month: number,
  rootFolderId: string
): Promise<string> {
  const yearFolder = await getOrCreateFolder(year.toString(), rootFolderId);
  const mm = month.toString().padStart(2, "0");
  return getOrCreateFolder(mm, yearFolder);
}

/**
 * Uploads a PDF buffer to Drive inside the given folder.
 * Returns the Drive file ID.
 */
export async function uploadPdfToDrive(
  filename: string,
  buffer: Buffer,
  folderId: string
): Promise<string> {
  const drive = getDriveClient();
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!res.data.id) throw new Error("Nie udało się zapisać pliku w Drive.");
  return res.data.id;
}
