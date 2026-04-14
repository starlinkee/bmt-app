"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { initAndGetPageData, getPageData } from "./home-actions";

type PageData = Awaited<ReturnType<typeof getPageData>>;
type Filter = "TODO" | "DONE";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const TASK_LABELS: Record<string, string> = {
  RENT: "Wystawienie czynszów",
  MEDIA: "Wysyłka mediów",
};

const TASK_HREF: Record<string, string> = {
  RENT: "/finance",
  MEDIA: "/media",
};

const TASK_ACTION: Record<string, string> = {
  RENT: "Wystaw czynsze",
  MEDIA: "Wyślij media",
};

function formatDay(day: number, month: number, year: number) {
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

export default function HomePage() {
  const [filter, setFilter] = useState<Filter>("TODO");
  const [data, setData] = useState<PageData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const result = await initAndGetPageData("TODO");
      setData(result);
      setInitialized(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialized) return;
    startTransition(async () => {
      const result = await getPageData(filter);
      setData(result);
    });
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date();
  const dateLabel = today.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const month = data?.month ?? today.getMonth() + 1;
  const year = data?.year ?? today.getFullYear();

  const totalCount = (data?.tasks.length ?? 0) + (data?.reminders.length ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Strona główna</h1>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "TODO" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("TODO")}
        >
          <Clock className="mr-1.5 h-4 w-4" />
          Do zrobienia
        </Button>
        <Button
          variant={filter === "DONE" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("DONE")}
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Zrobione
        </Button>
      </div>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Ładowanie...</p>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          {filter === "TODO" ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="font-medium">Wszystko zrobione!</p>
              <p className="text-sm">Brak zadań do wykonania w tym miesiącu.</p>
            </>
          ) : (
            <>
              <Clock className="h-8 w-8" />
              <p>Brak ukończonych zadań.</p>
            </>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zadanie</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Status</TableHead>
              {filter === "DONE" && <TableHead>Ukończono</TableHead>}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.tasks.map((task) => (
              <TableRow key={`task-${task.id}`}>
                <TableCell className="font-medium">
                  {TASK_LABELS[task.type] ?? task.type}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDay(1, task.month, task.year)}
                </TableCell>
                <TableCell>
                  {task.status === "TODO" ? (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Do zrobienia
                    </Badge>
                  ) : (
                    <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Zrobione
                    </Badge>
                  )}
                </TableCell>
                {filter === "DONE" && (
                  <TableCell className="text-muted-foreground text-sm">
                    {task.completedAt
                      ? new Date(task.completedAt).toLocaleDateString("pl-PL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {task.status === "TODO" && TASK_HREF[task.type] && (
                    <Link
                      href={TASK_HREF[task.type]}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {TASK_ACTION[task.type]}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {data?.reminders.map((r) => {
              const sentThisMonth =
                r.lastSentAt !== null &&
                r.lastSentAt >= new Date(year, month - 1, 1);
              return (
                <TableRow key={`reminder-${r.id}`}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDay(r.dayOfMonth, month, year)}{" "}
                    <span className="text-xs">
                      {String(r.hour).padStart(2, "0")}:00
                    </span>
                  </TableCell>
                  <TableCell>
                    {sentThisMonth ? (
                      <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Zrobione
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Do zrobienia
                      </Badge>
                    )}
                  </TableCell>
                  {filter === "DONE" && (
                    <TableCell className="text-muted-foreground text-sm">
                      {r.lastSentAt
                        ? new Date(r.lastSentAt).toLocaleDateString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {!sentThisMonth && (
                      <Link
                        href="/reminders"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Przejdź
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
