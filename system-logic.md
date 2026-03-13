# Specyfikacja Logiki Systemu: System Zarządzania Wynajmem

## 1. Koncepcja "Skarbonki" (Saldo Portfela)
System rezygnuje z tradycyjnego parowania transakcji 1:1 z fakturami na rzecz dynamicznego rozliczania salda.

* **Matematyka Salda:** `Saldo = Suma(Transaction.amount) - Suma(Invoice.amount)`.
* **Logika wyświetlania:**
    * Faktury i Wpłaty są wyświetlane chronologicznie na jednym wyciągu (jak w banku).
    * Status "Opłacony" na fakturze jest symulowany: Jeśli `Saldo >= 0`, wszystkie faktury są zielone. Jeśli `Saldo < 0`, najstarsze faktury są oznaczane jako zaległe do momentu pokrycia długu przez sumę wpłat.
* **Zaleta:** Obsługa nadpłat, niedopłat i płatności częściowych nie wymaga żadnego dodatkowego kodu logiki biznesowej.

---

## 2. Proces Obsługi Płatności (Bank CSV)
Automatyzacja identyfikacji najemców przy zachowaniu pełnej kontroli użytkownika.

1.  **Import:** Użytkownik wgrywa plik CSV. System parsuje dane (kwota, data, tytuł, numer konta).
2.  **Identyfikacja:**
    * System szuka numeru konta w polu `Tenant.bankAccountsAsText`.
    * Jeśli znajdzie dopasowanie: Tworzy rekord `Transaction` ze statusem `MATCHED`.
    * Jeśli nie znajdzie: Tworzy rekord `Transaction` ze statusem `UNMATCHED`.
3.  **Moduł Uzgadniania (Reconciliation):**
    * Widok dla wspólnika wyświetla listę `UNMATCHED`.
    * Wspólnik ręcznie wybiera najemcę z listy rozwijanej.
    * **Automatyczne uczenie:** Po ręcznym przypisaniu system pyta: *"Czy zapamiętać ten numer konta dla [Najemca]?"*. Jeśli tak, dopisuje numer do pola `bankAccountsAsText`.

---

## 3. Silnik Obliczeniowy Mediów (Hybrid API)
Wykorzystanie Google Sheets jako silnika reguł (Business Rules Engine).

1.  **Wyzwalanie:** Użytkownik wybiera `SettlementGroup`.
2.  **Formularz:** UI generuje pola na podstawie `inputMappingJSON` (np. "Odczyt licznika prądu").
3.  **Proces API:**
    * Zapis wartości do arkusza (Nazwane Zakresy).
    * Wymuszenie przeliczenia (Sheet recalculation).
    * Odczyt wyników z `outputMappingJSON`.
4.  **Finalizacja:** System tworzy rekordy `Invoice` dla każdego lokalu w grupie i zapisuje ścieżkę do wgranej faktury źródłowej w polu `sourceFilePath`.

---

## 4. Obsługa Sytuacji Niestandardowych (Korekty)
Umożliwienie nietechnicznemu wspólnikowi zarządzania wyjątkami bez edycji bazy danych.

* **Typ ADJUSTMENT:** Każda niestandardowa operacja (umorzenie długu, kara, wpłata gotówkowa) jest nowym rekordem w tabeli `Transaction`.
* **Reguła wpisu:**
    * Umorzenie/Rabat: Kwota dodatnia (zwiększa saldo najemcy, niwelując dług).
    * Kara/Dopłata: Kwota ujemna (zmniejsza saldo najemcy).
* **Wymóg audytu:** Pole `description` jest obowiązkowe dla korekt, aby zachować ślad decyzji wspólnika.

---

## 5. Cykl Miesięczny i Automatyzacja
* **Generowanie Czynszów:** Przycisk "Wystaw czynsze" sprawdza tabelę `Contract`. Tworzy `Invoice` o typie `RENT` dla każdego aktywnego kontraktu.
* **Zabezpieczenie:** System sprawdza unikalny klucz (np. `tenant_id + month + year`), aby uniknąć podwójnego naliczenia czynszu przy wielokrotnym kliknięciu.

---

## 6. Bezpieczeństwo i Backup danych
* **Lokalizacja:** Wszystkie dane (`dev.db` oraz `/uploads`) znajdują się w folderze `/app_data`.
* **Automatyzacja Backup:** Raz na dobę skrypt tworzy bezpieczną kopię bazy (`sqlite3 .backup`), pakuje ją z załącznikami do `.zip` i wysyła do chmury (Google Drive API).