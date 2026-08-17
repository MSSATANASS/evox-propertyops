import { afterEach, describe, expect, it } from "vitest";
import { activityEvents, expenseDecisionChallenges, notificationPreferences, properties, propertyExpenses, propertyTasks, taskEvidence, userNotifications } from "../drizzle/schema";
import { createEvidence, createExpense, createManualExpenseChallenge, createProperty, createTask, decideExpenseManually, getNotificationPreferences, listNotifications, markAllNotificationsRead, markNotificationRead, setDbForTests, updateNotificationPreferences } from "./db";

type Row = Record<string, unknown>;

function collectConditions(condition: unknown, output: { equals: Record<string, unknown>; isNull: Set<string> } = { equals: {}, isNull: new Set() }) {
  if (!condition || typeof condition !== "object") return output;
  const chunks = (condition as { queryChunks?: unknown[] }).queryChunks;
  if (!chunks) return output;
  for (let index = 0; index < chunks.length; index += 1) {
    const column = chunks[index] as { constructor?: { name?: string }; name?: string };
    if (typeof column?.name === "string") {
      const nearby = chunks.slice(index + 1, index + 3);
      const value = nearby.find((chunk): chunk is { constructor?: { name?: string }; value: unknown } => Boolean(chunk) && typeof chunk === "object" && (chunk as { constructor?: { name?: string } }).constructor?.name === "Param");
      const text = nearby.map(chunk => {
        const item = chunk as { constructor?: { name?: string }; value?: string[] };
        return item.constructor?.name === "StringChunk" ? item.value?.join("") ?? "" : "";
      }).join(" ").toLowerCase();
      if (value && text.includes("=")) output.equals[column.name] = value.value;
      if (text.includes("is null")) output.isNull.add(column.name);
    }
    collectConditions(chunks[index], output);
  }
  return output;
}

function createNotificationStore() {
  const state = {
    preferences: [] as Row[], properties: [] as Row[], tasks: [] as Row[], evidence: [] as Row[], expenses: [] as Row[], challenges: [] as Row[], notifications: [] as Row[], events: [] as Row[], nextId: 1,
  };
  const rowsFor = (table: unknown) => table === notificationPreferences ? state.preferences : table === properties ? state.properties : table === propertyTasks ? state.tasks : table === taskEvidence ? state.evidence : table === propertyExpenses ? state.expenses : table === expenseDecisionChallenges ? state.challenges : table === userNotifications ? state.notifications : state.events;
  const matchingRows = (table: unknown, condition?: unknown) => {
    const criteria = collectConditions(condition);
    return rowsFor(table).filter(row => Object.entries(criteria.equals).every(([key, value]) => row[key] === value) && [...criteria.isNull].every(key => row[key] == null));
  };
  const query = (table: unknown) => {
    let condition: unknown;
    const builder = {
      where: (next: unknown) => { condition = next; return builder; },
      orderBy: () => builder,
      innerJoin: () => builder,
      limit: async (limit: number) => matchingRows(table, condition).slice(0, limit),
      then: (resolve: (value: Row[]) => unknown) => Promise.resolve(matchingRows(table, condition)).then(resolve),
    };
    return builder;
  };
  const db = {
    select: () => ({ from: (table: unknown) => query(table) }),
    insert: (table: unknown) => ({
      values: (values: Row) => {
        let committed = false;
        let result: { insertId: number }[] = [];
        const commit = (set?: Row) => {
          if (committed) return result;
          const rows = rowsFor(table);
          if (table === notificationPreferences) {
            const existing = rows.find(row => row.ownerId === values.ownerId);
            if (existing) Object.assign(existing, set ?? {});
            else rows.push({ ...values, id: state.nextId++ });
            result = [{ insertId: Number((existing ?? rows.at(-1))?.id) }];
          } else {
            const defaults = table === propertyTasks ? { status: "todo" } : table === propertyExpenses ? { status: "pending" } : table === userNotifications ? { readAt: null } : {};
            const row = { ...defaults, ...values, id: state.nextId++, createdAt: new Date() };
            rows.push(row);
            result = [{ insertId: Number(row.id) }];
          }
          committed = true;
          return result;
        };
        return {
          onDuplicateKeyUpdate: ({ set }: { set: Row }) => Promise.resolve(commit(set)),
          then: (resolve: (value: { insertId: number }[]) => unknown) => Promise.resolve(commit()).then(resolve),
        };
      },
    }),
    update: (table: unknown) => ({ set: (values: Row) => ({ where: (condition: unknown) => { const affected = matchingRows(table, condition); affected.forEach(row => Object.assign(row, values)); return Promise.resolve([{ affectedRows: affected.length }]); } }) }),
  };
  return { db: db as never, state };
}

