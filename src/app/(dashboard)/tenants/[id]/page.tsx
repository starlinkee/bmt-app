"use client";

import { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, RefreshCw, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { getTenantDetail, createAdjustment } from "./actions";

type TenantDetail = NonNullable<Awaited<ReturnType<typeof getTenantDetail>>>;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function AdjustmentDialog({
  tenantId,
  onSuccess,
}: {
  tenantId: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      setError("Podaj prawidłową kwotę (różną od 0).");
      return;
    }
    if (description.trim().length < 10) {
      setError("Opis musi mieć minimum 10 znaków.");
      return;
    }

    startTransition(async () => {
      try {
        await createAdjustment({
          tenantId,
          amount: numAmount,
          description,
          date,
        });
        setOpen(false);
        setAmount("");
        setDescription("");
        setDate(new Date().toISOString().slice(0, 10));
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił błąd.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <SlidersHorizontal className="mr-2 h-4 w-4" />
        Dodaj korektę
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj korektę</DialogTitle>
          <DialogDescription>
            Kwota dodatnia (+) = umorzenie/nadpłata. Kwota ujemna (−) = kara/dopłata.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="adj-amount">Kwota (PLN)</Label>
            <Input
              id="adj-amount"
              type="number"
              step="0.01"
              placeholder="np. 100 lub -50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adj-description">Opis (min. 10 znaków)</Label>
            <Input
              id="adj-description"
              type="text"
              placeholder="Powód korekty..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adj-date">Data</Label>
            <Input
              id="adj-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Zapisywanie..." : "Zapisz korektę"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tenantId = Number(id);
  const [data, setData] = useState<TenantDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await getTenantDetail(tenantId);
      if (!result) {
        setNotFound(true);
        return;
      }
      setData(result);
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/tenants" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Powrót do najemców
        </Link>
        <p className="text-muted-foreground">Najemca nie został znaleziony.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/tenants" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Powrót do najemców
        </Link>
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  const { tenant, balance, statement } = data;
  const activeContract = tenant.contracts[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tenants" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tenant.property.address1}{tenant.property.address2 ? `, ${tenant.property.address2}` : ""} ({tenant.property.type})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdjustmentDialog tenantId={tenantId} onSuccess={load} />
          <Button variant="outline" size="sm" onClick={load} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {balance > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : balance < 0 ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
              <span
                className={`text-2xl font-bold ${
                  balance > 0
                    ? "text-green-600"
                    : balance < 0
                    ? "text-red-600"
                    : ""
                }`}
              >
                {formatCurrency(balance)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktywna umowa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeContract ? (
              <div>
                <span className="text-2xl font-bold">
                  {formatCurrency(activeContract.rentAmount)}
                </span>
                <span className="text-sm text-muted-foreground"> / mies.</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Brak aktywnej umowy</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Operacje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{statement.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Statement table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Wyciąg</h2>
        {statement.length === 0 ? (
          <p className="text-muted-foreground">
            Brak operacji. Faktury i wpłaty pojawią się tutaj.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Opis</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead className="text-right">Kwota</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.map((entry) => (
                <TableRow key={`${entry.entryType}-${entry.id}`}>
                  <TableCell className="text-sm">
                    {formatDate(entry.date)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {entry.description}
                  </TableCell>
                  <TableCell>
                    {entry.entryType === "invoice" ? (
                      <Badge variant="outline">{entry.invoiceType}</Badge>
                    ) : entry.transactionType === "ADJUSTMENT" ? (
                      <Badge variant="secondary" className="border-amber-300 bg-amber-50 text-amber-700">
                        <SlidersHorizontal className="mr-1 h-3 w-3" />
                        KOREKTA
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{entry.transactionType}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`flex items-center justify-end gap-1 text-sm font-medium ${
                        entry.amount > 0
                          ? "text-green-600"
                          : entry.amount < 0
                          ? "text-red-600"
                          : ""
                      }`}
                    >
                      {entry.amount > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {formatCurrency(Math.abs(entry.amount))}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(entry.runningBalance)}
                  </TableCell>
                  <TableCell>
                    {entry.entryType === "invoice" && (
                      <InvoiceStatusBadge isPaid={entry.isPaid ?? false} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
