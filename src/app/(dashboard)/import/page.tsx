"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { importCsvTransactions, getImportStats, getRecentImports } from "./actions";

function formatCurrency(n: number) {
  return n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

type Stats = Awaited<ReturnType<typeof getImportStats>>;
type RecentTx = Awaited<ReturnType<typeof getRecentImports>>[number];

export default function ImportPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const [s, r] = await Promise.all([getImportStats(), getRecentImports()]);
      setStats(s);
      setRecentTxs(r);
    });
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Proszę wybrać plik CSV.");
      return;
    }

    const text = await file.text();
    if (!text.trim()) {
      toast.error("Plik jest pusty.");
      return;
    }

    const result = await importCsvTransactions(text);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `Zaimportowano ${result.created} transakcji z ${result.bankName}. ` +
        `Dopasowane: ${result.matched}, Niedopasowane: ${result.unmatched}` +
        (result.skipped > 0 ? `, Pominięte: ${result.skipped}` : "")
    );
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Import CSV</h1>
        {stats && stats.totalUnmatched > 0 && (
          <Link href="/import/reconcile">
            <Button variant="outline">
              <AlertCircle className="mr-2 h-4 w-4" />
              Uzgodnij ({stats.totalUnmatched})
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wszystkie transakcje bankowe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalBank}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dopasowane
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.totalMatched}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Niedopasowane
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{stats.totalUnmatched}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drag & drop upload area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wgraj wyciąg bankowy</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            {isDragOver ? (
              <>
                <FileUp className="h-12 w-12 text-primary" />
                <p className="text-lg font-medium text-primary">
                  Upuść plik tutaj
                </p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-lg font-medium">
                    Przeciągnij plik CSV lub kliknij, aby wybrać
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Obsługiwane banki: PKO BP, mBank, Santander, ING, Millenium
                  </p>
                </div>
                <label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Button variant="outline" asChild disabled={isPending}>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Wybierz plik
                    </span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent imports table */}
      {recentTxs.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium">Ostatnie transakcje</span>
            <Badge variant="secondary">{recentTxs.length}</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tytuł</TableHead>
                <TableHead>Konto</TableHead>
                <TableHead className="text-right">Kwota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Najemca</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTxs.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {new Date(tx.date).toLocaleDateString("pl-PL")}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate">
                    {tx.title}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {tx.bankAccount
                      ? `...${tx.bankAccount.slice(-8)}`
                      : "-"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      tx.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.status === "MATCHED" ? "default" : "destructive"
                      }
                    >
                      {tx.status === "MATCHED"
                        ? "Dopasowana"
                        : "Niedopasowana"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tx.tenant
                      ? `${tx.tenant.firstName} ${tx.tenant.lastName}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {recentTxs.length === 0 && !isPending && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p>Brak zaimportowanych transakcji.</p>
          <p className="text-sm">Wgraj wyciąg bankowy w formacie CSV.</p>
        </div>
      )}
    </div>
  );
}
