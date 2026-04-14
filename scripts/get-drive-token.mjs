/**
 * Jednorazowy skrypt do uzyskania refresh tokenu Google Drive.
 *
 * Uruchomienie:
 *   node scripts/get-drive-token.mjs
 *
 * Wymagania w .env:
 *   GOOGLE_OAUTH_CLIENT_ID=...
 *   GOOGLE_OAUTH_CLIENT_SECRET=...
 */

import { google } from "googleapis";
import readline from "readline";
import { readFileSync } from "fs";
import { resolve } from "path";

// Załaduj .env ręcznie (nie mamy dotenv)
const envPath = resolve(process.cwd(), ".env");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const match = line.match(/^([^#=\s]+)\s*=\s*"?(.+?)"?\s*$/);
  if (match) process.env[match[1]] = match[2];
}

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "\nBrak GOOGLE_OAUTH_CLIENT_ID lub GOOGLE_OAUTH_CLIENT_SECRET w .env\n" +
    "Dodaj je najpierw i uruchom skrypt ponownie.\n"
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/drive"],
  prompt: "consent",
});

console.log("\n=== KROK 1 ===");
console.log("Otwórz poniższy URL w przeglądarce i autoryzuj dostęp do Drive:\n");
console.log(authUrl);
console.log("\n=== KROK 2 ===");
console.log("Po autoryzacji przeglądarka przekieruje na http://localhost:3000?code=XXXX");
console.log("Skopiuj wartość parametru 'code' z paska adresu (nawet jeśli strona pokazuje błąd).\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Wklej kod tutaj: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\n=== GOTOWE ===");
    console.log("Dodaj do .env:\n");
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"`);
    if (!tokens.refresh_token) {
      console.log("\nUWAGA: refresh_token jest pusty. Usuń uprawnienia aplikacji na");
      console.log("https://myaccount.google.com/permissions i uruchom skrypt ponownie.");
    }
  } catch (err) {
    console.error("\nBłąd wymiany kodu:", err.message);
  }
});
