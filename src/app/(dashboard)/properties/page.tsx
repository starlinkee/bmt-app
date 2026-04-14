"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2, Users, FileText, BarChart2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  getTenantsByProperty,
} from "./actions";

type Property = Awaited<ReturnType<typeof getProperties>>[number];
type Tenant = Awaited<ReturnType<typeof getTenantsByProperty>>[number];

const PROPERTY_TYPES = ["Mieszkanie", "Lokal usługowy", "Garaż", "Inne"];

function PropertiesPageInner() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tenantsOpen, setTenantsOpen] = useState(false);
  const [tenantsProperty, setTenantsProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  function load() {
    startTransition(async () => {
      const data = await getProperties();
      setProperties(data);
      // Auto-open tenants dialog if ?open=<id> in URL
      const openId = Number(searchParams.get("open"));
      if (openId) {
        const prop = data.find((p) => p.id === openId);
        if (prop) {
          setTenantsProperty(prop);
          setTenantsOpen(true);
          getTenantsByProperty(prop.id).then(setTenants);
        }
      }
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(formData: FormData) {
    const result = editing
      ? await updateProperty(editing.id, formData)
      : await createProperty(formData);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? "Zaktualizowano nieruchomość." : "Dodano nieruchomość.");
    setOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Czy na pewno chcesz usunąć tę nieruchomość?")) return;
    const result = await deleteProperty(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Usunięto nieruchomość.");
    load();
  }

  function openEdit(property: Property) {
    setEditing(property);
    setOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  async function openTenants(property: Property) {
    setTenantsProperty(property);
    setTenantsOpen(true);
    const data = await getTenantsByProperty(property.id);
    setTenants(data);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Najem</h1>
        <div className="flex gap-2">
          <Link href="/media" className={buttonVariants({ variant: "secondary" })}>
            <FileText className="mr-2 h-4 w-4" />
            Media
          </Link>
          <Link href="/finance" className={buttonVariants({ variant: "secondary" })}>
            <BarChart2 className="mr-2 h-4 w-4" />
            Wystawienie czynszu
          </Link>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj nieruchomość" : "Nowa nieruchomość"}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nazwa</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="np. Mieszkanie na Mokotowie"
                key={`name-${editing?.id ?? "new"}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address1">Ulica i numer</Label>
              <Input
                id="address1"
                name="address1"
                defaultValue={editing?.address1 ?? ""}
                placeholder="np. ul. Marszałkowska 1/2"
                required
                key={`a1-${editing?.id ?? "new"}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address2">Kod pocztowy i miasto</Label>
              <Input
                id="address2"
                name="address2"
                defaultValue={editing?.address2 ?? ""}
                placeholder="np. 00-001 Warszawa"
                key={`a2-${editing?.id ?? "new"}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Typ lokalu</Label>
              <Select name="type" defaultValue={editing?.type ?? ""} key={`type-${editing?.id ?? "new"}`}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz typ" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isPending}>
              {editing ? "Zapisz" : "Dodaj"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={tenantsOpen} onOpenChange={(v) => { setTenantsOpen(v); if (!v) { setTenantsProperty(null); setTenants([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Najemcy — {tenantsProperty?.address1}{tenantsProperty?.address2 ? `, ${tenantsProperty.address2}` : ""}
            </DialogTitle>
          </DialogHeader>
          {tenants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Brak najemców dla tej nieruchomości.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.firstName} {t.lastName}</TableCell>
                    <TableCell>{t.email ?? "—"}</TableCell>
                    <TableCell>{t.phone ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {properties.length === 0 ? (
        <p className="text-muted-foreground">Brak nieruchomości. Dodaj pierwszą.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-center">Najemcy</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name || "—"}</TableCell>
                <TableCell>
                  <div>{p.address1}</div>
                  {p.address2 && <div className="text-xs text-muted-foreground">{p.address2}</div>}
                </TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => openTenants(p)}
                  >
                    <Users className="h-4 w-4" />
                    {p._count.tenants}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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

export default function PropertiesPage() {
  return (
    <Suspense>
      <PropertiesPageInner />
    </Suspense>
  );
}
