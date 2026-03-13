# Dokumentacja Architektury: System Zarządzania Wynajmem (Skarbonka)

## 1. Stos Technologiczny (Tech Stack)

| Warstwa | Technologia | Uzsadnienie |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | Łączy frontend z backendem, wspiera Server Actions. |
| **Język** | TypeScript | Zapewnia typowanie danych finansowych i minimalizuje błędy. |
| **Baza Danych** | SQLite (Prisma ORM) | Plikowa baza danych (`dev.db`), idealna pod backup i prostotę. |
| **UI & Styling** | Tailwind CSS + shadcn/ui | Szybkie budowanie czystego i profesjonalnego interfejsu. |
| **Integracje** | Google Sheets API v4 | Zewnętrzny silnik obliczeniowy dla skomplikowanych mediów. |
| **Płatności** | CSV Parser | Moduł do importu wyciągów bankowych. |

---

## 2. Model Danych (Schema Prisma)

System opiera się na **relacji saldowej**. Głównym punktem odniesienia jest Najemca i jego suma wpłat oraz obciążeń.

* **Property**: Dane o nieruchomości (adres, typ lokalu).
* **Tenant**: Dane najemcy, przypisanie do lokalu, historia salda.
* **Contract**: Definicja czynszu (kwota stała, data rozpoczęcia/zakończenia).
* **Invoice (Obciążenia -)**: Dokumenty naliczające dług (Czynsz, Media, Inne opłaty).
* **Transaction (Uznania +)**: Wpływy (Bank, Gotówka) oraz **Korekty (Adjustments)**.
* **SettlementGroup**: Konfiguracja łączności z arkuszami Google dla konkretnych budynków.

---

## 3. Struktura Plików i Przechowywanie Danych

Aplikacja izoluje kod od danych użytkownika, co ułatwia bezpieczne wdrażanie i backupy.

### Folder `/app_data` (Wykluczony z Git)
1.  **/database/dev.db**: Główny plik bazy danych SQLite.
2.  **/uploads/sources/**: Skany i PDF-y faktur od dostawców (prąd, woda itp.).
3.  **/uploads/invoices/**: Wygenerowane przez system rachunki PDF dla najemców.

### Bezpieczeństwo (Backup Strategy)
* **Snapshot**: Użycie komendy `sqlite3 .backup` dla zachowania spójności bazy.
* **Archive**: Codzienne pakowanie folderu `/app_data` do formatu `.zip`.
* **Cloud Export**: Automatyczna wysyłka archiwum na Google Drive lub S3 przy użyciu skryptu typu Cron.

---

## 4. Integracja z Google Sheets (Kalkulator)

Aplikacja pełni rolę interfejsu sterującego dla Excela w chmurze:
* **Dane Wejściowe**: Użytkownik wpisuje wartości (licznik, kwota faktury) w UI Next.js.
* **Przetwarzanie**: System wysyła dane do **Nazwanych Zakresów** w Google Sheets przez Konto Serwisowe.
* **Dane Wyjściowe**: Po przeliczeniu, system pobiera gotowe kwoty dla najemców i zapisuje je jako rekordy `Invoice`.
* **Elastyczność**: Współpracownik może zmieniać wzory w Excelu bez ingerencji w kod aplikacji.

---

## 5. Kluczowe Założenia Inżynieryjne
* **Single Source of Truth**: Baza danych SQLite jest jedynym miejscem przechowującym stan finansowy najemcy.
* **Idempotentność**: Generowanie czynszów nie może tworzyć duplikatów dla tego samego okresu.
* **Audytowalność**: Każda ręczna zmiana (Korekta) musi mieć zapisaną notatkę tekstową o przyczynie jej powstania.