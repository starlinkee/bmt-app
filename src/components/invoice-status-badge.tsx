"use client";

import { Badge } from "@/components/ui/badge";

export function InvoiceStatusBadge({ isPaid }: { isPaid: boolean }) {
  return (
    <Badge variant={isPaid ? "default" : "destructive"}>
      {isPaid ? "Opłacone" : "Zaległe"}
    </Badge>
  );
}
