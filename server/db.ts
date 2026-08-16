import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { activityEvents, expenseDecisionChallenges, InsertUser, properties, propertyExpenses, propertyTasks, taskEvidence, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { assertAppendOnlyActivity, assertManualExpenseDecision, assertOwnedByUser, assertUsableExpenseChallenge, ManualExpenseDecisionStatus } from "./propertyOpsRules";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

async function databaseOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible");
  return db;
}

async function appendActivity(ownerId: number, propertyId: number, entityType: "property" | "task" | "evidence" | "expense", entityId: number, action: string, metadata?: Record<string, unknown>) {
  assertAppendOnlyActivity("insert");
  const db = await databaseOrThrow();
  await db.insert(activityEvents).values({ ownerId, actorId: ownerId, propertyId, entityType, entityId, action, metadata: metadata ? JSON.stringify(metadata) : null });
}

async function getOwnedProperty(ownerId: number, propertyId: number) {
  const db = await databaseOrThrow();
  const property = (await db.select().from(properties).where(and(eq(properties.id, propertyId), eq(properties.ownerId, ownerId))).limit(1))[0];
  if (!property) throw new Error("Propiedad no encontrada");
  assertOwnedByUser(property.ownerId, ownerId);
  return property;
}

async function getOwnedTask(ownerId: number, taskId: number) {
  const db = await databaseOrThrow();
  const task = (await db.select().from(propertyTasks).where(and(eq(propertyTasks.id, taskId), eq(propertyTasks.ownerId, ownerId))).limit(1))[0];
  if (!task) throw new Error("Tarea no encontrada");
  assertOwnedByUser(task.ownerId, ownerId);
  return task;
}

export async function listDashboard(ownerId: number) {
  const db = await databaseOrThrow();
  const [portfolio, tasks, evidence, expenses, rawEvents] = await Promise.all([
    db.select().from(properties).where(eq(properties.ownerId, ownerId)).orderBy(desc(properties.updatedAt)),
    db.select().from(propertyTasks).where(eq(propertyTasks.ownerId, ownerId)).orderBy(desc(propertyTasks.updatedAt)),
    db.select().from(taskEvidence).where(eq(taskEvidence.ownerId, ownerId)).orderBy(desc(taskEvidence.createdAt)),
    db.select().from(propertyExpenses).where(eq(propertyExpenses.ownerId, ownerId)).orderBy(desc(propertyExpenses.updatedAt)),
    db.select({ event: activityEvents, actorName: users.name }).from(activityEvents).innerJoin(users, eq(activityEvents.actorId, users.id)).where(eq(activityEvents.ownerId, ownerId)).orderBy(desc(activityEvents.createdAt)).limit(40),
  ]);
  const metrics = {
    activeProperties: portfolio.filter(item => item.status === "active").length,
    openTasks: tasks.filter(item => item.status !== "done").length,
    evidenceCount: evidence.length,
    approvedExpenseCents: expenses.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amountCents, 0),
  };
  return { properties: portfolio, tasks, evidence, expenses, events: rawEvents.map(({ event, actorName }) => ({ ...event, actorName: actorName ?? "Usuario autenticado" })), metrics };
}

export async function createProperty(ownerId: number, input: { name: string; address: string; propertyType: string; status: "active" | "maintenance" | "archived" }) {
  const db = await databaseOrThrow();
  const result = await db.insert(properties).values({ ownerId, ...input });
  const id = Number(result[0].insertId);
  const property = await getOwnedProperty(ownerId, id);
  await appendActivity(ownerId, id, "property", id, "property.created", { name: property.name });
  return property;
}

export async function updatePropertyStatus(ownerId: number, propertyId: number, status: "active" | "maintenance" | "archived") {
  const db = await databaseOrThrow();
  await getOwnedProperty(ownerId, propertyId);
  await db.update(properties).set({ status }).where(and(eq(properties.id, propertyId), eq(properties.ownerId, ownerId)));
  await appendActivity(ownerId, propertyId, "property", propertyId, "property.status_changed", { status });
  return getOwnedProperty(ownerId, propertyId);
}

