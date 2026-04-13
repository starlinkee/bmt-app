# BMT App

Aplikacja do zarządzania nieruchomościami, najemcami i rozliczeniami.

Po każdej zmianie rób commit i push.

## Stack

- Next.js 16 (App Router), TypeScript, Prisma + SQLite, Tailwind CSS + shadcn/ui
- Google Sheets API v4 (rozliczenia mediów), Gmail SMTP (Nodemailer)
- NextAuth (Credentials, jedno hasło, JWT 30 dni)
- Deploy: GitHub Actions -> VPS (pm2)

## Struktura projektu

- `src/app/(dashboard)/` - chronione strony (properties, tenants, contracts, finance, media, import)
- `src/lib/` - logika biznesowa (auth, email, csvParser, matcher, sheetsEngine, balance, statement)
- `src/components/ui/` - shadcn/ui, `sidebar.tsx`, `invoice-status-badge.tsx`
- `app_data/` - baza SQLite + uploady (poza Git)

## Model finansowy - "Skarbonka"

```
Saldo = Suma(Transakcje) - Suma(Rachunki)
```

Brak parowania 1:1. Status oplacenia rachunkow symulowany (najstarsze pokrywane najpierw).

## Numeracja rachunkow

Każda **umowa** ma numer porządkowy (`invoiceSeqNumber` w modelu `Contract`), ustawiany ręcznie w formularzu edycji umowy. Ten numer jest używany do generowania numeru rachunku (`Invoice.number`).

### Format: `MM/YYYY/NNN`

`NNN` = `invoiceSeqNumber` + offset typu:

| Typ     | Offset | Umowa seq=1 | Umowa seq=2 |
|---------|--------|-------------|-------------|
| RENT    | 0      | /001        | /002        |
| MEDIA   | 9      | /010        | /011        |
| OTHER   | 19     | /020        | /021        |

Każda umowa ma swój stały numer niezależnie od miesiąca. Offsety są hardcoded w `INVOICE_TYPE_OFFSET`.

### Implementacja

- `buildInvoiceNumber()` w `finance/actions.ts` i `media/[groupId]/actions.ts`
- Numer nadawany automatycznie przy `generateRents` (czynsz) i `processSettlement` (media)

## Import CSV

Wspierane banki: PKO BP, mBank, Santander, ING, Millenium. Dopasowanie po numerze konta (normalizacja: spacje, myslniki, prefiks PL).

## Google Sheets

Grupy rozliczeniowe z mapowaniami input/output (JSON). Workflow: zapis odczytow -> przeliczenie -> odczyt kwot -> rachunki MEDIA -> e-maile.
