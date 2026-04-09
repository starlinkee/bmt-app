# Architektura: BMT - System Zarządzania Wynajmem

## 1. Stos technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server Actions, SSR, routing oparty na plikach |
| **Jezyk** | TypeScript | Typowanie danych finansowych, minimalizacja bledow |
| **Baza danych** | SQLite (Prisma ORM) | Plikowa baza, latwy backup, prostota wdrozenia |
| **UI** | Tailwind CSS + shadcn/ui | Szybkie budowanie profesjonalnego interfejsu |
| **Uwierzytelnianie** | NextAuth (Credentials) | Logowanie jednym haslem, sesja JWT (30 dni) |
| **Integracje** | Google Sheets API v4 | Zewnetrzny silnik obliczeniowy dla mediow |
| **E-mail** | Nodemailer (Gmail SMTP) | Automatyczne wysylanie rachunkow |
| **CSV** | Wlasny parser | Import wyciagow z 5 polskich bankow |

---

## 2. Model danych (Prisma)

System opiera sie na **relacji saldowej** - glownym punktem odniesienia jest najemca i jego saldo (suma wplat minus suma rachunkow).

### Modele

| Model | Opis | Kluczowe pola |
|---|---|---|
| **Property** | Nieruchomosc | `address`, `type` (Mieszkanie/Lokal/Garaz), `name` |
| **Tenant** | Najemca | `firstName`, `lastName`, `email`, `phone`, `bankAccountsAsText`, `invoiceSeqNumber` |
| **Contract** | Umowa najmu | `rentAmount`, `startDate`, `endDate`, `isActive` |
| **Invoice** | Rachunek (obciazenie) | `type` (RENT/MEDIA/OTHER), `number`, `amount`, `month`, `year` |
| **Transaction** | Transakcja (uznanie) | `type` (BANK/CASH/ADJUSTMENT), `status` (MATCHED/UNMATCHED/MANUAL), `amount` |
| **SettlementGroup** | Grupa rozliczeniowa mediow | `spreadsheetId`, `inputMappingJSON`, `outputMappingJSON` |
| **SettlementGroupProperty** | Tabela laczaca grupy z nieruchomosciami | `settlementGroupId`, `propertyId` |

### Relacje

```
Property 1--* Tenant 1--* Contract
                    1--* Invoice
                    1--* Transaction

SettlementGroup *--* Property (przez SettlementGroupProperty)
```

### Ograniczenia

- `Invoice`: unikalny klucz `(tenantId, type, month, year)` - zapobiega duplikatom
- `Contract.isActive` - flaga aktywnosci umowy
- `Transaction.status` - sledzenie dopasowania transakcji bankowych

---

## 3. Struktura plikow

### Kod zrodlowy

```
src/
  app/
    (dashboard)/           # Layout z sidebarem (chroniony NextAuth)
      properties/          # CRUD nieruchomosci
      tenants/             # CRUD najemcow
        [id]/              # Szczegoly najemcy + wyciag
      contracts/           # CRUD umow
      finance/             # Generowanie rachunkow czynszowych
      media/               # Grupy rozliczeniowe mediow
        [groupId]/         # Rozliczenie konkretnej grupy
      import/              # Import CSV
        reconcile/         # Uzgadnianie transakcji
    login/                 # Strona logowania
    api/auth/[...nextauth]/ # NextAuth API
  components/
    ui/                    # shadcn/ui (button, card, dialog, table, ...)
    sidebar.tsx            # Nawigacja glowna (7 pozycji menu)
    invoice-status-badge.tsx # Badge oplacone/zalegle
  lib/
    auth.ts                # Konfiguracja NextAuth
    prisma.ts              # Singleton Prisma Client
    email.ts               # Szablony e-mail + Nodemailer
    csvParser.ts           # Parser CSV (5 bankow)
    matcher.ts             # Dopasowanie transakcji po numerze konta
    sheetsEngine.ts        # Google Sheets API (zapis/odczyt)
    balance.ts             # Obliczanie salda najemcy
    statement.ts           # Generowanie wyciagu operacji
    utils.ts               # cn() - Tailwind merge
```

### Dane uzytkownika (poza Git)

```
app_data/
  database/dev.db          # Baza danych SQLite
  uploads/sources/         # Skany faktur dostawcow
  uploads/invoices/        # Wygenerowane rachunki PDF
```

---

## 4. Przeplywy danych

### Generowanie czynszow (Finance)

```
Uzytkownik wybiera miesiac/rok
  -> generateRents() czyta aktywne Contract
  -> Tworzy Invoice (typ RENT) dla kazdego najemcy
  -> Sprawdza unikalnosc (tenant + typ + miesiac + rok)
  -> Wysyla e-mail z rachunkiem (jesli najemca ma adres)
```

### Rozliczenie mediow (Media)

```
Uzytkownik wybiera grupe i wpisuje odczyty
  -> processSettlement() zapisuje wartosci do Google Sheets
  -> Wymusza przeliczenie arkusza
  -> Odczytuje kwoty per najemca z outputMapping
  -> Tworzy Invoice (typ MEDIA) dla kazdego najemcy
  -> Wysyla e-maile z rachunkami
```

### Import transakcji bankowych

```
Uzytkownik wgrywa CSV
  -> csvParser rozpoznaje bank z naglowkow
  -> Parsuje transakcje (kwota, data, tytul, numer konta)
  -> matcher dopasowuje po numerze konta -> MATCHED/UNMATCHED
  -> Niedopasowane trafiaja do modulu uzgadniania
  -> Reczne przypisanie + opcjonalne zapamietanie konta
```

---

## 5. Zasady inzynieryjne

- **Single Source of Truth:** Baza SQLite jest jedynym zrodlem stanu finansowego
- **Idempotentnosc:** Generowanie rachunkow nie tworzy duplikatow (unikalny klucz)
- **Audytowalnosc:** Korekty wymagaja opisu tekstowego (min. 10 znakow)
- **Separacja danych:** Kod zrodlowy oddzielony od danych uzytkownika (`app_data/`)
- **Model skarbonki:** Saldo zamiast parowania 1:1 - eliminuje zlozona logike rozliczen
