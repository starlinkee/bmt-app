-- Data migration: split address1 into address1 (street) + address2 (postal code + city)
-- Splits at the last ", " separator.
-- Example: "ul. Marszałkowska 1, 00-001 Warszawa" -> address1="ul. Marszałkowska 1", address2="00-001 Warszawa"
-- Rows where address1 contains no ", " or address2 is already set are left unchanged.

UPDATE "Property"
SET
  address2 = TRIM(SUBSTR(address1, INSTR(address1, ', ') + 2)),
  address1 = TRIM(SUBSTR(address1, 1, INSTR(address1, ', ') - 1))
WHERE
  address2 IS NULL
  AND INSTR(address1, ', ') > 0;
