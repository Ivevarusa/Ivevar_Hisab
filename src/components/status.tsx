import type { OrderStatus, ShipmentStatus } from "@prisma/client";
import { Badge } from "./ui";
import { label } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  ENQUIRY: "slate",
  CONFIRMED: "blue",
  IN_PRODUCTION: "amber",
  READY: "amber",
  DISPATCHED: "blue",
  DELIVERED: "green",
  CANCELLED: "red",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{label(status)}</Badge>;
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return <Badge tone={status === "DELIVERED" ? "green" : status === "RETURNED" ? "red" : "blue"}>{label(status)}</Badge>;
}
