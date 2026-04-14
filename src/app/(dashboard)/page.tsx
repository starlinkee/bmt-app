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
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { initAndGetTasks, getAllTasks } from "./home-actions";

type Task = Awaited<ReturnType<typeof getAllTasks>>[number];
type Filter = "TODO" | "DONE";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const TASK_LABELS: Record<string, string> = {
  RENT: "Wystawienie czynszów",
  MEDIA: "Wysyłka mediów",
};

export default function HomePage() {
  const [filter, setFilter] = useState<Filter>("TODO");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const data = await initAndGetTasks("TODO");
      setTasks(data);
      setInitialized(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialized) return;
    startTransition(async () => {
      const data = await getAllTasks(filter);
      setTasks(data);
    });
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Strona główna</h1>
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
      ) : tasks.length === 0 ? (
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
              <TableHead>Miesiąc</TableHead>
              <TableHead>Status</TableHead>
              {filter === "DONE" && <TableHead>Ukończono</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  {TASK_LABELS[task.type] ?? task.type}
                </TableCell>
                <TableCell>
                  {MONTHS_PL[task.month - 1]} {task.year}
                </TableCell>
                <TableCell>
                  {task.status === "TODO" ? (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Do zrobienia
                    </Badge>
                  ) : (
                    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