export async function createTask(ownerId: number, input: { propertyId: number; title: string; description: string; priority: "low" | "medium" | "high" | "urgent"; dueAt?: number }) {
  const db = await databaseOrThrow();
  await getOwnedProperty(ownerId, input.propertyId);
  const result = await db.insert(propertyTasks).values({ ...input, ownerId, dueAt: input.dueAt ? new Date(input.dueAt) : null });
  const id = Number(result[0].insertId);
  const task = await getOwnedTask(ownerId, id);
  await appendActivity(ownerId, task.propertyId, "task", id, "task.created", { title: task.title, priority: task.priority });
  return task;
}

export async function updateTaskStatus(ownerId: number, taskId: number, status: "todo" | "in_progress" | "blocked" | "done") {
  const db = await databaseOrThrow();
  const task = await getOwnedTask(ownerId, taskId);
  await db.update(propertyTasks).set({ status }).where(and(eq(propertyTasks.id, taskId), eq(propertyTasks.ownerId, ownerId)));
  await appendActivity(ownerId, task.propertyId, "task", taskId, "task.status_changed", { status });
  return getOwnedTask(ownerId, taskId);
}

export async function createEvidence(ownerId: number, input: { taskId: number; type: "note" | "photo" | "document"; description: string; fileUrl?: string }) {
  const db = await databaseOrThrow();
  const task = await getOwnedTask(ownerId, input.taskId);
  const result = await db.insert(taskEvidence).values({ ...input, ownerId, fileUrl: input.fileUrl || null });
  const id = Number(result[0].insertId);
  const evidence = (await db.select().from(taskEvidence).where(and(eq(taskEvidence.id, id), eq(taskEvidence.ownerId, ownerId))).limit(1))[0];
  await appendActivity(ownerId, task.propertyId, "evidence", id, "evidence.created", { type: evidence.type });
  return evidence;
}

export async function createExpense(ownerId: number, input: { propertyId: number; taskId?: number; description: string; amountCents: number }) {
  const db = await databaseOrThrow();
  await getOwnedProperty(ownerId, input.propertyId);
  if (input.taskId) {
    const task = await getOwnedTask(ownerId, input.taskId);
    if (task.propertyId !== input.propertyId) throw new Error("La tarea no pertenece a la propiedad");
  }
  const result = await db.insert(propertyExpenses).values({ ...input, ownerId, taskId: input.taskId ?? null });
  const id = Number(result[0].insertId);
  const expense = (await db.select().from(propertyExpenses).where(and(eq(propertyExpenses.id, id), eq(propertyExpenses.ownerId, ownerId))).limit(1))[0];
  await appendActivity(ownerId, input.propertyId, "expense", id, "expense.created", { amountCents: expense.amountCents });
  return expense;
}

export async function createManualExpenseChallenge(ownerId: number, expenseId: number, status: ManualExpenseDecisionStatus, sessionHash: string) {
  const db = await databaseOrThrow();
  const expense = (await db.select().from(propertyExpenses).where(and(eq(propertyExpenses.id, expenseId), eq(propertyExpenses.ownerId, ownerId))).limit(1))[0];
  if (!expense) throw new Error("Gasto no encontrado");
  if (expense.status !== "pending") throw new Error("El gasto ya tiene una decisión y no puede volver a confirmarse");
  const nonce = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const result = await db.insert(expenseDecisionChallenges).values({ ownerId, expenseId, status, nonce, sessionHash, expiresAt });
  return { id: Number(result[0].insertId), nonce, expiresAt };
}

