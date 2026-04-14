"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Pencil, Trash2, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  getTenants,
  getPropertiesForSelect,
  createTenant,
  updateTenant,
  deleteTenant,
  getContractsByTenant,
} from "./actions";

type Tenant = Awaited<ReturnType<typeof getTenants>>[number];
type PropertyOption = Awaited<ReturnType<typeof getPropertiesForSelect>>[number];
type Contract = Awaited<ReturnType<typeof getContractsByTenant>>[number];

function ActionButtons({
  tenant,
  onEdit,
  onDelete,
  onContracts,
}: {
  tenant: Tenant;
  onEdit: (t: Tenant) => void;
  onDelete: (id: number) => void;
  onContracts: (t: Tenant) => void;
}) {
  return (
    <>
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => onContracts(tenant)}
        >
          <FileText className="h-4 w-4" />
          {tenant._count.contracts}
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Link href={`/tenants/${tenant.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => onEdit(tenant)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(tenant.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [tenantType, setTenantType] = useState<string>("PRIVATE");
  const [isPending, startTransition] = useTransition();
  const [contractsOpen, setContractsOpen] = useState(false);
  const [contractsTenant, setContractsTenant] = useState<Tenant | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<"private" | "business">("private");

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
    setTenantType(tenant.tenantType ?? "PRIVATE");
    setOpen(true);
  }

  function openCreate(type: "PRIVATE" | "BUSINESS") {
    setEditing(null);
    setTenantType(type);
    setOpen(true);
  }

  async function openContracts(tenant: Tenant) {
    setContractsTenant(tenant);
    setContractsOpen(true);
    const data = await getContractsByTenant(tenant.id);
    setContracts(data);
  }

  const privateTenants = tenants.filter((t) => t.tenantType !== "BUSINESS");
  const businessTenants = tenants.filter((t) => t.tenantType === "BUSINESS");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Najemcy</h1>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj najemcę" : "Nowy najemca"}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Typ najemcy</Label>
              <input type="hidden" name="tenantType" value={tenantType} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTenantType("PRIVATE")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    tenantType === "PRIVATE"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  Prywatny
                </button>
                <button
                  type="button"
                  onClick={() => setTenantType("BUSINESS")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    tenantType === "BUSINESS"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  Firmowy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">{tenantType === "BUSINESS" ? "Imię / Nazwa firmy" : "Imię"}</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={editing?.firstName ?? ""}
                  required
                  key={`fn-${editing?.id ?? "new"}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">{tenantType === "BUSINESS" ? "Nazwisko / cd. nazwy" : "Nazwisko"}</Label>
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

            {tenantType === "BUSINESS" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nip">NIP</Label>
                  <Input
                    id="nip"
                    name="nip"
                    defaultValue={editing?.nip ?? ""}
                    placeholder="np. 1234567890"
                    key={`nip-${editing?.id ?? "new"}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="address1">Ulica i numer</Label>
                    <Input
                      id="address1"
                      name="address1"
                      defaultValue={editing?.address1 ?? ""}
                      placeholder="np. ul. Kwiatowa 5/3"
                      key={`a1-${editing?.id ?? "new"}`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="address2">Kod i miasto</Label>
                    <Input
                      id="address2"
                      name="address2"
                      defaultValue={editing?.address2 ?? ""}
                      placeholder="np. 00-001 Warszawa"
                      key={`a2-${editing?.id ?? "new"}`}
                    />
                  </div>
                </div>
              </>
            )}

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
                      {p.address1}{p.address2 ? `, ${p.address2}` : ""} ({p.type})
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

      {/* Contracts dialog */}
      <Dialog open={contractsOpen} onOpenChange={(v) => { setContractsOpen(v); if (!v) { setContractsTenant(null); setContracts([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Umowy — {contractsTenant?.firstName} {contractsTenant?.lastName}
            </DialogTitle>
          </DialogHeader>
          {contracts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Brak umów dla tego najemcy.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Czynsz</TableHead>
                  <TableHead>Od</TableHead>
                  <TableHead>Do</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.rentAmount.toFixed(2)} zł</TableCell>
                    <TableCell>{new Date(c.startDate).toLocaleDateString("pl-PL")}</TableCell>
                    <TableCell>{c.endDate ? new Date(c.endDate).toLocaleDateString("pl-PL") : "—"}</TableCell>
                    <TableCell>{c.isActive ? "Aktywna" : "Zakończona"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "private" | "business")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="private">
              Prywatni ({privateTenants.length})
            </TabsTrigger>
            <TabsTrigger value="business">
              Firmowi ({businessTenants.length})
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => openCreate(activeTab === "business" ? "BUSINESS" : "PRIVATE")}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj
          </Button>
        </div>

        {/* Private tenants */}
        <TabsContent value="private" className="mt-4">
          {privateTenants.length === 0 ? (
            <p className="text-muted-foreground">Brak prywatnych najemców.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Nieruchomość</TableHead>
                  <TableHead className="text-center">Umowy</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {privateTenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link href={`/tenants/${t.id}`} className="hover:underline">
                        {t.firstName} {t.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{t.email ?? "—"}</TableCell>
                    <TableCell>{t.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Link href={`/properties?open=${t.propertyId}`} className="hover:underline text-sm">
                        {t.property.address1}{t.property.address2 ? `, ${t.property.address2}` : ""}
                      </Link>
                    </TableCell>
                    <ActionButtons
                      tenant={t}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onContracts={openContracts}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Business tenants */}
        <TabsContent value="business" className="mt-4">
          {businessTenants.length === 0 ? (
            <p className="text-muted-foreground">Brak firmowych najemców.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Ulica i numer</TableHead>
                  <TableHead>Kod i miasto</TableHead>
                  <TableHead>Nieruchomość</TableHead>
                  <TableHead className="text-center">Umowy</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessTenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link href={`/tenants/${t.id}`} className="hover:underline">
                        {t.firstName} {t.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{t.nip ?? "—"}</TableCell>
                    <TableCell>{t.email ?? "—"}</TableCell>
                    <TableCell>{t.phone ?? "—"}</TableCell>
                    <TableCell>{t.address1 ?? "—"}</TableCell>
                    <TableCell>{t.address2 ?? "—"}</TableCell>
                    <TableCell>
                      <Link href={`/properties?open=${t.propertyId}`} className="hover:underline text-sm">
                        {t.property.address1}{t.property.address2 ? `, ${t.property.address2}` : ""}
                      </Link>
                    </TableCell>
                    <ActionButtons
                      tenant={t}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onContracts={openContracts}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
