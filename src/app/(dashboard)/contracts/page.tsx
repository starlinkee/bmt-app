"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getContracts,
  getTenantsForSelect,
  createContract,
  updateContract,
  deleteContract,
} from "./actions";

type Contract = Awaited<ReturnType<typeof getContracts>>[number];
type TenantOption = Awaited<ReturnType<typeof getTenantsForSelect>>[number];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pl-PL");
}

function toInputDate(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const [c, t] = await Promise.all([getContracts(), getTenantsForSelect()]);
      setContracts(c);
      setTenants(t);
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(formData: FormData) {
    const result = editing
      ? await updateContract(editing.id, formData)
      : await createContract(formData);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? "Zaktualizowano umowę." : "Dodano umowę.");
    setOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Czy na pewno chcesz usunąć tę umowę?")) return;
    const result = await deleteContract(id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Usunięto umowę.");
    load();
  }

  function openEdit(contract: Contract) {
    setEditing(contract);
    setOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Umowy</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj umowę" : "Nowa umowa"}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenantId">Najemca</Label>
              <Select
                name="tenantId"
                defaultValue={editing?.tenantId?.toString() ?? ""}
                key={`t-${editing?.id ?? "new"}`}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz najemcę" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.firstName} {t.lastName} — {t.property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentAmount">Kwota czynszu (PLN)</Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing?.rentAmount ?? ""}
                required
                key={`ra-${editing?.id ?? "new"}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate">Data rozpoczęcia</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={editing ? toInputDate(editing.startDate) : ""}
                  required
                  key={`sd-${editing?.id ?? "new"}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endDate">Data zakończenia</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={editing?.endDate ? toInputDate(editing.endDate) : ""}
                  key={`ed-${editing?.id ?? "new"}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={editing?.isActive ?? true}
                className="h-4 w-4 rounded border-gray-300"
                key={`ia-${editing?.id ?? "new"}`}
              />
              <Label htmlFor="isActive">Umowa aktywna</Label>
            </div>

            <Button type="submit" disabled={isPending}>
              {editing ? "Zapisz" : "Dodaj"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {contracts.length === 0 ? (
        <p className="text-muted-foreground">Brak umów. Dodaj pierwszą.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Najemca</TableHead>
              <TableHead>Nieruchomość</TableHead>
              <TableHead>Czynsz</TableHead>
              <TableHead>Od</TableHead>
              <TableHead>Do</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {c.tenant.firstName} {c.tenant.lastName}
                </TableCell>
                <TableCell>{c.tenant.property.address}</TableCell>
                <TableCell>{formatCurrency(c.rentAmount)}</TableCell>
                <TableCell>{formatDate(c.startDate)}</TableCell>
                <TableCell>{c.endDate ? formatDate(c.endDate) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "Aktywna" : "Nieaktywna"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
