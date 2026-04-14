import { Resend } from "resend";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function createResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFrom() {
  return process.env.RESEND_FROM ?? "BMT <noreply@example.com>";
}

function formatAmount(amount: number) {
  return amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

// ── RENT ────────────────────────────────────────────────────────────────────

export interface RentEmailData {
  to: string;
  firstName: string;
  lastName: string;
  invoiceNumber: string;
  amount: number;
  month: number;
  year: number;
  address: string;
  pdfAttachment?: Buffer;
}

export async function sendRentEmail(data: RentEmailData): Promise<boolean> {
  const resend = createResend();
  if (!resend) return false;

  const monthName = MONTHS_PL[data.month - 1];
  const subject = `Rachunek za czynsz – ${monthName} ${data.year} (${data.invoiceNumber})`;
  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1a1a1a;">Rachunek za czynsz – ${monthName} ${data.year}</h2>
  <p>Dzień dobry <strong>${data.firstName} ${data.lastName}</strong>,</p>
  <p>W załączeniu przesyłamy rachunek za czynsz za ${monthName} ${data.year}:</p>
  <table style="border-collapse:collapse;width:100%;margin:20px 0;">
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Numer rachunku</td>
      <td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${data.invoiceNumber}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Okres rozliczeniowy</td>
      <td style="padding:8px;border:1px solid #ddd;">${monthName} ${data.year}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Nieruchomość</td>
      <td style="padding:8px;border:1px solid #ddd;">${data.address}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Kwota czynszu</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:1.2em;font-weight:bold;color:#1a1a1a;">${formatAmount(data.amount)}</td>
    </tr>
  </table>
  <p>Prosimy o uregulowanie należności w terminie.</p>
  <p style="color:#666;font-size:0.9em;">Z poważaniem,<br>BMT</p>
</body>
</html>`;

  const attachments: { filename: string; content: Buffer }[] = [];
  if (data.pdfAttachment) {
    const safeNumber = data.invoiceNumber.replace(/\//g, "-");
    attachments.push({ filename: `Rachunek_${safeNumber}.pdf`, content: data.pdfAttachment });
  }

  try {
    const { error } = await resend.emails.send({
      from: getFrom(),
      to: data.to,
      subject,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    });
    if (error) {
      console.error(`[email] Błąd wysyłki czynszu do ${data.to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Błąd wysyłki czynszu do ${data.to}:`, err);
    return false;
  }
}

// ── REMINDER ─────────────────────────────────────────────────────────────────

export interface ReminderEmailData {
  to: string;
  firstName: string;
  lastName: string;
  subject: string;
  body: string;
}

export async function sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
  const resend = createResend();
  if (!resend) return false;

  const htmlBody = data.body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <p>Dzień dobry <strong>${data.firstName} ${data.lastName}</strong>,</p>
  <p>${htmlBody}</p>
  <p style="color:#666;font-size:0.9em;">Z poważaniem,<br>BMT</p>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: getFrom(),
      to: data.to,
      subject: data.subject,
      html,
    });
    if (error) {
      console.error(`[email] Błąd wysyłki przypomnienia do ${data.to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Błąd wysyłki przypomnienia do ${data.to}:`, err);
    return false;
  }
}

// ── MEDIA ───────────────────────────────────────────────────────────────────

export interface MediaEmailData {
  to: string;
  firstName: string;
  lastName: string;
  invoiceNumber: string;
  amount: number;
  month: number;
  year: number;
  address: string;
}

export async function sendMediaEmail(data: MediaEmailData): Promise<boolean> {
  const resend = createResend();
  if (!resend) return false;

  const monthName = MONTHS_PL[data.month - 1];
  const subject = `Rozliczenie mediów – ${monthName} ${data.year} (${data.invoiceNumber})`;
  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1a1a1a;">Rozliczenie mediów – ${monthName} ${data.year}</h2>
  <p>Dzień dobry <strong>${data.firstName} ${data.lastName}</strong>,</p>
  <p>Przesyłamy rozliczenie mediów (energia, woda, ogrzewanie) za ${monthName} ${data.year}:</p>
  <table style="border-collapse:collapse;width:100%;margin:20px 0;">
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Numer rachunku</td>
      <td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${data.invoiceNumber}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Okres rozliczeniowy</td>
      <td style="padding:8px;border:1px solid #ddd;">${monthName} ${data.year}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Nieruchomość</td>
      <td style="padding:8px;border:1px solid #ddd;">${data.address}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Kwota za media</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:1.2em;font-weight:bold;color:#1a1a1a;">${formatAmount(data.amount)}</td>
    </tr>
  </table>
  <p>Prosimy o uregulowanie należności w terminie.</p>
  <p style="color:#666;font-size:0.9em;">Z poważaniem,<br>BMT</p>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: getFrom(),
      to: data.to,
      subject,
      html,
    });
    if (error) {
      console.error(`[email] Błąd wysyłki mediów do ${data.to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Błąd wysyłki mediów do ${data.to}:`, err);
    return false;
  }
}
