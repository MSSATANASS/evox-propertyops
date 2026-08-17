import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  address: text("address").notNull(),
  propertyType: varchar("propertyType", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["active", "maintenance", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("properties_owner_updated_idx").on(table.ownerId, table.updatedAt)]);

export const propertyTasks = mysqlTable("property_tasks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["todo", "in_progress", "blocked", "done"]).default("todo").notNull(),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("tasks_owner_property_idx").on(table.ownerId, table.propertyId), index("tasks_owner_status_idx").on(table.ownerId, table.status)]);

export const taskEvidence = mysqlTable("task_evidence", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  taskId: int("taskId").notNull().references(() => propertyTasks.id),
  type: mysqlEnum("type", ["note", "photo", "document"]).notNull(),
  description: text("description").notNull(),
  fileUrl: varchar("fileUrl", { length: 2048 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("evidence_owner_task_idx").on(table.ownerId, table.taskId)]);

export const propertyExpenses = mysqlTable("property_expenses", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  taskId: int("taskId").references(() => propertyTasks.id),
  description: varchar("description", { length: 240 }).notNull(),
  amountCents: int("amountCents").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  decisionByUserId: int("decisionByUserId").references(() => users.id),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("expenses_owner_property_idx").on(table.ownerId, table.propertyId), index("expenses_owner_status_idx").on(table.ownerId, table.status)]);

export const expenseDecisionChallenges = mysqlTable("expense_decision_challenges", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  expenseId: int("expenseId").notNull().references(() => propertyExpenses.id),
  status: mysqlEnum("status", ["approved", "rejected"]).notNull(),
  nonce: varchar("nonce", { length: 128 }).notNull(),
  sessionHash: varchar("sessionHash", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("expense_challenge_owner_expense_idx").on(table.ownerId, table.expenseId), uniqueIndex("expense_challenge_nonce_unique").on(table.nonce)]);

export const activityEvents = mysqlTable("activity_events", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  actorId: int("actorId").notNull().references(() => users.id),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  entityType: mysqlEnum("entityType", ["property", "task", "evidence", "expense"]).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("events_owner_property_created_idx").on(table.ownerId, table.propertyId, table.createdAt)]);

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  propertyUpdates: boolean("propertyUpdates").default(true).notNull(),
  taskUpdates: boolean("taskUpdates").default(true).notNull(),
  urgentTasks: boolean("urgentTasks").default(true).notNull(),
  evidenceEvents: boolean("evidenceEvents").default(false).notNull(),
  expenseReview: boolean("expenseReview").default(true).notNull(),
  expenseDecisions: boolean("expenseDecisions").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("notification_preferences_owner_unique").on(table.ownerId)]);

export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  propertyId: int("propertyId").references(() => properties.id),
  category: mysqlEnum("category", ["property", "task", "evidence", "expense", "system"]).notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  title: varchar("title", { length: 180 }).notNull(),
  content: text("content").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("notifications_owner_read_created_idx").on(table.ownerId, table.readAt, table.createdAt),
  index("notifications_owner_created_idx").on(table.ownerId, table.createdAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
