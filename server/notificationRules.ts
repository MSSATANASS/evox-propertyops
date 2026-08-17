export const notificationPreferenceKeys = [
  "propertyUpdates",
  "taskUpdates",
  "urgentTasks",
  "evidenceEvents",
  "expenseReview",
  "expenseDecisions",
] as const;

export type NotificationPreferenceKey = (typeof notificationPreferenceKeys)[number];
export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  propertyUpdates: true,
  taskUpdates: true,
  urgentTasks: true,
  evidenceEvents: false,
  expenseReview: true,
  expenseDecisions: true,
};

export type NotificationKind =
  | "property.created"
  | "property.status_changed"
  | "task.created"
  | "task.status_changed"
  | "task.urgent"
  | "evidence.created"
  | "expense.pending_review"
  | "expense.manually_approved"
  | "expense.manually_rejected";

export type NotificationPlan = {
  kind: NotificationKind;
  category: "property" | "task" | "evidence" | "expense";
  propertyId?: number;
  entityId?: number;
  title: string;
  content: string;
};

const preferenceForEvent: Record<NotificationKind, NotificationPreferenceKey> = {
  "property.created": "propertyUpdates",
  "property.status_changed": "propertyUpdates",
  "task.created": "taskUpdates",
  "task.status_changed": "taskUpdates",
  "task.urgent": "urgentTasks",
  "evidence.created": "evidenceEvents",
  "expense.pending_review": "expenseReview",
  "expense.manually_approved": "expenseDecisions",
  "expense.manually_rejected": "expenseDecisions",
};

export function shouldNotify(preferences: NotificationPreferences, event: NotificationKind) {
  return preferences[preferenceForEvent[event]];
}

export function buildNotificationPlan(preferences: NotificationPreferences, input: NotificationPlan) {
  return shouldNotify(preferences, input.kind) ? input : null;
}

export function isNotificationPreferenceKey(value: string): value is NotificationPreferenceKey {
  return (notificationPreferenceKeys as readonly string[]).includes(value);
}

export function assertNotificationOwned(notificationOwnerId: number, requestOwnerId: number) {
  if (notificationOwnerId !== requestOwnerId) throw new Error("Notificación no encontrada");
}

export function notificationReadAt(notificationOwnerId: number, requestOwnerId: number, currentReadAt: Date | null, now: Date) {
  assertNotificationOwned(notificationOwnerId, requestOwnerId);
  return currentReadAt ?? now;
}
