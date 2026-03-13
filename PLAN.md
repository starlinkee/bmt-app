# Plan: System Zarządzania Wynajmem (BMT App)

## Stackk
- Next.js 14 (App Router) + TypeScript
- SQLite + Prisma ORM
- Tailwind CSS + shadcn/ui
- next-auth (credentials provider, single password)
- googleapis (Google Sheets API v4 + Drive API)
- papaparse (CSV parsing)
- node-cron (backup scheduler)
- PM2 (process manager na VPS)
- Nginx (existing, dodajemy nowy server block)

---

## FAZA 0 — Scaffolding projektu

1. `npx create-next-app@latest bmt-app --typescript --tailwind --app --src-dir`
2. Instalacja zależności: `prisma @prisma/client next-auth papaparse node-cron googleapis archiver`
3. Instalacja shadcn/ui i wymaganych komponentów
4. Konfiguracja `.gitignore` — wyklucz `/app_data`, `.env*`
5. Stworzenie struktury folderów:
   - `/app_data/database/`, `/app_data/uploads/sources/`, `/app_data/uploads/invoices/`
   - `/src/lib/`, `/src/types/`
6. Plik `.env.example` z placeholderami

---

## FAZA 1 — Schemat bazy danych (Prisma)

**Modele:**
- `Property` — adres, typ lokalu
- `Tenant` — dane, fk→Property, `bankAccountsAsText: String`
- `Contract` — fk→Tenant, `rentAmount`, `startDate`, `endDate`, `isActive`
- `Invoice` — fk→Tenant, `type: RENT|MEDIA|OTHER`, `amount`, `month`, `year`, `sourceFilePath`, unikalne: `(tenantId, type, month, year)` dla RENT
- `Transaction` — fk→Tenant, `type: BANK|CASH|ADJUSTMENT`, `status: MATCHED|UNMATCHED|MANUAL`, `amount`, `date`, `title`, `bankAccount`, `description` (wymagane dla ADJUSTMENT)
- `SettlementGroup` — `name`, `spreadsheetId`, `inputMappingJSON: String`, `outputMappingJSON: String`, relacja do Property

Prisma `datasource` → `url = env("DATABASE_URL")` → plik w `/app_data/database/dev.db`

---

## FAZA 2 — Autoryzacja

- `next-auth` z `CredentialsProvider`
- Hasło porównywane z `process.env.APP_PASSWORD` (bcrypt)
- `middleware.ts` — chroni wszystkie ścieżki oprócz `/login`
- Sesja: JWT 30 dni

---

## FAZA 3 — Layout i podstawowy CRUD

- Sidebar z nawigacją: Nieruchomości / Najemcy / Umowy / Finanse / Media / Import CSV / Ustawienia
- Pages (Server Components + Server Actions):
  - `/properties` — CRUD nieruchomości
  - `/tenants` — CRUD najemców (z polem bankAccountsAsText)
  - `/contracts` — CRUD umów (kwota czynszu, daty, status aktywny)

---

## FAZA 4 — Logika "Skarbonki" (Core Finance)

- `lib/balance.ts` — funkcja `calculateBalance(tenantId)`: `SUM(Transaction.amount) - SUM(Invoice.amount)`
- `lib/statement.ts` — sortowanie chrono, symulacja statusów (najstarsze zaległe najpierw)
- `/tenants/[id]` — widok wyciągu (jak w banku), saldo live, status faktur (zielony/czerwony)
- `InvoiceStatusBadge` — komponent symulujący opłacenie na podstawie salda

---

## FAZA 5 — Generowanie Czynszów (Cykl Miesięczny)s

- `/finance` page z przyciskiem "Wystaw czynsze za [miesiąc/rok]"
- Server Action `generateRents(month, year)`:
  1. Pobiera aktywne kontrakty (`isActive = true`)
  2. Dla każdego kontraktu sprawdza unikalne `(tenantId, 'RENT', month, year)` — skip jeśli istnieje
  3. Tworzy `Invoice` records `prisma.invoice.createMany({skipDuplicates: true})`
