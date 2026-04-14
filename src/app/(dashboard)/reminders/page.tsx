"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  Send,
  Clock,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  getReminders,
  getAllTenants,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderActive,
  sendReminderNow,
} from "./actions";

type Reminder = Awaited<ReturnType<typeof getReminders>>[number];
type Tenant = Awaited<ReturnType<typeof getAllTenants>>[number];

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  return `${h.toString().padStart(2, "0")}:00`;
}

function formatSchedule(r: Reminder) {
  return `${r.dayOfMonth}. dnia miesiąca, godz. ${formatHour(r.hour)}`;
}

const EMPTY_FORM = {
  name: "",
  dayOfMonth: 1,
  hour: 8,
  subject: "",
  body: "",
  tenantIds: [] as number[],
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteDialogId, setDeleteDialogId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  function load() {
    startTransition(async () => {
      const [r, t] = await Promise.all([getReminders(), getAllTenants()]);
      setReminders(r);
      setTenants(t);
    });
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(r: Reminder) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      dayOfMonth: r.dayOfMonth,
      hour: r.hour,
      subject: r.subject,
      body: r.body,
      tenantIds: r.tenants.map((rt) => rt.tenantId),
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Podaj nazwę przypomnienia."); return; }
    if (!form.subject.trim()) { toast.error("Podaj temat e-maila."); return; }
    if (!form.body.trim()) { toast.error("Podaj treść e-maila."); return; }
    if (form.tenantIds.length === 0) { toast.error("Wybierz co najmniej jednego najemcę."); return; }

    if (editingId !== null) {
      await updateReminder(editingId, form);
      toast.success("Przypomnienie zaktualizowane.");
    } else {
      await createReminder(form);
      toast.success("Przypomnienie utworzone.");
    }
    setFormOpen(false);
    load();
  }

  async function handleDelete(id: number) {
    await deleteReminder(id);
    setDeleteDialogId(null);
    toast.success("Przypomnienie usunięte.");
    load();
  }

  async function handleToggle(r: Reminder) {
    await toggleReminderActive(r.id, !r.isActive);
    load();
  }

  async function handleSendNow(id: number) {
    setSendingId(id);
    const result = await sendReminderNow(id);
    setSendingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.sent === 0) {
      toast.info(`Brak najemców z adresem e-mail. Pominięto: ${result.skipped ?? 0}.`);
    } else {
      toast.success(
        `Wysłano ${result.sent} e-mail${result.sent === 1 ? "" : "i"}.` +
          ((result.skipped ?? 0) > 0 ? ` Bez e-maila: ${result.skipped}.` : "")
      );
    }
    load();
  }

  function toggleTenant(id: number) {
    setForm((f) => ({
      ...f,
      tenantIds: f.tenantIds.includes(id)
        ? f.tenantIds.filter((t) => t !== id)
        : [...f.tenantIds, id],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Przypomnienia</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nowe przypomnienie
        </Button>
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Bell className="h-8 w-8" />
          <p>Brak skonfigurowanych przypomnień.</p>
          <p className="text-sm">Kliknij „Nowe przypomnienie", aby dodać pierwsze.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reminders.map((r) => (
            <Card key={r.id} className={r.isActive ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{r.name}</CardTitle>
                      <Badge variant={r.isActive ? "default" : "secondary"}>
                        {r.isActive ? "Aktywne" : "Nieaktywne"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatSchedule(r)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {r.tenants.length} najemców
                      </span>
                    </div>
                    {r.lastSentAt && (
                      <p className="text-xs text-muted-foreground">
                        Ostatnio wysłano:{" "}
                        {new Date(r.lastSentAt).toLocaleString("pl-PL")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(r)}
                      title={r.isActive ? "Dezaktywuj" : "Aktywuj"}
                    >
                      {r.isActive ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendNow(r.id)}
                      disabled={sendingId === r.id}
                    >
                      <Send className="h-4 w-4" />
                      {sendingId === r.id ? "Wysyłanie..." : "Wyślij teraz"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialogId(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-3">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Temat: <span className="text-foreground">{r.subject}</span>
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-2">
                  {r.body}
                </p>
                {r.tenants.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.tenants.map((rt) => (
                      <Badge key={rt.tenantId} variant="secondary" className="text-xs">
                        {rt.tenant.firstName} {rt.tenant.lastName}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "Edytuj przypomnienie" : "Nowe przypomnienie"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nazwa przypomnienia</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="np. Przypomnienie o czynszu"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>Dzień miesiąca</Label>
                <Select
                  value={form.dayOfMonth.toString()}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, dayOfMonth: Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d.toString()}>
                        {d}.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <Label>Godzina wysyłki</Label>
                <Select
                  value={form.hour.toString()}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, hour: Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map((h) => (
                      <SelectItem key={h} value={h.toString()}>
                        {formatHour(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Temat e-maila</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="np. Przypomnienie o płatności czynszu"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Treść e-maila</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Treść wiadomości e-mail..."
              />
              <p className="text-xs text-muted-foreground">
                Wiadomość zostanie poprzedzona pozdrowieniem „Dzień dobry [Imię Nazwisko]," i podpisem „Z poważaniem, BMT".
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Label>Najemcy ({form.tenantIds.length} wybranych)</Label>
              <div className="rounded-md border max-h-52 overflow-y-auto">
                {tenants.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Brak najemców.</p>
                ) : (
                  tenants.map((t) => {
                    const checked = form.tenantIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTenant(t.id)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm flex-1">
                          {t.firstName} {t.lastName}
                        </span>
                        {t.email ? (
                          <span className="text-xs text-muted-foreground">{t.email}</span>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            brak e-maila
                          </Badge>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave}>
              {editingId !== null ? "Zapisz zmiany" : "Utwórz przypomnienie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogId !== null}
        onOpenChange={(open) => !open && setDeleteDialogId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Usuń przypomnienie</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunąć to przypomnienie? Tej operacji nie można cofnąć.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialogId !== null && handleDelete(deleteDialogId)}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