afterEach(() => setDbForTests(null));

describe("notification persistence helpers", () => {
  it("persists one isolated preference record per user", async () => {
    const store = createNotificationStore();
    setDbForTests(store.db);
    expect((await getNotificationPreferences(7)).evidenceEvents).toBe(false);
    expect((await getNotificationPreferences(8)).evidenceEvents).toBe(false);
    expect((await updateNotificationPreferences(7, { evidenceEvents: true })).evidenceEvents).toBe(true);
    expect((await getNotificationPreferences(8)).evidenceEvents).toBe(false);
    expect(store.state.preferences).toHaveLength(2);
  });

  it("creates or omits alerts from property, task, evidence, expense and manual decision flows", async () => {
    const store = createNotificationStore();
    setDbForTests(store.db);
    const property = await createProperty(7, { name: "Casa Norte", address: "Mérida", propertyType: "Casa", status: "active" });
    const task = await createTask(7, { propertyId: property.id, title: "Revisar bomba", description: "Confirmar presión", priority: "medium" });
    await createEvidence(7, { taskId: task.id, type: "note", description: "Inspección inicial" });
    const expense = await createExpense(7, { propertyId: property.id, description: "Refacción", amountCents: 1200 });
    const challenge = await createManualExpenseChallenge(7, expense.id, "approved", "session-7");
    await decideExpenseManually(7, expense.id, "approved", "APROBAR", challenge.id, challenge.nonce, "session-7");
    const initial = await listNotifications(7);
    expect(initial.map(notification => notification.eventType).sort()).toEqual(["expense.manually_approved", "expense.pending_review", "task.created", "property.created"].sort());
    await updateNotificationPreferences(7, { evidenceEvents: true, taskUpdates: false });
    await createEvidence(7, { taskId: task.id, type: "document", description: "Factura" });
    await createTask(7, { propertyId: property.id, title: "Limpieza", description: "Coordinar proveedor", priority: "medium" });
    const afterPreferences = await listNotifications(7);
    expect(afterPreferences.filter(notification => notification.eventType === "evidence.created")).toHaveLength(1);
    expect(afterPreferences.filter(notification => notification.title === "Nueva tarea operativa")).toHaveLength(1);
  });

  it("lists and marks notifications only for the requesting owner", async () => {
    const store = createNotificationStore();
    setDbForTests(store.db);
    const propertyA = await createProperty(7, { name: "Casa Norte", address: "Mérida", propertyType: "Casa", status: "active" });
    await createProperty(8, { name: "Departamento Centro", address: "Mérida", propertyType: "Departamento", status: "active" });
    const ownerSeven = await listNotifications(7);
    const ownerEight = await listNotifications(8);
    expect(ownerSeven).toHaveLength(1);
    expect(ownerEight).toHaveLength(1);
    expect(ownerSeven[0].ownerId).toBe(7);
    await expect(markNotificationRead(8, ownerSeven[0].id)).rejects.toThrow("Notificación no encontrada");
    await markNotificationRead(7, ownerSeven[0].id);
    const firstReadAt = (await listNotifications(7))[0].readAt;
    await markAllNotificationsRead(7);
    expect((await listNotifications(7))[0].readAt).toEqual(firstReadAt);
    expect((await listNotifications(8))[0].readAt).toBeNull();
    expect(propertyA.ownerId).toBe(7);
  });
});
