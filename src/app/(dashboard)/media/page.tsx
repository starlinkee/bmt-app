"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
import { Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  getSettlementGroups,
  getPropertiesForSelect,
  createSettlementGroup,
  updateSettlementGroup,
  deleteSettlementGroup,
} from "./actions";

type Group = Awaited<ReturnType<typeof getSettlementGroups>>[number];
type PropertyOption = Awaited<ReturnType<typeof getPropertiesForSelect>>[number];

export default function MediaPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const [g, p] = await Promise.all([
        getSettlementGroups(),
        getPropertiesForSelect(),
      ]);
      setGroups(g);
      setProperties(p);
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(formData: FormData) {
    const result = editing
      ? await updateSettlementGroup(editing.id, formData)
      : await createSettlementGroup(formData);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? "Zaktualizowano grupę." : "Dodano grupę.");
    setOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Czy na pewno chcesz usunąć tę grupę rozliczeniową?")) return;
    await deleteSettlementGroup(id);
    toast.success("Usunięto grupę.");
    load();
  }

  function openEdit(group: Group) {
    setEditing(group);
    setOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Media — Grupy rozliczeniowe</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj grupę
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj grupę" : "Nowa grupa rozliczeniowa"}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nazwa</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="np. Woda + Ścieki"
                required
                key={`n-${editing?.id ?? "new"}`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="propertyId">Nieruchomość</Label>
              <Select
                name="propertyId"
                defaultValue={editing?.propertyId?.toString() ?? ""}
                key={`p-${editing?.id ?? "new"}`}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz nieruchomość" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spreadsheetId">ID arkusza Google</Label>
              <Input
                id="spreadsheetId"
                name="spreadsheetId"
                defaultValue={editing?.spreadsheetId ?? ""}
                placeholder="np. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                required
                key={`s-${editing?.id ?? "new"}`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inputMappingJSON">
                Mapowanie wejściowe (JSON)
              </Label>
              <textarea
                id="inputMappingJSON"
                name="inputMappingJSON"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
                defaultValue={
                  editing?.inputMappingJSON ??
                  '[{"label": "Odczyt wody", "range": "Arkusz1!A1"}]'
                }
                placeholder='[{"label": "Odczyt wody", "range": "Arkusz1!A1"}]'
                key={`im-${editing?.id ?? "new"}`}
              />
              <p className="text-xs text-muted-foreground">
                Tablica obiektów: label (etykieta pola) + range (zakres w arkuszu)
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="outputMappingJSON">
                Mapowanie wyjściowe (JSON)
              </Label>
              <textarea
                id="outputMappingJSON"
                name="outputMappingJSON"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
                defaultValue={
                  editing?.outputMappingJSON ??
                  '[{"tenantId": 1, "range": "Arkusz1!B1"}]'
                }
                placeholder='[{"tenantId": 1, "range": "Arkusz1!B1"}]'
                key={`om-${editing?.id ?? "new"}`}
              />
              <p className="text-xs text-muted-foreground">
                Tablica obiektów: tenantId (ID najemcy) + range (komórka z wynikiem)
              </p>
            </div>

            <Button type="submit" disabled={isPending}>
              {editing ? "Zapisz" : "Dodaj"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          Brak grup rozliczeniowych. Dodaj pierwszą, aby rozpocząć rozliczanie mediów.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Nieruchomość</TableHead>
              <TableHead>ID arkusza</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>{g.property.address}</TableCell>
                <TableCell className="max-w-[200px] truncate font-mono text-xs">
                  {g.spreadsheetId}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/media/${g.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(g)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(g.id)}
                    >
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
