import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { z } from "zod";
import { createEvidence, createExpense, createManualExpenseChallenge, createProperty, createTask, decideExpenseManually, getOwnerReport, listDashboard, updatePropertyStatus, updateTaskStatus } from "../db";
import { manualExpenseDecisionStatuses } from "../propertyOpsRules";
import { protectedProcedure, router } from "../_core/trpc";

const id = z.number().int().positive();
const propertyStatuses = ["active", "maintenance", "archived"] as const;
const taskStatuses = ["todo", "in_progress", "blocked", "done"] as const;
const taskPriorities = ["low", "medium", "high", "urgent"] as const;

function translateError(error: unknown): never {
  const message = error instanceof Error ? error.message : "No se pudo completar la operación";
  const code = /no encontrada|no encontrado|acceso|pertenece/.test(message) ? "NOT_FOUND" : "BAD_REQUEST";
  throw new TRPCError({ code, message });
}

function sessionHashFromRequest(req: { headers: { cookie?: string; authorization?: string } }) {
  const binding = typeof req.headers.cookie === "string" ? req.headers.cookie : typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (!binding) throw new TRPCError({ code: "UNAUTHORIZED", message: "No se pudo verificar la sesión activa" });
  return createHash("sha256").update(binding).digest("hex");
}

export const propertyOpsRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => listDashboard(ctx.user.id)),
  createProperty: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), address: z.string().trim().min(3).max(1000), propertyType: z.string().trim().min(2).max(80), status: z.enum(propertyStatuses) })).mutation(({ ctx, input }) => {
    return createProperty(ctx.user.id, input).catch(translateError);
  }),
  updatePropertyStatus: protectedProcedure.input(z.object({ propertyId: id, status: z.enum(propertyStatuses) })).mutation(({ ctx, input }) => {
    return updatePropertyStatus(ctx.user.id, input.propertyId, input.status).catch(translateError);
  }),
  createTask: protectedProcedure.input(z.object({ propertyId: id, title: z.string().trim().min(3).max(160), description: z.string().trim().min(3).max(4000), priority: z.enum(taskPriorities), dueAt: z.number().int().positive().optional() })).mutation(({ ctx, input }) => {
    return createTask(ctx.user.id, input).catch(translateError);
  }),
  updateTaskStatus: protectedProcedure.input(z.object({ taskId: id, status: z.enum(taskStatuses) })).mutation(({ ctx, input }) => {
    return updateTaskStatus(ctx.user.id, input.taskId, input.status).catch(translateError);
  }),
  createEvidence: protectedProcedure.input(z.object({ taskId: id, type: z.enum(["note", "photo", "document"]), description: z.string().trim().min(3).max(4000), fileUrl: z.string().url().max(2048).optional() })).mutation(({ ctx, input }) => {
    return createEvidence(ctx.user.id, input).catch(translateError);
  }),
  createExpense: protectedProcedure.input(z.object({ propertyId: id, taskId: id.optional(), description: z.string().trim().min(3).max(240), amountCents: z.number().int().positive().max(100_000_000) })).mutation(({ ctx, input }) => {
    return createExpense(ctx.user.id, input).catch(translateError);
  }),
  createManualExpenseChallenge: protectedProcedure.input(z.object({ expenseId: id, status: z.enum(manualExpenseDecisionStatuses) })).mutation(({ ctx, input }) => {
    return createManualExpenseChallenge(ctx.user.id, input.expenseId, input.status, sessionHashFromRequest(ctx.req)).catch(translateError);
  }),
  decideExpenseManually: protectedProcedure.input(z.object({ expenseId: id, status: z.enum(manualExpenseDecisionStatuses), confirmation: z.string().min(1).max(16), challengeId: id, nonce: z.string().min(20).max(128) })).mutation(({ ctx, input }) => {
    return decideExpenseManually(ctx.user.id, input.expenseId, input.status, input.confirmation, input.challengeId, input.nonce, sessionHashFromRequest(ctx.req)).catch(translateError);
  }),
  ownerReport: protectedProcedure.input(z.object({ propertyId: id })).query(({ ctx, input }) => getOwnerReport(ctx.user.id, input.propertyId).catch(translateError)),
});