export async function decideExpenseManually(ownerId: number, expenseId: number, status: ManualExpenseDecisionStatus, confirmation: string, challengeId: number, nonce: string, sessionHash: string) {
  const db = await databaseOrThrow();
  assertManualExpenseDecision(ownerId, status, confirmation);
  const expense = (await db.select().from(propertyExpenses).where(and(eq(propertyExpenses.id, expenseId), eq(propertyExpenses.ownerId, ownerId))).limit(1))[0];
  if (!expense) throw new Error("Gasto no encontrado");
  if (expense.status !== "pending") throw new Error("El gasto ya tiene una decisión");
  const challenge = (await db.select().from(expenseDecisionChallenges).where(and(eq(expenseDecisionChallenges.id, challengeId), eq(expenseDecisionChallenges.ownerId, ownerId), eq(expenseDecisionChallenges.expenseId, expenseId))).limit(1))[0];
  if (!challenge) throw new Error("El desafío manual no fue encontrado");
  assertUsableExpenseChallenge({ challengeOwnerId: challenge.ownerId, expenseId: challenge.expenseId, status: challenge.status, nonce: challenge.nonce, sessionHash: challenge.sessionHash, expiresAt: challenge.expiresAt, consumedAt: challenge.consumedAt }, { ownerId, expenseId, status, nonce, sessionHash, now: new Date() });
  const consumed = await db.update(expenseDecisionChallenges).set({ consumedAt: new Date() }).where(and(eq(expenseDecisionChallenges.id, challengeId), eq(expenseDecisionChallenges.ownerId, ownerId), eq(expenseDecisionChallenges.expenseId, expenseId), eq(expenseDecisionChallenges.status, status), eq(expenseDecisionChallenges.nonce, nonce), isNull(expenseDecisionChallenges.consumedAt), gt(expenseDecisionChallenges.expiresAt, new Date())));
  if (!consumed[0].affectedRows) throw new Error("La confirmación manual venció o ya fue utilizada");
  const decided = await db.update(propertyExpenses).set({ status, decisionByUserId: ownerId, decidedAt: new Date() }).where(and(eq(propertyExpenses.id, expenseId), eq(propertyExpenses.ownerId, ownerId), eq(propertyExpenses.status, "pending")));
  if (!decided[0].affectedRows) throw new Error("El gasto ya tiene una decisión");
  await appendActivity(ownerId, expense.propertyId, "expense", expenseId, `expense.manually_${status}`, { decidedBy: ownerId, decisionMode: "manual_ui" });
  return (await db.select().from(propertyExpenses).where(and(eq(propertyExpenses.id, expenseId), eq(propertyExpenses.ownerId, ownerId))).limit(1))[0];
}

export async function getOwnerReport(ownerId: number, propertyId: number) {
  const db = await databaseOrThrow();
  const property = await getOwnedProperty(ownerId, propertyId);
  const [tasks, expenses] = await Promise.all([
    db.select().from(propertyTasks).where(and(eq(propertyTasks.ownerId, ownerId), eq(propertyTasks.propertyId, propertyId))),
    db.select().from(propertyExpenses).where(and(eq(propertyExpenses.ownerId, ownerId), eq(propertyExpenses.propertyId, propertyId))),
  ]);
  const evidence = await db.select().from(taskEvidence).where(eq(taskEvidence.ownerId, ownerId));
  const propertyTaskIds = new Set(tasks.map(task => task.id));
  const linkedEvidence = evidence.filter(item => propertyTaskIds.has(item.taskId));
  const pending = tasks.filter(task => task.status !== "done").sort((a, b) => Number(a.dueAt ?? new Date("9999-12-31")) - Number(b.dueAt ?? new Date("9999-12-31"))).slice(0, 5);
  return {
    property,
    generatedAt: new Date(),
    metrics: {
      completedTasks: tasks.filter(task => task.status === "done").length,
      openTasks: tasks.filter(task => task.status !== "done").length,
      blockedTasks: tasks.filter(task => task.status === "blocked").length,
      evidenceCount: linkedEvidence.length,
      approvedExpenseCents: expenses.filter(expense => expense.status === "approved").reduce((sum, expense) => sum + expense.amountCents, 0),
    },
    nextSteps: pending.map(task => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt })),
  };
}
