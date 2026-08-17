import { describe, expect, it } from "vitest";
import { assertNotificationOwned, buildNotificationPlan, defaultNotificationPreferences, isNotificationPreferenceKey, notificationReadAt, shouldNotify } from "./notificationRules";

describe("notification rules", () => {
  it("enables operational alerts by default but leaves evidence alerts opt-in", () => {
    expect(shouldNotify(defaultNotificationPreferences, "task.created")).toBe(true);
    expect(shouldNotify(defaultNotificationPreferences, "expense.pending_review")).toBe(true);
    expect(shouldNotify(defaultNotificationPreferences, "evidence.created")).toBe(false);
  });

  it("allows a user to suppress a specific notification category", () => {
    const preferences = { ...defaultNotificationPreferences, urgentTasks: false };
    expect(shouldNotify(preferences, "task.urgent")).toBe(false);
    expect(shouldNotify(preferences, "task.status_changed")).toBe(true);
  });

  it("keeps notifications informational and separate from expense decisions", () => {
    expect(shouldNotify(defaultNotificationPreferences, "expense.pending_review")).toBe(true);
    expect(shouldNotify(defaultNotificationPreferences, "expense.manually_approved")).toBe(true);
  });

  it("accepts only explicit preference keys", () => {
    expect(isNotificationPreferenceKey("expenseReview")).toBe(true);
    expect(isNotificationPreferenceKey("approveExpense")).toBe(false);
  });

  it("rejects attempts to read a notification owned by another user", () => {
    expect(() => assertNotificationOwned(41, 42)).toThrow("Notificación no encontrada");
    expect(() => assertNotificationOwned(41, 41)).not.toThrow();
  });

  it("creates an alert plan only when the matching preference is enabled", () => {
    const plan = { kind: "evidence.created" as const, category: "evidence" as const, propertyId: 7, entityId: 9, title: "Evidencia registrada", content: "Una nota fue registrada." };
    expect(buildNotificationPlan(defaultNotificationPreferences, plan)).toBeNull();
    expect(buildNotificationPlan({ ...defaultNotificationPreferences, evidenceEvents: true }, plan)).toEqual(plan);
  });

  it("marks a notification as read only for its owner and preserves the first timestamp", () => {
    const now = new Date("2026-08-17T22:35:00.000Z");
    expect(notificationReadAt(8, 8, null, now)).toEqual(now);
    const prior = new Date("2026-08-17T22:30:00.000Z");
    expect(notificationReadAt(8, 8, prior, now)).toEqual(prior);
    expect(() => notificationReadAt(8, 9, null, now)).toThrow("Notificación no encontrada");
  });
});
