import { describe, expect, it } from "vitest";
import { assertAppendOnlyActivity, assertManualExpenseDecision, assertOwnedByUser, assertUsableExpenseChallenge } from "./propertyOpsRules";

describe("PropertyOps security rules", () => {
  it("rejects cross-user resource access", () => {
    expect(() => assertOwnedByUser(10, 11)).toThrow("No tienes acceso");
    expect(() => assertOwnedByUser(10, 10)).not.toThrow();
  });

  it("allows only a human authenticated decision to approve or reject expenses", () => {
    expect(assertManualExpenseDecision(4, "approved", "APROBAR")).toBe("approved");
    expect(assertManualExpenseDecision(4, "rejected", "RECHAZAR")).toBe("rejected");
    expect(() => assertManualExpenseDecision(0, "approved", "APROBAR")).toThrow("usuario autenticado");
    expect(() => assertManualExpenseDecision(4, "approved", "CONFIRMO")).toThrow("Escribe APROBAR");
  });

  it("keeps the audit contract append-only", () => {
    expect(() => assertAppendOnlyActivity("insert")).not.toThrow();
    expect(() => assertAppendOnlyActivity("update")).toThrow("append-only");
    expect(() => assertAppendOnlyActivity("delete")).toThrow("append-only");
  });

  it("rejects expired, reused or mismatched manual challenges", () => {
    const valid = { challengeOwnerId: 4, expenseId: 8, status: "approved" as const, nonce: "unique-nonce", sessionHash: "session-a", expiresAt: new Date("2030-01-01T00:05:00Z"), consumedAt: null };
    const expected = { ownerId: 4, expenseId: 8, status: "approved" as const, nonce: "unique-nonce", sessionHash: "session-a", now: new Date("2030-01-01T00:00:00Z") };
    expect(() => assertUsableExpenseChallenge(valid, expected)).not.toThrow();
    expect(() => assertUsableExpenseChallenge({ ...valid, consumedAt: new Date() }, expected)).toThrow("ya fue utilizado");
    expect(() => assertUsableExpenseChallenge({ ...valid, expiresAt: new Date("2029-12-31T23:59:59Z") }, expected)).toThrow("venció");
    expect(() => assertUsableExpenseChallenge({ ...valid, challengeOwnerId: 99 }, expected)).toThrow("no pertenece");
    expect(() => assertUsableExpenseChallenge({ ...valid, sessionHash: "session-b" }, expected)).toThrow("sesión actual");
  });
});
