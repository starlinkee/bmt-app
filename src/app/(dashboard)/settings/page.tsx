"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getAppConfig, updateAppConfig } from "./actions";

type AppConfig = Awaited<ReturnType<typeof getAppConfig>>;

const DEFAULT_MAPPING = JSON.stringify(
  [
    { range: "numer_rachunku",    value: "{numer_rachunku}" },
    { range: "miejsce_wystawienia", value: "" },
    { range: "data_wystawienia",  value: "{data_wystawienia}" },
    { range: "termin_platnosci",  value: "{termin_platnosci}" },
    { range: "nabywca_nazwa",     value: "{najemca}" },
    { range: "nabywca_adres_1",   value: "{adres}" },
    { range: "nabywca_adres_2",   value: "" },
    { range: "nabywca_nip",       value: "" },
    { range: "sprzedawca_nazwa",  value: "" },
    { range: "sprzedawca_adres_1", value: "" },
    { range: "sprzedawca_adres_2", value: "" },
    { range: "rachunek_docelowy", value: "" },
    { range: "opis_rachunku",     value: "Czynsz za {miesiac} {rok}" },
    { range: "do_zaplaty",        value: "{kwota}" },
    { range: "do_zaplaty_slownie", value: "{kwota_slownie}" },
  ],
  null,
  2
);

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setConfig(await getAppConfig());
    });
  }, []);

  async function handleSubmit(formData: FormData) {
    const result = await updateAppConfig(formData);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Ustawienia zapisane.");
    startTransition(async () => {
      setConfig(await getAppConfig());
    });
  }

  if (!config) {
    return <p className="text-muted-foreground">Ładowanie...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ustawienia</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Szablon rachunku czynszu (PDF)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentInvoiceSpreadsheetId">ID arkusza Google (szablon)</Label>
              <Input
                id="rentInvoiceSpreadsheetId"
                name="rentInvoiceSpreadsheetId"
                defaultValue={config.rentInvoiceSpreadsheetId}
                placeholder="np. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                key={config.rentInvoiceSpreadsheetId}
              />
              <p className="text-xs text-muted-foreground">
                Zostaw puste, jeśli nie chcesz załączać PDF do rachunków.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentInvoiceInputMappingJSON">
                Mapowanie danych do arkusza (JSON)
              </Label>
              <textarea
                id="rentInvoiceInputMappingJSON"
                name="rentInvoiceInputMappingJSON"
                className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 font-mono"
                defaultValue={
                  config.rentInvoiceInputMappingJSON === "[]"
                    ? DEFAULT_MAPPING
                    : config.rentInvoiceInputMappingJSON
                }
                key={config.rentInvoiceInputMappingJSON}
              />
              <p className="text-xs text-muted-foreground">
                Tablica obiektów: <code>range</code> (nazwa named range w arkuszu) +{" "}
                <code>value</code> (wartość statyczna lub z placeholderami{" "}
                <code>{"{"}</code>...<code>{"}"}</code>).<br />
                Dostępne placeholdery:{" "}
                <code>{"{numer_rachunku}"}</code>,{" "}
                <code>{"{najemca}"}</code>,{" "}
                <code>{"{adres}"}</code>,{" "}
                <code>{"{miesiac}"}</code>,{" "}
                <code>{"{rok}"}</code>,{" "}
                <code>{"{kwota}"}</code>,{" "}
                <code>{"{kwota_slownie}"}</code>,{" "}
                <code>{"{data_wystawienia}"}</code>,{" "}
                <code>{"{termin_platnosci}"}</code>.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentInvoicePdfGid">GID arkusza (opcjonalnie)</Label>
              <Input
                id="rentInvoicePdfGid"
                name="rentInvoicePdfGid"
                defaultValue={config.rentInvoicePdfGid}
                placeholder="np. 0 (domyślnie: cały plik)"
                key={config.rentInvoicePdfGid}
              />
              <p className="text-xs text-muted-foreground">
                ID konkretnej zakładki do eksportu. Znajdziesz go w URL arkusza po{" "}
                <code>#gid=</code>. Zostaw puste, żeby eksportować cały plik.
              </p>
            </div>

            <Button type="submit" disabled={isPending} className="w-fit">
              Zapisz ustawienia
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
