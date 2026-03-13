"use client";

import { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
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
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { getTenantDetail } from "./actions";

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
              {tenant.property.address} ({tenant.property.type})
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Odśwież
        </Button>
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
