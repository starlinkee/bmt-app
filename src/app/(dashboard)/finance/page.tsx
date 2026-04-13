"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, CheckCircle2, AlertCircle, Mail, MailX } from "lucide-react";
import { toast } from "sonner";
import { generateRents, getGeneratedRents, getFinanceStats, getRentPreview } from "./actions";

const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function formatCurrency(n: number) {
  return n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

type RentInvoice = Awaited<ReturnType<typeof getGeneratedRents>>[number];
type Stats = Awaited<ReturnType<typeof getFinanceStats>>;
type PreviewTenant = Awaited<ReturnType<typeof getRentPreview>>[number];

export default function FinancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rents, setRents] = useState<RentInvoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewTenant[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  function load() {
    startTransition(async () => {
      const [r, s] = await Promise.all([
        getGeneratedRents(month, year),
        getFinanceStats(),
      ]);
      setRents(r);
      setStats(s);
    });
  }

  useEffect(() => { load(); }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClickGenerate() {
    setLoadingPreview(true);
    const data = await getRentPreview(month, year);
    setPreview(data);
    setLoadingPreview(false);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    const result = await generateRents(month, year);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.created === 0) {
      toast.info(`Wszystkie czynsze za ${MONTHS[month - 1]} ${year} zostały już wystawione (${result.skipped} umów).`);
    } else {
      toast.success(
        `Wystawiono ${result.created} czynszów za ${MONTHS[month - 1]} ${year}.` +
        (result.skipped > 0 ? ` Pominięto ${result.skipped} (już istniały).` : "") +
        ((result.emailsSent ?? 0) > 0 ? ` Wysłano ${result.emailsSent} e-maili.` : "")
      );
    }
    load();
  }

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const totalAmount = rents.reduce((sum, r) => sum + r.amount, 0);
  const withEmail = preview.filter((t) => t.email);
  const withoutEmail = preview.filter((t) => !t.email);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Wystawienie czynszu</h1>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Potwierdź wystawienie czynszów</DialogTitle>
            <DialogDescription>
              Zostaną wystawione czynsze za <strong>{MONTHS[month - 1]} {year}</strong> dla {preview.length} najemców.
            </DialogDescription>
          </DialogHeader>

          {preview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Wszyscy najemcy mają już wystawione czynsze za ten okres.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {withEmail.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    Otrzymają e-mail ({withEmail.length})
                  </div>
                  <ul className="flex flex-col gap-0.5 pl-1">
                    {withEmail.map((t) => (
                      <li key={t.id} className="text-sm">
                        {t.name} <span className="text-muted-foreground">— {t.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {withoutEmail.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <MailX className="h-4 w-4" />
                    Bez e-maila ({withoutEmail.length})
                  </div>
                  <ul className="flex flex-col gap-0.5 pl-1">
                    {withoutEmail.map((t) => (
                      <li key={t.id} className="text-sm text-muted-foreground">
                        {t.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleConfirm} disabled={preview.length === 0}>
              <Receipt className="mr-2 h-4 w-4" />
              Wystaw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktywne umowy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.activeContracts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Czynsze za {MONTHS[month - 1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{rents.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suma czynszów
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Month/year selector + generate button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generowanie czynszów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Miesiąc</span>
              <Select
                value={month.toString()}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Rok</span>
              <Select
                value={year.toString()}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleClickGenerate} disabled={isPending || loadingPreview}>
              <Receipt className="mr-2 h-4 w-4" />
              {loadingPreview ? "Ładowanie..." : `Wystaw czynsze za ${MONTHS[month - 1]} ${year}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List of generated rents */}
      {rents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p>Brak czynszów za {MONTHS[month - 1]} {year}.</p>
          <p className="text-sm">Użyj przycisku powyżej, aby wystawić czynsze.</p>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">
              Wystawione czynsze za {MONTHS[month - 1]} {year}
            </span>
            <Badge variant="secondary">{rents.length}</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr</TableHead>
                <TableHead>Najemca</TableHead>
                <TableHead>Nieruchomość</TableHead>
                <TableHead className="text-right">Kwota</TableHead>
                <TableHead>Data wystawienia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rents.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.number || "—"}</TableCell>
                  <TableCell className="font-medium">
                    {r.tenant.firstName} {r.tenant.lastName}
                  </TableCell>
                  <TableCell>{r.tenant.property.address}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.amount)}
                  </TableCell>
                  <TableCell>
                    {new Date(r.createdAt).toLocaleDateString("pl-PL")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
