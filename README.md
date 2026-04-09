# BMT - System Zarządzania Wynajmem

Aplikacja webowa do zarządzania nieruchomościami, najemcami, umowami i rozliczeniami finansowymi. Zbudowana z myślą o polskim rynku wynajmu.

## Stack technologiczny

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Baza danych:** SQLite via Prisma ORM
- **UI:** Tailwind CSS + shadcn/ui
- **Integracje:** Google Sheets API v4, Gmail SMTP (Nodemailer), NextAuth
- **Deploy:** GitHub Actions -> VPS (pm2)

## Funkcje

| Modul | Opis |
|---|---|
| **Nieruchomosci** | CRUD nieruchomosci (mieszkania, lokale uslugowe, garaze) |
| **Najemcy** | Zarzadzanie najemcami, numery kont bankowych, numer porzadkowy rachunku |
| **Umowy** | Umowy najmu z kwota czynszu, datami i statusem aktywnosci |
| **Finanse** | Generowanie rachunkow czynszowych + automatyczne e-maile |
| **Media** | Rozliczenia mediow przez Google Sheets (odczyty -> przeliczenie -> rachunki) |
| **Import CSV** | Import wyciagow bankowych (PKO BP, mBank, Santander, ING, Millenium) |
| **Uzgadnianie** | Reczne dopasowanie niedopasowanych transakcji do najemcow |
| **Wyciag najemcy** | Chronologiczny wyciag operacji z narastajacym saldem |

## Model finansowy

System stosuje model **"skarbonki"** zamiast parowania transakcji 1:1:

```
Saldo = Suma(Transakcje) - Suma(Rachunki)
```

Nadplaty, niedoplaty i platnosci czesciowe rozliczaja sie naturalnie. Status oplacenia rachunkow jest symulowany - najstarsze rachunki pokrywane jako pierwsze.

## Numeracja rachunkow

Format: `MM/YYYY/NNN`, gdzie `NNN` = `invoiceSeqNumber` najemcy + offset typu:

| Typ | Offset | Przyklad (seq=1) |
|---|---|---|
| RENT | 0 | 04/2026/001 |
| MEDIA | 9 | 04/2026/010 |
| OTHER | 19 | 04/2026/020 |

## Uruchomienie

```bash
# Instalacja zaleznosci
npm install

# Inicjalizacja bazy danych
npx prisma migrate dev

# Seed (opcjonalnie)
npm run seed

# Serwer deweloperski
npm run dev
```

Aplikacja dostepna pod `http://localhost:3000`.

## Zmienne srodowiskowe

| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | Sciezka do pliku SQLite |
| `NEXTAUTH_URL` | URL aplikacji |
| `NEXTAUTH_SECRET` | Secret dla NextAuth |
| `APP_PASSWORD` | Haslo logowania (bcrypt hash) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Dane konta serwisowego Google |
| `GMAIL_USER` | Adres Gmail do wysylki e-maili |
| `GMAIL_APP_PASSWORD` | Haslo aplikacji Gmail |

## Struktura danych

```
app_data/              # Wykluczone z Git
  database/dev.db      # Baza danych SQLite
  uploads/sources/     # Skany faktur od dostawcow
  uploads/invoices/    # Wygenerowane rachunki PDF
```

## Skrypty

| Komenda | Opis |
|---|---|
| `npm run dev` | Serwer deweloperski |
| `npm run build` | Build produkcyjny |
| `npm run start` | Serwer produkcyjny |
| `npm run seed` | Seed bazy danych |
| `npm run lint` | ESLint |
