"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  getTenants,
  getPropertiesForSelect,
  createTenant,
  updateTenant,
  deleteTenant,
} from "./actions";

type Tenant = Awaited<ReturnType<typeof getTenants>>[number];
type PropertyOption = Awaited<ReturnType<typeof getPropertiesForSelect>>[number];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const [t, p] = await Promise.all([getTenants(), getPropertiesForSelect()]);
      setTenants(t);
      setProperties(p);
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(formData: FormData) {
    const result = editing
      ? await updateTenant(editing.id, formData)
      : await createTenant(formData);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? "Zaktualizowano najemcę." : "Dodano najemcę.");
    setOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Czy na pewno chcesz usunąć tego najemcę?")) return;
    const result = await deleteTenant(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Usunięto najemcę.");
    load();
  }

  function openEdit(tenant: Tenant) {
    setEditing(tenant);
    setOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Najemcy</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj najemcę" : "Nowy najemca"}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Imię</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={editing?.firstName ?? ""}
                  required
                  key={`fn-${editing?.id ?? "new"}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Nazwisko</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={editing?.lastName ?? ""}
                  required
                  key={`ln-${editing?.id ?? "new"}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editing?.email ?? ""}
                  key={`em-${editing?.id ?? "new"}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editing?.phone ?? ""}
                  key={`ph-${editing?.id ?? "new"}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoiceSeqNumber">Nr porządkowy (rachunki)</Label>
              <Input
                id="invoiceSeqNumber"
                name="invoiceSeqNumber"
                type="number"
                min={0}
                defaultValue={editing?.invoiceSeqNumber ?? 0}
                key={`seq-${editing?.id ?? "new"}`}
              />
              <p className="text-xs text-muted-foreground">
                Stały numer najemcy używany w numeracji rachunków (np. 1 → /001 czynsz, /010 media)
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="propertyId">Nieruchomość</Label>
              <Select
                name="propertyId"
                defaultValue={editing?.propertyId?.toString() ?? ""}
                key={`prop-${editing?.id ?? "new"}`}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz nieruchomość" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.address} ({p.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bankAccountsAsText">
                Numery kont bankowych (po jednym w linii)
              </Label>
              <textarea
                id="bankAccountsAsText"
                name="bankAccountsAsText"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue={editing?.bankAccountsAsText ?? ""}
                key={`ba-${editing?.id ?? "new"}`}
              />
            </div>

            <Button type="submit" disabled={isPending}>
              {editing ? "Zapisz" : "Dodaj"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {tenants.length === 0 ? (
        <p className="text-muted-foreground">Brak najemców. Dodaj pierwszego.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Nieruchomość</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/tenants/${t.id}`}
                    className="hover:underline"
                  >
                    {t.firstName} {t.lastName}
                  </Link>
                </TableCell>
                <TableCell>{t.email ?? "—"}</TableCell>
                <TableCell>{t.phone ?? "—"}</TableCell>
                <TableCell>{t.property.address}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link href={`/tenants/${t.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
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
