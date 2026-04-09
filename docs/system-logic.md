# Logika systemu: BMT - System Zarządzania Wynajmem

## 1. Model "Skarbonki" (saldo portfela)

System rezygnuje z parowania transakcji 1:1 z rachunkami na rzecz dynamicznego rozliczania salda.

**Matematyka:**
```
Saldo = Suma(Transaction.amount) - Suma(Invoice.amount)
```

**Wyswietlanie:**
- Rachunki i wplaty pokazywane chronologicznie na jednym wyciagu (jak w banku)
- Status "Oplacony" jest symulowany: jesli saldo >= 0, wszystkie rachunki sa zielone. Jesli saldo < 0, najstarsze rachunki oznaczane jako zalegle do pokrycia dlugu
- Nadplaty, niedoplaty i platnosci czesciowe nie wymagaja dodatkowej logiki

---

## 2. Numeracja rachunkow

Format: `MM/YYYY/NNN`

`NNN` = `invoiceSeqNumber` najemcy + offset typu:

| Typ | Offset | Najemca seq=1 | Najemca seq=2 |
|---|---|---|---|
| RENT | 0 | /001 | /002 |
| MEDIA | 9 | /010 | /011 |
| OTHER | 19 | /020 | /021 |

- Numer porządkowy (`invoiceSeqNumber`) ustawiany recznie w formularzu najemcy
- Kazdy najemca ma staly numer niezaleznie od miesiaca
- Offsety hardcoded w `INVOICE_TYPE_OFFSET`
- Implementacja: `buildInvoiceNumber()` w `finance/actions.ts` i `media/[groupId]/actions.ts`

---

## 3. Obsluga platnosci (import CSV)

### Wspierane banki
PKO BP, mBank, Santander, ING, Millenium

### Proces

1. **Import:** Uzytkownik wgrywa CSV. Parser rozpoznaje bank z naglowkow i parsuje dane (kwota, data, tytul, numer konta)
2. **Dopasowanie:**
   - System szuka numeru konta w polu `Tenant.bankAccountsAsText`
   - Normalizacja: usuniecie spacji, myslnikow, prefiksu PL
   - Dopasowanie: dokladne, po sufiksie lub czesciowe
   - Wynik: `MATCHED` (znaleziono najemce) lub `UNMATCHED`
3. **Uzgadnianie (Reconciliation):**
   - Widok listy niedopasowanych transakcji
   - Reczny wybor najemcy z listy rozwijanej
   - Opcja: "Zapamietac ten numer konta?" -> dopisanie do `bankAccountsAsText`

---

## 4. Silnik obliczeniowy mediow (Google Sheets)

Wykorzystanie Google Sheets jako zewnetrznego silnika regul obliczeniowych.

### Konfiguracja grupy rozliczeniowej

- **inputMappingJSON:** mapowanie pol formularza na zakresy w arkuszu (np. `{"Odczyt pradu": "B2", "Kwota faktury": "B3"}`)
- **outputMappingJSON:** mapowanie zakresow arkusza na najemcow (np. `{"C10": 1, "C11": 2}` - komorka -> tenantId)
- **spreadsheetId:** ID arkusza Google

### Proces rozliczenia

1. Uzytkownik wybiera grupe i wpisuje wartosci wejsciowe (np. odczyty licznikow)
2. System zapisuje wartosci do arkusza (Google Sheets API)
3. Wymuszenie przeliczenia arkusza (`triggerRecalc`)
4. Odczyt kwot per najemca z outputMapping
5. Utworzenie rachunkow `Invoice` (typ MEDIA) z numeracja MM/YYYY/NNN
6. Wysylka e-maili z rachunkami

---

## 5. Cykl miesiczny - generowanie czynszow

1. Uzytkownik wybiera miesiac/rok i klika "Wystaw czynsze"
2. System czyta aktywne umowy (`Contract.isActive = true`)
3. Dla kazdej umowy tworzy `Invoice` typu RENT
4. Zabezpieczenie: unikalny klucz `(tenantId, type, month, year)` zapobiega duplikatom
5. Jesli najemca ma adres e-mail - wysylka rachunku automatycznie

---

## 6. Korekty (Adjustments)

Nietechniczny wspolnik moze zarzadzac wyjatkami bez edycji bazy danych.

- **Typ ADJUSTMENT** w tabeli Transaction
- Kwota dodatnia: umorzenie/rabat (zwieksza saldo, niweluje dlug)
- Kwota ujemna: kara/doplata (zmniejsza saldo)
- Pole `description` obowiazkowe (min. 10 znakow) - slad audytowy decyzji

---

## 7. Wyciag najemcy (Statement)

Chronologiczny widok wszystkich operacji na koncie najemcy:

- Rachunki (Invoice) wyswietlane jako obciazenia (kwota ujemna)
- Transakcje (Transaction) wyswietlane jako uznania (kwota dodatnia)
- Narastajace saldo przy kazdej pozycji
- Symulacja statusu oplacenia: najstarsze rachunki pokrywane jako pierwsze

---

## 8. Uwierzytelnianie

- Logowanie jednym haslem (`APP_PASSWORD` w .env, bcrypt hash)
- NextAuth z providerem Credentials
- Sesja JWT, waznosc 30 dni
- Brak rol uzytkownikow - wszyscy maja pelny dostep
- Chronione trasy: caly dashboard pod `(dashboard)` layout

---

## 9. E-maile

- Gmail SMTP przez Nodemailer
- Dwa szablony HTML:
  - **Rachunek czynszowy:** numer rachunku, okres, nieruchomosc, kwota
  - **Rachunek za media:** numer rachunku, grupa rozliczeniowa, kwota
- Wysylka automatyczna przy generowaniu rachunkow (jesli najemca ma e-mail)
- Zwraca boolean sukcesu/porazki

---

## 10. Backup i bezpieczenstwo danych

- Dane w folderze `/app_data` (wykluczone z Git)
- Snapshot bazy: `sqlite3 .backup`
- Archiwizacja: codzienne pakowanie `/app_data` do `.zip`
- Eksport do chmury: Google Drive API (skrypt cron)
