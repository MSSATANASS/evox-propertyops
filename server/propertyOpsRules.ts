export const manualExpenseDecisionStatuses = ["approved", "rejected"] as const;
export type ManualExpenseDecisionStatus = (typeof manualExpenseDecisionStatuses)[number];

export function assertManualExpenseDecision(actorId: number, status: ManualExpenseDecisionStatus, confirmation: string) {
  if (!Number.isInteger(actorId) || actorId <= 0) throw new Error("Un usuario autenticado debe decidir el gasto");
  if (!manualExpenseDecisionStatuses.includes(status)) throw new Error("La decisión manual debe ser aprobar o rechazar");
  const expected = status === "approved" ? "APROBAR" : "RECHAZAR";
  if (confirmation.trim().toUpperCase() !== expected) throw new Error(`Escribe ${expected} para confirmar la decisión manual`);
  return status;
}

export function assertOwnedByUser(ownerId: number, userId: number) {
  if (ownerId !== userId) throw new Error("No tienes acceso a este recurso");
}

export function assertAppendOnlyActivity(operation: "insert" | "update" | "delete") {
  if (operation !== "insert") throw new Error("El historial de actividad es append-only");
}

export function assertUsableExpenseChallenge(input: { challengeOwnerId: number; expenseId: number; status: ManualExpenseDecisionStatus; nonce: string; sessionHash: string; expiresAt: Date; consumedAt: Date | null }, expected: { ownerId: number; expenseId: number; status: ManualExpenseDecisionStatus; nonce: string; sessionHash: string; now: Date }) {
  if (input.challengeOwnerId !== expected.ownerId || input.expenseId !== expected.expenseId) throw new Error("El desafío no pertenece a esta sesión o gasto");
  if (input.status !== expected.status || input.nonce !== expected.nonce) throw new Error("El desafío no coincide con la decisión solicitada");
  if (input.sessionHash !== expected.sessionHash) throw new Error("El desafío no pertenece a la sesión actual");
  if (input.consumedAt) throw new Error("El desafío ya fue utilizado");
  if (input.expiresAt <= expected.now) throw new Error("El desafío venció");
}
