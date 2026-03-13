import * as Papa from "papaparse";

export type ParsedTransaction = {
  date: string;       // ISO date string
  amount: number;
  title: string;
  bankAccount: string; // counterparty account
};

type ColumnMapping = {
  name: string;
  dateCol: string;
  amountCol: string;
  titleCol: string;
  accountCol: string;
  // Some banks split amount into debit/credit columns
  creditCol?: string;
  debitCol?: string;
  encoding?: string;
  delimiter?: string;
  skipRows?: number;
};

const BANK_MAPPINGS: ColumnMapping[] = [
  {
    name: "PKO BP",
    dateCol: "Data operacji",
    amountCol: "Kwota",
    titleCol: "Opis transakcji",
    accountCol: "Numer konta nadawcy/odbiorcy",
    delimiter: ",",
  },
  {
    name: "mBank",
    dateCol: "#Data operacji",
    amountCol: "#Kwota",
    titleCol: "#Opis operacji",
    accountCol: "#Numer konta",
    delimiter: ";",
  },
  {
    name: "Santander",
    dateCol: "Data transakcji",
    amountCol: "Kwota",
    titleCol: "Tytuł",
    accountCol: "Numer rachunku",
    delimiter: ";",
  },
  {
    name: "ING",
    dateCol: "Data transakcji",
    amountCol: "Kwota transakcji (waluta rachunku)",
    titleCol: "Tytuł",
    accountCol: "Dane kontrahenta",
    delimiter: ";",
  },
  {
    name: "Millenium",
    dateCol: "Data transakcji",
    amountCol: "Kwota",
    titleCol: "Opis",
    accountCol: "Rachunek nadawcy/odbiorcy",
    delimiter: ",",
  },
];

function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim();
}

function parsePolishNumber(value: string): number {
  if (!value || value.trim() === "") return 0;
  // Polish format: 1 234,56 or 1234,56 or -1 234,56
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parsePolishDate(value: string): string {
  if (!value) return new Date().toISOString();
  const trimmed = value.trim();

  // Try DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const match = trimmed.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
  }

  // Try YYYY-MM-DD (ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(trimmed).toISOString();
  }

  // Fallback
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function detectMapping(headers: string[]): ColumnMapping | null {
  const normalized = headers.map(normalizeHeader);

  for (const mapping of BANK_MAPPINGS) {
    const required = [mapping.dateCol, mapping.titleCol];
    // Need either amountCol or both creditCol/debitCol
    if (mapping.amountCol) required.push(mapping.amountCol);

    const allFound = required.every((col) =>
      normalized.some((h) => h.toLowerCase() === col.toLowerCase())
    );
    if (allFound) return mapping;
  }
  return null;
}

function findColumn(row: Record<string, string>, colName: string): string {
  // Case-insensitive, BOM-safe lookup
  const key = Object.keys(row).find(
    (k) => normalizeHeader(k).toLowerCase() === colName.toLowerCase()
  );
  return key ? (row[key] || "") : "";
}

export type CsvParseResult = {
  success: true;
  transactions: ParsedTransaction[];
  bankName: string;
  totalRows: number;
} | {
  success: false;
  error: string;
};

export function parseBankCsv(csvContent: string): CsvParseResult {
  // Try different delimiters
  const delimiters = [",", ";", "\t"];
  let bestResult: Papa.ParseResult<Record<string, string>> | null = null;
  let bestDelimiter = ",";

  for (const delimiter of delimiters) {
    const result = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      delimiter,
      skipEmptyLines: true,
    });
    if (
      result.data.length > 0 &&
      Object.keys(result.data[0]).length > (bestResult ? Object.keys(bestResult.data[0]).length : 0)
    ) {
      bestResult = result;
      bestDelimiter = delimiter;
    }
  }

  if (!bestResult || bestResult.data.length === 0) {
    return { success: false, error: "Nie udało się odczytać pliku CSV." };
  }

  const headers = Object.keys(bestResult.data[0]).map(normalizeHeader);
  const mapping = detectMapping(headers);

  if (!mapping) {
    // Try generic mapping - look for common column names
    return parseGenericCsv(bestResult.data, headers);
  }

  const transactions: ParsedTransaction[] = [];

  for (const row of bestResult.data) {
    const dateStr = findColumn(row, mapping.dateCol);
    const title = findColumn(row, mapping.titleCol);
    const account = findColumn(row, mapping.accountCol);

    let amount: number;
    if (mapping.creditCol && mapping.debitCol) {
      const credit = parsePolishNumber(findColumn(row, mapping.creditCol));
      const debit = parsePolishNumber(findColumn(row, mapping.debitCol));
      amount = credit > 0 ? credit : -debit;
    } else {
      amount = parsePolishNumber(findColumn(row, mapping.amountCol));
    }

    if (amount === 0 && !title) continue; // Skip empty rows

    transactions.push({
      date: parsePolishDate(dateStr),
      amount,
      title: title.trim(),
      bankAccount: account.replace(/\s/g, "").trim(),
    });
  }

  return {
    success: true,
    transactions,
    bankName: mapping.name,
    totalRows: transactions.length,
  };
}

function parseGenericCsv(
  data: Record<string, string>[],
  headers: string[]
): CsvParseResult {
  // Try to find columns by common patterns
  const lower = headers.map((h) => h.toLowerCase());

  const dateIdx = lower.findIndex((h) => h.includes("data") || h.includes("date"));
  const amountIdx = lower.findIndex((h) => h.includes("kwota") || h.includes("amount") || h.includes("wartość"));
  const titleIdx = lower.findIndex((h) => h.includes("tytuł") || h.includes("opis") || h.includes("title") || h.includes("description"));
  const accountIdx = lower.findIndex((h) => h.includes("konto") || h.includes("rachunek") || h.includes("account") || h.includes("nadawc"));

  if (dateIdx === -1 || amountIdx === -1) {
    return {
      success: false,
      error: `Nie rozpoznano formatu CSV. Znalezione kolumny: ${headers.join(", ")}. Wymagane kolumny z datą i kwotą.`,
    };
  }

  const transactions: ParsedTransaction[] = [];

  for (const row of data) {
    const keys = Object.keys(row);
    const dateStr = row[keys[dateIdx]] || "";
    const amount = parsePolishNumber(row[keys[amountIdx]] || "0");
    const title = titleIdx >= 0 ? (row[keys[titleIdx]] || "") : "";
    const account = accountIdx >= 0 ? (row[keys[accountIdx]] || "").replace(/\s/g, "") : "";

    if (amount === 0 && !title) continue;

    transactions.push({
      date: parsePolishDate(dateStr),
      amount,
      title: title.trim(),
      bankAccount: account.trim(),
    });
  }

  return {
    success: true,
    transactions,
    bankName: "Nieznany (automatyczne dopasowanie)",
    totalRows: transactions.length,
  };
}
