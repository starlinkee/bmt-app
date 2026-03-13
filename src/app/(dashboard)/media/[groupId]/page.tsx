"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getSettlementGroup, getGroupInvoices, processSettlement } from "./actions";

const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function formatCurrency(n: number) {
  return n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

type Group = NonNullable<Awaited<ReturnType<typeof getSettlementGroup>>>;
type Invoice = Awaited<ReturnType<typeof getGroupInvoices>>[number];

type InputField = { label: string; range: string };
type OutputField = { tenantId: number; range: string };

export default function SettlementGroupPage() {
  const params = useParams();
  const groupId = Number(params.groupId);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [group, setGroup] = useState<Group | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [lastOutputs, setLastOutputs] = useState<{ tenantId: number; amount: number }[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const [g, inv] = await Promise.all([
        getSettlementGroup(groupId),
        getGroupInvoices(groupId, month, year),
      ]);
      setGroup(g);
      setInvoices(inv);
    });
  }

  useEffect(() => { load(); }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!group) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  const inputMapping: InputField[] = (() => {
    try { return JSON.parse(group.inputMappingJSON); } catch { return []; }
  })();

  const outputMapping: OutputField[] = (() => {
    try { return JSON.parse(group.outputMappingJSON); } catch { return []; }
  })();

  const tenantMap = new Map(
    group.property.tenants.map((t) => [t.id, `${t.firstName} ${t.lastName}`])
  );

  async function handleProcess() {
    const result = await processSettlement(groupId, inputValues, month, year);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.created === 0 && result.skipped && result.skipped > 0) {
      toast.info(
        `Faktury media za ${MONTHS[month - 1]} ${year} już istnieją (${result.skipped} pominięto).`
      );
    } else {
      toast.success(
        `Utworzono ${result.created} faktur media za ${MONTHS[month - 1]} ${year}.` +
        (result.skipped ? ` Pominięto ${result.skipped} (już istniały).` : "")
      );
    }

    setLastOutputs(result.outputs ?? null);
    load();
  }

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/media">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{group.property.address}</p>
        </div>
      </div>

      {/* Period selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rozliczenie mediów</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
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
          </div>

          {/* Dynamic input fields */}
          {inputMapping.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Dane wejściowe
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {inputMapping.map((field) => (
                  <div key={field.range} className="flex flex-col gap-1.5">
                    <Label>{field.label}</Label>
                    <Input
                      type="text"
                      value={inputValues[field.label] ?? ""}
                      onChange={(e) =>
                        setInputValues((prev) => ({
                          ...prev,
                          [field.label]: e.target.value,
                        }))
                      }
                      placeholder={`Wartość dla: ${field.label}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Zakres: {field.range}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output mapping info */}
          {outputMapping.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Mapowanie wyjściowe ({outputMapping.length} najemców)
              </h3>
              <div className="flex flex-wrap gap-2">
                {outputMapping.map((m) => (
                  <Badge key={m.tenantId} variant="secondary">
                    {tenantMap.get(m.tenantId) ?? `ID ${m.tenantId}`} → {m.range}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleProcess} disabled={isPending}>
            <Zap className="mr-2 h-4 w-4" />
            Rozlicz media za {MONTHS[month - 1]} {year}
          </Button>
        </CardContent>
      </Card>

      {/* Last settlement results */}
      {lastOutputs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wyniki ostatniego rozliczenia</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Najemca</TableHead>
                  <TableHead className="text-right">Kwota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastOutputs.map((o) => (
                  <TableRow key={o.tenantId}>
                    <TableCell>
                      {tenantMap.get(o.tenantId) ?? `ID ${o.tenantId}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(o.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Existing invoices for this period */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p>Brak faktur media za {MONTHS[month - 1]} {year} dla tej grupy.</p>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium">
              Faktury media za {MONTHS[month - 1]} {year}
            </span>
            <Badge variant="secondary">{invoices.length}</Badge>
            <span className="text-sm text-muted-foreground">
              Suma: {formatCurrency(totalAmount)}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Najemca</TableHead>
                <TableHead className="text-right">Kwota</TableHead>
                <TableHead>Data wystawienia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {inv.tenant.firstName} {inv.tenant.lastName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(inv.amount)}
                  </TableCell>
                  <TableCell>
                    {new Date(inv.createdAt).toLocaleDateString("pl-PL")}
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
