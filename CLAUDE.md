# BMT App

Aplikacja do zarządzania nieruchomościami, najemcami i rozliczeniami.

## Stack

- Next.js (App Router), Prisma + SQLite, Tailwind CSS + shadcn/ui
- Google Sheets API (rozliczenia mediów)
- Deploy: GitHub Actions → VPS (pm2)

## Numeracja rachunków

Każdy najemca ma stały **numer porządkowy** (`invoiceSeqNumber` w modelu `Tenant`), ustawiany ręcznie w formularzu edycji najemcy. Ten numer jest używany do generowania numeru rachunku (`Invoice.number`).

### Format: `MM/YYYY/NNN`

`NNN` = `invoiceSeqNumber` + offset typu:

| Typ     | Offset | Najemca seq=1 | Najemca seq=2 |
|---------|--------|----------------|----------------|
| RENT    | 0      | /001           | /002           |
| MEDIA   | 9      | /010           | /011           |
| OTHER   | 19     | /020           | /021           |

Każdy najemca zawsze dostaje ten sam numer niezależnie od miesiąca. Offsety są hardcoded w `INVOICE_TYPE_OFFSET`.

### Implementacja

- `buildInvoiceNumber()` w `finance/actions.ts` i `media/[groupId]/actions.ts`
- Numer nadawany automatycznie przy `generateRents` (czynsz) i `processSettlement` (media)
