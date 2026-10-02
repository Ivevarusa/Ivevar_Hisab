import { db } from "./db";

export async function audit(userId: string, action: string, entity: string, entityId?: string, detail?: unknown) {
  await db.auditLog.create({
    data: { userId, action, entity, entityId, detail: detail === undefined ? undefined : JSON.stringify(detail) },
  });
}