- Potwierdzenie ile faktur zostało utworzonych vs pominięto

---

## FAZA 6 — Korekty (Adjustments)

- Formularz "Dodaj korektę" na widoku najemcy:
  - Kwota (+ umorzenie | − kara)
  - Opis (wymagany, min. 10 znaków)
  - Data
- Tworzy `Transaction` z `type: ADJUSTMENT`
- Wyświetlany w wyciągu z ikoną i opisem

---

## FAZA 7 — Import CSV (Bank Statement)

- `/import` page — drag-and-drop upload CSV
- `lib/csvParser.ts` — papaparse, mapa kolumn dla popularnych polskich banków (PKO, mBank, Santander)
- `lib/matcher.ts` — szuka numeru konta w `bankAccountsAsText` (split by newlines/commas)
- Bulk create: MATCHED (z `tenantId`) + UNMATCHED (bez)
- **Widok Uzgadniania** (`/import/reconcile`):
  - Lista UNMATCHED z select najemcy
  - Po przypisaniu: dialog "Zapamiętać numer konta [XX] dla [Najemca]?" → dopisuje do `bankAccountsAsText`
  - Server Action `reconcileTransaction(txId, tenantId, saveAccount?: boolean)`

---

## FAZA 8 — Silnik Google Sheets (Media)

- `/settlement-groups` — CRUD grup rozliczeniowych z polami JSON
- `lib/sheetsEngine.ts`:
  - `writeInputValues(spreadsheetId, inputMapping, values)` — zapis do Named Ranges
  - `triggerRecalc()` — dummy read wymusza przeliczenie
  - `readOutputValues(spreadsheetId, outputMapping)` → zwraca kwoty per najemca
- `/media/[groupId]` — dynamiczny formularz z pól `inputMappingJSON`
- Server Action `processSettlement(groupId, inputValues, month, year)`:
  1. Sheets write → read
  2. `Invoice.createMany()` dla każdego najemcy w grupie
  3. Opcjonalnie zapisuje `sourceFilePath` jeśli wgrano PDF faktury źródłowej

---

## FAZA 9 — Backup System

- `lib/backup.ts`:
  - `sqlite3` CLI: `.backup '/app_data/backups/dev_YYYYMMDD.db'`
  - `archiver` — ZIP: db + `/uploads`
  - `googleapis` Drive API — upload do folderu (ID z env)
- `lib/cron.ts` — `node-cron` schedule `0 3 * * *` (3:00 AM)
- Rejestracja crona w `instrumentation.ts` (Next.js server init)
- Env: `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (base64)

---

## FAZA 10 — Deploy na VPS

### Przygotowanie (jednorazowo)
1. SSH na serwer, `git clone` repo do `/var/www/bmt-app`
2. `npm ci && npm run build`
3. Stworzenie `/var/www/bmt-app/app_data/` + `dev.db` (`npx prisma migrate deploy`)
4. `.env.production` z wszystkimi zmiennymi
5. `pm2 start ecosystem.config.js --env production`
6. Nowy blok w `/etc/nginx/sites-available/` (nowa subdomena lub port):
   ```
   location /bmt/ { proxy_pass http://localhost:3001; }
   ```
   lub osobna subdomena: `bmt.twojadomena.pl`
7. `sudo nginx -t && sudo nginx -s reload`
8. Certbot SSL dla nowej subdomeny (jeśli osobna)

### CI/CD (prosty workflow)
- `git pull origin main && npm ci && npm run build && pm2 reload bmt-app`
- Skrypt `deploy.sh` na serwerze — wywołanie jedną komendą lokalnie przez SSH

### ecosystem.config.js
```js
module.exports = {
  apps: [{
    name: 'bmt-app',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/bmt-app',
    env_production: { NODE_ENV: 'production', PORT: 3001 }
  }]
}
```
