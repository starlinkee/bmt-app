"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, AlertCircle, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getUnmatchedTransactions,
  getAllTenants,
  reconcileTransaction,
  dismissTransaction,
} from "../actions";

function formatCurrency(n: number) {
  return n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

type UnmatchedTx = Awaited<ReturnType<typeof getUnmatchedTransactions>>[number];
type TenantOption = Awaited<ReturnType<typeof getAllTenants>>[number];

export default function ReconcilePage() {
  const [transactions, setTransactions] = useState<UnmatchedTx[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<
    Record<number, string>
  >({});
  const [confirmDialog, setConfirmDialog] = useState<{
    txId: number;
    tenantId: number;
    tenantName: string;
    bankAccount: string;
  } | null>(null);
  const [dismissDialog, setDismissDialog] = useState<{
    txId: number;
    title: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const [txs, ts] = await Promise.all([
        getUnmatchedTransactions(),
        getAllTenants(),
      ]);
      setTransactions(txs);
      setTenants(ts);
    });
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTenantSelect(txId: number, tenantId: string) {
    setSelectedTenants((prev) => ({ ...prev, [txId]: tenantId }));
  }

  function handleAssign(tx: UnmatchedTx) {
    const tenantIdStr = selectedTenants[tx.id];
    if (!tenantIdStr) {
      toast.error("Wybierz najemcę.");
      return;
    }

    const tenantId = Number(tenantIdStr);
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const tenantName = `${tenant.firstName} ${tenant.lastName}`;

    // If transaction has a bank account, show confirmation dialog
    if (tx.bankAccount) {
      setConfirmDialog({
        txId: tx.id,
        tenantId,
        tenantName,
        bankAccount: tx.bankAccount,
      });
    } else {
      // No bank account to save, just assign
      doReconcile(tx.id, tenantId, false);
    }
  }

  async function doDismiss(txId: number) {
    const result = await dismissTransaction(txId);
    setDismissDialog(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Transakcja odrzucona.");
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
  }

  async function doReconcile(
    txId: number,
    tenantId: number,
    saveAccount: boolean
  ) {
    const result = await reconcileTransaction(txId, tenantId, saveAccount);
    setConfirmDialog(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Transakcja została przypisana.");
    // Remove from local list
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    setSelectedTenants((prev) => {
      const next = { ...prev };
      delete next[txId];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/import">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Uzgadnianie transakcji</h1>
        <Badge variant="secondary">{transactions.length}</Badge>
      </div>

      {transactions.length === 0 && !isPending ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p className="text-lg font-medium text-foreground">
            Wszystkie transakcje są uzgodnione!
          </p>
          <p className="text-sm">
            Brak niedopasowanych transakcji do przypisania.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Niedopasowane transakcje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Konto nadawcy</TableHead>
                  <TableHead className="text-right">Kwota</TableHead>
                  <TableHead className="w-[250px]">Przypisz do</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {new Date(tx.date).toLocaleDateString("pl-PL")}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <span className="line-clamp-2 text-sm">{tx.title}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tx.bankAccount || "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        tx.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedTenants[tx.id] || ""}
                        onValueChange={(v) => v && handleTenantSelect(tx.id, v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz najemcę..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.firstName} {t.lastName} — {t.property.address1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          disabled={!selectedTenants[tx.id]}
                          onClick={() => handleAssign(tx)}
                        >
                          <Link2 className="mr-1 h-3 w-3" />
                          Przypisz
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDismissDialog({ txId: tx.id, title: tx.title })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog for saving bank account */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zapamiętać numer konta?</DialogTitle>
            <DialogDescription>
              Czy chcesz zapamiętać numer konta{" "}
              <span className="font-mono font-medium">
                {confirmDialog?.bankAccount}
              </span>{" "}
              dla najemcy{" "}
              <span className="font-medium">{confirmDialog?.tenantName}</span>?
              <br />
              Przyszłe transakcje z tego konta będą automatycznie dopasowywane.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                confirmDialog &&
                doReconcile(confirmDialog.txId, confirmDialog.tenantId, false)
              }
            >
              Nie, tylko przypisz
            </Button>
            <Button
              onClick={() =>
                confirmDialog &&
                doReconcile(confirmDialog.txId, confirmDialog.tenantId, true)
              }
            >
              Tak, zapamiętaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for dismissing transaction */}
      <Dialog
        open={!!dismissDialog}
        onOpenChange={(open) => !open && setDismissDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odrzucić transakcję?</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz odrzucić transakcję{" "}
              <span className="font-medium">&quot;{dismissDialog?.title}&quot;</span>?
              <br />
              Transakcja nie będzie już widoczna na liście do uzgodnienia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDismissDialog(null)}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                dismissDialog && doDismiss(dismissDialog.txId)
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Odrzuć
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
