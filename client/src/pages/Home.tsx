import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import {
  Bell,
  Building2,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  Home as HomeIcon,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  Settings2,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const priorityLabels: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };

type Decision = {
  expenseId: number;
  status: "approved" | "rejected";
  confirmation: string;
  challengeId: number;
  nonce: string;
  expiresAt: Date;
};

type RouterOutput = inferRouterOutputs<AppRouter>;
type OwnerReport = RouterOutput["propertyOps"]["ownerReport"];
type UserNotification = RouterOutput["propertyOps"]["notifications"][number];
type NotificationPreferenceKey = "propertyUpdates" | "taskUpdates" | "urgentTasks" | "evidenceEvents" | "expenseReview" | "expenseDecisions";
type NotificationPreferences = RouterOutput["propertyOps"]["notificationPreferences"];

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const dashboard = trpc.propertyOps.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const notificationPreferences = trpc.propertyOps.notificationPreferences.useQuery(undefined, { enabled: isAuthenticated });
  const notifications = trpc.propertyOps.notifications.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [propertyForm, setPropertyForm] = useState({ name: "", address: "", propertyType: "Casa", status: "active" as "active" | "maintenance" | "archived" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium" as "low" | "medium" | "high" | "urgent", dueDate: "" });
  const [evidenceForm, setEvidenceForm] = useState({ taskId: "", type: "note" as "note" | "photo" | "document", description: "", fileUrl: "" });
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "" });
  const [decision, setDecision] = useState<Decision | null>(null);

  const refresh = () => Promise.all([utils.propertyOps.dashboard.invalidate(), utils.propertyOps.ownerReport.invalidate(), utils.propertyOps.notifications.invalidate()]);
  const updatePreferences = trpc.propertyOps.updateNotificationPreferences.useMutation({
    onSuccess: () => { toast.success("Preferencias de notificación actualizadas"); utils.propertyOps.notificationPreferences.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const markNotificationRead = trpc.propertyOps.markNotificationRead.useMutation({
    onSuccess: () => utils.propertyOps.notifications.invalidate(),
    onError: error => toast.error(error.message),
  });
  const markAllNotificationsRead = trpc.propertyOps.markAllNotificationsRead.useMutation({
    onSuccess: () => { toast.success("Notificaciones marcadas como leídas"); utils.propertyOps.notifications.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const createProperty = trpc.propertyOps.createProperty.useMutation({
    onSuccess: () => { toast.success("Propiedad registrada"); setPropertyForm({ name: "", address: "", propertyType: "Casa", status: "active" }); refresh(); },
    onError: error => toast.error(error.message),
  });
  const updateProperty = trpc.propertyOps.updatePropertyStatus.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const createTask = trpc.propertyOps.createTask.useMutation({
    onSuccess: () => { toast.success("Tarea creada"); setTaskForm({ title: "", description: "", priority: "medium", dueDate: "" }); refresh(); },
    onError: error => toast.error(error.message),
  });
  const updateTask = trpc.propertyOps.updateTaskStatus.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const createEvidence = trpc.propertyOps.createEvidence.useMutation({
    onSuccess: () => { toast.success("Evidencia registrada"); setEvidenceForm({ taskId: "", type: "note", description: "", fileUrl: "" }); refresh(); },
    onError: error => toast.error(error.message),
  });
  const createExpense = trpc.propertyOps.createExpense.useMutation({
    onSuccess: () => { toast.success("Gasto enviado a revisión humana"); setExpenseForm({ description: "", amount: "" }); refresh(); },
    onError: error => toast.error(error.message),
  });
  const createChallenge = trpc.propertyOps.createManualExpenseChallenge.useMutation({
    onSuccess: (challenge, input) => setDecision({ expenseId: input.expenseId, status: input.status, confirmation: "", challengeId: challenge.id, nonce: challenge.nonce, expiresAt: challenge.expiresAt }),
    onError: error => toast.error(error.message),
  });
  const decideExpense = trpc.propertyOps.decideExpenseManually.useMutation({
    onSuccess: (_, input) => { toast.success(input.status === "approved" ? "Gasto aprobado manualmente" : "Gasto rechazado manualmente"); setDecision(null); refresh(); },
    onError: error => toast.error(error.message),
  });

  const properties = dashboard.data?.properties ?? [];
  const selectedProperty = properties.find(property => property.id === selectedId) ?? properties[0];
  const propertyId = selectedProperty?.id ?? 0;
  const report = trpc.propertyOps.ownerReport.useQuery({ propertyId }, { enabled: propertyId > 0 });
  const propertyTasks = useMemo(() => (dashboard.data?.tasks ?? []).filter(task => task.propertyId === propertyId), [dashboard.data?.tasks, propertyId]);
  const propertyEvidence = useMemo(() => {
    const ids = new Set(propertyTasks.map(task => task.id));
    return (dashboard.data?.evidence ?? []).filter(item => ids.has(item.taskId));
  }, [dashboard.data?.evidence, propertyTasks]);
  const propertyExpenses = useMemo(() => (dashboard.data?.expenses ?? []).filter(expense => expense.propertyId === propertyId), [dashboard.data?.expenses, propertyId]);
  const propertyEvents = useMemo(() => (dashboard.data?.events ?? []).filter(event => event.propertyId === propertyId), [dashboard.data?.events, propertyId]);
  const unreadNotifications = useMemo(() => (notifications.data ?? []).filter(notification => !notification.readAt).length, [notifications.data]);
  const previewState = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("evox-preview") : null;

  if (previewState === "loading") return <LoadingScreen />;
  if (previewState === "error") return <ErrorScreen retry={() => dashboard.refetch()} />;
  if (loading || (isAuthenticated && dashboard.isLoading)) return <LoadingScreen />;
  if (!isAuthenticated) return <SignInScreen />;
  if (dashboard.isError) return <ErrorScreen retry={() => dashboard.refetch()} />;

  const metrics = dashboard.data?.metrics ?? { activeProperties: 0, openTasks: 0, evidenceCount: 0, approvedExpenseCents: 0 };
  const expectedDecision = decision?.status === "approved" ? "APROBAR" : "RECHAZAR";

  return <div className="evox-shell min-h-screen text-[#f1f4ed]">
    <div className="evox-grid fixed inset-0 pointer-events-none opacity-50" />
    <header className="relative z-10 flex h-16 items-center justify-between border-b border-white/10 bg-[#07100d]/85 px-4 backdrop-blur-xl lg:px-7">
      <div className="flex items-center gap-3"><Brand /><div className="hidden sm:block"><p className="text-sm font-medium">{user?.name || "Operador"}</p><p className="text-[11px] text-[#94a39b]">Sesión protegida</p></div></div>
      <div className="flex items-center gap-2"><NotificationCenter notifications={notifications.data ?? []} preferences={notificationPreferences.data} unreadCount={unreadNotifications} preferencesPending={updatePreferences.isPending} onPreferenceChange={(key, enabled) => updatePreferences.mutate({ [key]: enabled } as Partial<Record<NotificationPreferenceKey, boolean>>)} onMarkRead={notificationId => markNotificationRead.mutate({ notificationId })} onMarkAllRead={() => markAllNotificationsRead.mutate()} /><button onClick={() => logout()} className="evox-ghost inline-flex h-9 items-center gap-2 px-3 text-xs"><LogOut size={14} />Salir</button></div>
    </header>

    <div className="relative z-10 mx-auto grid max-w-[1600px] gap-5 p-4 lg:grid-cols-[265px_minmax(0,1fr)] lg:p-6">
      <aside className="evox-card evox-enter h-fit rounded-2xl p-3 lg:sticky lg:top-6">
        <div className="border-b border-white/10 px-3 pb-4"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#c9ff4a]">Portafolio</p><p className="mt-1 text-sm text-[#94a39b]">{properties.length} propiedades registradas</p></div>
        <nav className="mt-3 grid gap-1" aria-label="Propiedades">
          {properties.map(property => <button key={property.id} onClick={() => setSelectedId(property.id)} className={`rounded-xl border px-3 py-3 text-left transition ${property.id === selectedProperty?.id ? "evox-side-active" : "border-transparent hover:bg-white/[.035]"}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{property.name}</span><span className={`h-2 w-2 rounded-full ${property.status === "active" ? "bg-[#c9ff4a]" : property.status === "maintenance" ? "bg-amber-300" : "bg-[#60736a]"}`} /></div><p className="mt-1 truncate text-xs text-[#94a39b]">{property.propertyType} · {property.address}</p></button>)}
        </nav>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); createProperty.mutate(propertyForm); }} className="mt-4 border-t border-white/10 px-2 pt-4"><p className="text-xs font-semibold">Añadir propiedad</p><input className="evox-input mt-3 text-sm" value={propertyForm.name} onChange={event => setPropertyForm({ ...propertyForm, name: event.target.value })} placeholder="Nombre operativo" required /><input className="evox-input mt-2 text-sm" value={propertyForm.address} onChange={event => setPropertyForm({ ...propertyForm, address: event.target.value })} placeholder="Dirección o zona" required /><div className="mt-2 grid grid-cols-2 gap-2"><input className="evox-input text-sm" value={propertyForm.propertyType} onChange={event => setPropertyForm({ ...propertyForm, propertyType: event.target.value })} placeholder="Tipo" required /><select className="evox-input text-sm" value={propertyForm.status} onChange={event => setPropertyForm({ ...propertyForm, status: event.target.value as typeof propertyForm.status })}><option value="active">Activa</option><option value="maintenance">Mantenimiento</option><option value="archived">Archivada</option></select></div><button disabled={createProperty.isPending} className="evox-button mt-3 flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs"><Plus size={14} />{createProperty.isPending ? "Guardando…" : "Registrar"}</button></form>
      </aside>

      <main className="min-w-0">
        <section className="evox-enter flex flex-col justify-between gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#c9ff4a]">Control operacional</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.055em] sm:text-4xl">La evidencia detrás de cada decisión.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#94a39b]">Propiedades, mantenimiento, evidencia y gastos en una sola operación. Los gastos nunca se autorizan automáticamente.</p></div><div className="rounded-xl border border-[#c9ff4a]/20 bg-[#c9ff4a]/[.06] px-4 py-3 text-xs leading-5 text-[#d9ff93]"><span className="font-semibold">Control humano activo.</span> Toda decisión requiere un desafío temporal, una confirmación escrita y una auditoría.</div></section>
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<HomeIcon size={16} />} label="Propiedades activas" value={String(metrics.activeProperties)} /><Metric icon={<ClipboardList size={16} />} label="Tareas abiertas" value={String(metrics.openTasks)} /><Metric icon={<FileCheck2 size={16} />} label="Evidencias" value={String(metrics.evidenceCount)} /><Metric icon={<CircleDollarSign size={16} />} label="Gasto aprobado" value={money.format(metrics.approvedExpenseCents / 100)} /></section>

        {!selectedProperty ? <EmptyPortfolio /> : <section className="mt-5">
          <section className="evox-card evox-enter rounded-2xl p-5"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#94a39b]"><MapPin size={13} />Propiedad seleccionada</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">{selectedProperty.name}</h2><p className="mt-1 text-sm text-[#94a39b]">{selectedProperty.address} · {selectedProperty.propertyType}</p></div><label className="text-xs text-[#94a39b]">Estado operativo<select aria-label="Estado operativo" className="evox-input mt-1 min-w-40 text-sm text-[#f1f4ed]" value={selectedProperty.status} onChange={event => updateProperty.mutate({ propertyId: selectedProperty.id, status: event.target.value as "active" | "maintenance" | "archived" })}><option value="active">Activa</option><option value="maintenance">Mantenimiento</option><option value="archived">Archivada</option></select></label></div></section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
            <section className="evox-card rounded-2xl p-5"><SectionHeading icon={<Wrench size={17} />} eyebrow="Mantenimiento" title="Tareas por propiedad" /><div className="mt-4 grid gap-3">{propertyTasks.length ? propertyTasks.map(task => <article key={task.id} className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{task.title}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${task.priority === "urgent" ? "border-red-300/30 text-red-200" : task.priority === "high" ? "border-amber-300/30 text-amber-100" : "border-white/15 text-[#a8b8af]"}`}>{priorityLabels[task.priority]}</span></div><p className="mt-1 text-sm leading-5 text-[#94a39b]">{task.description}</p><p className="mt-3 text-xs text-[#718279]">{task.dueAt ? `Límite ${dateFormat.format(new Date(task.dueAt))}` : "Sin fecha límite"}</p></div><select aria-label={`Estado de ${task.title}`} className="evox-input h-fit text-sm sm:w-36" value={task.status} onChange={event => updateTask.mutate({ taskId: task.id, status: event.target.value as "todo" | "in_progress" | "blocked" | "done" })}><option value="todo">Por hacer</option><option value="in_progress">En curso</option><option value="blocked">Bloqueada</option><option value="done">Completada</option></select></div></article>) : <EmptyState message="Aún no hay tareas. Crea la primera intervención operacional." />}</div><form onSubmit={(event: FormEvent) => { event.preventDefault(); createTask.mutate({ propertyId: selectedProperty.id, title: taskForm.title, description: taskForm.description, priority: taskForm.priority, dueAt: taskForm.dueDate ? new Date(`${taskForm.dueDate}T12:00:00.000Z`).getTime() : undefined }); }} className="mt-5 border-t border-white/10 pt-5"><p className="text-xs font-semibold text-[#c9ff4a]">Nueva tarea</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><input className="evox-input text-sm" value={taskForm.title} onChange={event => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Título de la tarea" required /><select className="evox-input text-sm" value={taskForm.priority} onChange={event => setTaskForm({ ...taskForm, priority: event.target.value as typeof taskForm.priority })}><option value="low">Baja prioridad</option><option value="medium">Media prioridad</option><option value="high">Alta prioridad</option><option value="urgent">Urgente</option></select><textarea className="evox-input min-h-22 text-sm sm:col-span-2" value={taskForm.description} onChange={event => setTaskForm({ ...taskForm, description: event.target.value })} placeholder="Contexto y criterio de cierre" required /><label className="text-xs text-[#94a39b]">Fecha límite<input type="date" className="evox-input mt-1 text-sm" value={taskForm.dueDate} onChange={event => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label></div><button disabled={createTask.isPending} className="evox-button mt-3 px-4 py-2.5 text-xs">{createTask.isPending ? "Creando…" : "Crear tarea"}</button></form></section>
            <div className="grid gap-5"><ReportCard report={report.data} loading={report.isLoading} /><EvidenceCard tasks={propertyTasks} evidence={propertyEvidence} form={evidenceForm} setForm={setEvidenceForm} pending={createEvidence.isPending} onSubmit={() => { const taskId = Number(evidenceForm.taskId || propertyTasks[0]?.id); if (!taskId) return toast.error("Crea o selecciona una tarea primero"); createEvidence.mutate({ taskId, type: evidenceForm.type, description: evidenceForm.description, fileUrl: evidenceForm.fileUrl || undefined }); }} /></div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <section className="evox-card rounded-2xl p-5"><SectionHeading icon={<CircleDollarSign size={17} />} eyebrow="Gastos" title="Revisión humana obligatoria" /><p className="mt-2 text-sm leading-5 text-[#94a39b]">La plataforma no usa IA ni automatizaciones para aprobar o rechazar gastos.</p><div className="mt-4 grid gap-2">{propertyExpenses.length ? propertyExpenses.map(expense => <article key={expense.id} className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold">{expense.description}</p><p className="mt-1 text-xs text-[#94a39b]">{money.format(expense.amountCents / 100)} · {expense.status === "pending" ? "Pendiente de decisión" : expense.status === "approved" ? "Aprobado manualmente" : "Rechazado manualmente"}</p></div>{expense.status === "pending" && <div className="flex gap-2"><button disabled={createChallenge.isPending} onClick={() => createChallenge.mutate({ expenseId: expense.id, status: "approved" })} className="rounded-lg border border-[#c9ff4a]/30 px-3 py-2 text-xs font-semibold text-[#d9ff93] disabled:opacity-50">Aprobar</button><button disabled={createChallenge.isPending} onClick={() => createChallenge.mutate({ expenseId: expense.id, status: "rejected" })} className="rounded-lg border border-red-300/30 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-50">Rechazar</button></div>}</div>{decision?.expenseId === expense.id && <div className="mt-3 rounded-lg border border-[#c9ff4a]/25 bg-[#c9ff4a]/[.055] p-3"><p className="text-xs leading-5 text-[#d9ff93]">Confirmación humana: escribe <strong>{expectedDecision}</strong>. El desafío vence a las {dateTimeFormat.format(new Date(decision.expiresAt))}, solo puede usarse una vez y queda auditado con tu identidad.</p><div className="mt-2 flex gap-2"><input className="evox-input h-9 text-xs" value={decision.confirmation} onChange={event => setDecision({ ...decision, confirmation: event.target.value })} placeholder={expectedDecision} /><button disabled={decideExpense.isPending || decision.confirmation.trim().toUpperCase() !== expectedDecision} onClick={() => decideExpense.mutate({ expenseId: decision.expenseId, status: decision.status, confirmation: decision.confirmation, challengeId: decision.challengeId, nonce: decision.nonce })} className="evox-button shrink-0 px-3 text-xs">Confirmar</button><button onClick={() => setDecision(null)} className="evox-ghost px-3 text-xs">Cancelar</button></div></div>}</article>) : <EmptyState message="No hay gastos. Cada gasto nuevo inicia como pendiente." />}</div><form onSubmit={(event: FormEvent) => { event.preventDefault(); const amountCents = Math.round(Number(expenseForm.amount) * 100); if (!Number.isFinite(amountCents) || amountCents <= 0) return toast.error("Introduce un monto válido"); createExpense.mutate({ propertyId: selectedProperty.id, description: expenseForm.description, amountCents }); }} className="mt-5 grid gap-2 border-t border-white/10 pt-5 sm:grid-cols-[1fr_9rem_auto]"><input className="evox-input text-sm" value={expenseForm.description} onChange={event => setExpenseForm({ ...expenseForm, description: event.target.value })} placeholder="Concepto del gasto" required /><input type="number" min="0.01" step="0.01" className="evox-input text-sm" value={expenseForm.amount} onChange={event => setExpenseForm({ ...expenseForm, amount: event.target.value })} placeholder="MXN" required /><button disabled={createExpense.isPending} className="evox-button px-4 py-2.5 text-xs">Registrar gasto</button></form></section>
            <section className="evox-card rounded-2xl p-5"><SectionHeading icon={<ShieldCheck size={17} />} eyebrow="Auditoría" title="Historial de actividad" /><div className="mt-4 grid gap-3">{propertyEvents.length ? propertyEvents.slice(0, 8).map(event => <div key={event.id} className="grid grid-cols-[10px_1fr] gap-3"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#c9ff4a] shadow-[0_0_12px_rgba(201,255,74,.6)]" /><div><p className="text-sm">{event.action.replaceAll(".", " · ").replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[#94a39b]">{event.actorName} · {dateTimeFormat.format(new Date(event.createdAt))}</p></div></div>) : <EmptyState message="El historial aparecerá al registrar la primera acción." />}</div><p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-[#94a39b]">Los eventos se insertan como registros append-only: actor, acción y timestamp no se editan desde la aplicación.</p></section>
          </div>
        </section>}
      </main>
    </div>
  </div>;
}

function Brand() { return <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#c9ff4a] text-[#0a130c]"><Building2 size={19} strokeWidth={2.5} /></div><div><p className="text-sm font-bold tracking-[-.04em]">evox</p><p className="-mt-1 font-mono text-[9px] uppercase tracking-[.18em] text-[#94a39b]">PropertyOps</p></div></div>; }
function NotificationCenter({ notifications, preferences, unreadCount, preferencesPending, onPreferenceChange, onMarkRead, onMarkAllRead }: { notifications: UserNotification[]; preferences: NotificationPreferences | undefined; unreadCount: number; preferencesPending: boolean; onPreferenceChange: (key: NotificationPreferenceKey, enabled: boolean) => void; onMarkRead: (notificationId: number) => void; onMarkAllRead: () => void }) {
  const preferenceItems: { key: NotificationPreferenceKey; label: string; description: string }[] = [
    { key: "propertyUpdates", label: "Propiedades", description: "Altas y cambios de estado" },
    { key: "taskUpdates", label: "Tareas", description: "Nuevas tareas y progreso" },
    { key: "urgentTasks", label: "Urgentes", description: "Intervenciones prioritarias" },
    { key: "evidenceEvents", label: "Evidencias", description: "Nuevos respaldos registrados" },
    { key: "expenseReview", label: "Revisión de gastos", description: "Gastos pendientes de decisión humana" },
    { key: "expenseDecisions", label: "Decisiones de gasto", description: "Confirmaciones manuales realizadas" },
  ];
  return <Popover><PopoverTrigger asChild><button aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`} className="evox-ghost relative inline-grid h-9 w-9 place-items-center" title="Notificaciones"><Bell size={16} />{unreadCount > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#c9ff4a] px-1 text-[9px] font-bold text-[#0a130c]">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button></PopoverTrigger><PopoverContent align="end" className="w-[min(92vw,25rem)] border-white/10 bg-[#0d1a14] p-0 text-[#f1f4ed] shadow-2xl shadow-black/50"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="text-sm font-semibold">Notificaciones</p><p className="text-[11px] text-[#94a39b]">Eventos operativos de tu cuenta</p></div><button disabled={!unreadCount} onClick={onMarkAllRead} className="evox-ghost inline-flex items-center gap-1 px-2 py-1 text-[10px] disabled:opacity-40"><CheckCheck size={13} />Leer todo</button></div><div className="max-h-64 overflow-y-auto p-2">{notifications.length ? notifications.map(notification => <button key={notification.id} onClick={() => !notification.readAt && onMarkRead(notification.id)} className={`w-full rounded-xl p-3 text-left transition hover:bg-white/[.05] ${notification.readAt ? "opacity-65" : "bg-[#c9ff4a]/[.055]"}`}><div className="flex gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-[#60736a]" : "bg-[#c9ff4a] shadow-[0_0_10px_rgba(201,255,74,.65)]"}`} /><div><p className="text-xs font-semibold">{notification.title}</p><p className="mt-1 text-[11px] leading-4 text-[#a8b8af]">{notification.content}</p><p className="mt-2 font-mono text-[9px] uppercase tracking-[.1em] text-[#718279]">{dateTimeFormat.format(new Date(notification.createdAt))}</p></div></div></button>) : <p className="px-3 py-6 text-center text-xs leading-5 text-[#94a39b]">Todavía no hay alertas operativas.</p>}</div><div className="border-t border-white/10 px-4 py-3"><div className="flex items-center gap-2"><Settings2 size={14} className="text-[#c9ff4a]" /><div><p className="text-xs font-semibold">Personalizar alertas</p><p className="text-[10px] text-[#94a39b]">Solo informan; nunca deciden gastos.</p></div></div><div className="mt-3 grid gap-2">{preferenceItems.map(item => <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/[.07] px-3 py-2"><label htmlFor={`notification-${item.key}`} className="min-w-0"><span className="block text-[11px] font-medium">{item.label}</span><span className="block text-[10px] text-[#94a39b]">{item.description}</span></label><Switch id={`notification-${item.key}`} checked={preferences?.[item.key] ?? false} disabled={!preferences || preferencesPending} onCheckedChange={enabled => onPreferenceChange(item.key, enabled)} /></div>)}</div></div></PopoverContent></Popover>;
}
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <article className="evox-card evox-enter rounded-2xl p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#94a39b]"><span className="text-[#c9ff4a]">{icon}</span>{label}</div><p className="mt-3 text-2xl font-semibold tracking-[-.045em]">{value}</p></article>; }
function SectionHeading({ icon, eyebrow, title }: { icon: ReactNode; eyebrow: string; title: string }) { return <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c9ff4a]/10 text-[#c9ff4a]">{icon}</span><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#94a39b]">{eyebrow}</p><h2 className="mt-0.5 text-lg font-semibold tracking-[-.025em]">{title}</h2></div></div>; }
function EmptyState({ message }: { message: string }) { return <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm leading-6 text-[#94a39b]">{message}</p>; }
function EmptyPortfolio() { return <section className="evox-card evox-enter mt-5 rounded-2xl p-10 text-center"><Building2 className="mx-auto text-[#c9ff4a]" size={30} /><h2 className="mt-4 text-xl font-semibold">Registra la primera propiedad del portafolio</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#94a39b]">La aplicación empezará a construir el historial auditable a partir de tu primera acción real.</p></section>; }
function LoadingScreen() { return <main className="evox-shell grid min-h-screen place-items-center"><div className="flex items-center gap-3 text-sm text-[#94a39b]"><Loader2 className="animate-spin text-[#c9ff4a]" size={18} />Inicializando operación…</div></main>; }
function ErrorScreen({ retry }: { retry: () => void }) { return <main className="evox-shell grid min-h-screen place-items-center p-6"><section className="evox-card max-w-md rounded-3xl p-8 text-center"><TriangleAlert className="mx-auto text-[#c9ff4a]" /><h1 className="mt-4 text-2xl font-semibold">No pudimos cargar el portafolio</h1><p className="mt-2 text-sm text-[#94a39b]">Ninguna propiedad ni gasto fue modificado. Vuelve a intentarlo.</p><button onClick={retry} className="evox-button mt-6 px-4 py-2.5">Reintentar</button></section></main>; }
function SignInScreen() { return <main className="evox-shell evox-grid grid min-h-screen place-items-center p-5"><section className="evox-card evox-enter max-w-xl rounded-3xl p-8 sm:p-12"><Brand /><p className="mt-8 font-mono text-[10px] uppercase tracking-[.22em] text-[#c9ff4a]">Evox PropertyOps</p><h1 className="mt-3 text-4xl font-semibold leading-[.95] tracking-[-.055em] sm:text-5xl">La operación de cada inmueble, con evidencia.</h1><p className="mt-5 max-w-lg text-sm leading-7 text-[#94a39b]">Gestiona propiedades, tareas, evidencias, gastos y reportes de propietario con aislamiento total de datos por usuario.</p><button onClick={() => startLogin()} className="evox-button mt-8 inline-flex items-center gap-2 px-5 py-3 text-sm">Entrar a PropertyOps <ChevronRight size={16} /></button><p className="mt-6 flex items-center gap-2 text-xs text-[#94a39b]"><ShieldCheck size={14} className="text-[#c9ff4a]" />OAuth de Manus · Datos aislados por cuenta</p></section></main>; }

function ReportCard({ report, loading }: { report: OwnerReport | undefined; loading: boolean }) { return <section className="rounded-2xl bg-[#c9ff4a] p-5 text-[#0a130c]"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em]">Reporte de propietario</p><h3 className="mt-2 text-xl font-bold tracking-[-.04em]">Resumen automático, datos verificables.</h3>{loading ? <Loader2 className="mt-5 animate-spin" size={20} /> : <><p className="mt-3 text-sm leading-6 text-[#254029]">Generado a partir de registros persistentes. No autoriza gastos ni altera actividad.</p><div className="mt-5 grid grid-cols-2 gap-2">{[["Completadas", report?.metrics.completedTasks ?? 0], ["Abiertas", report?.metrics.openTasks ?? 0], ["Bloqueadas", report?.metrics.blockedTasks ?? 0], ["Evidencias", report?.metrics.evidenceCount ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#0a130c]/10 p-3"><p className="text-[11px] text-[#315033]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div><div className="mt-5 border-t border-[#0a130c]/15 pt-4"><p className="text-xs font-bold uppercase tracking-[.12em]">Próximos pasos</p><div className="mt-2 grid gap-1.5">{report?.nextSteps.length ? report.nextSteps.map(step => <p key={step.id} className="flex gap-2 text-sm"><ChevronRight size={16} className="shrink-0" />{step.title}</p>) : <p className="text-sm">No hay pendientes operativos.</p>}</div></div></>}</section>; }
function EvidenceCard({ tasks, evidence, form, setForm, pending, onSubmit }: { tasks: { id: number; title: string }[]; evidence: { id: number; description: string; type: string; createdAt: Date }[]; form: { taskId: string; type: "note" | "photo" | "document"; description: string; fileUrl: string }; setForm: (value: { taskId: string; type: "note" | "photo" | "document"; description: string; fileUrl: string }) => void; pending: boolean; onSubmit: () => void }) { return <section className="evox-card rounded-2xl p-5"><SectionHeading icon={<FileCheck2 size={17} />} eyebrow="Evidencias" title="Registrar respaldo" /><p className="mt-2 text-sm leading-5 text-[#94a39b]">Una URL es opcional. La siguiente fase podrá cargar archivos al almacenamiento privado.</p><form onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(); }} className="mt-4 grid gap-2"><select className="evox-input text-sm" value={form.taskId || String(tasks[0]?.id ?? "")} onChange={event => setForm({ ...form, taskId: event.target.value })} required><option value="">Selecciona una tarea</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select><select className="evox-input text-sm" value={form.type} onChange={event => setForm({ ...form, type: event.target.value as typeof form.type })}><option value="note">Nota</option><option value="photo">Foto</option><option value="document">Documento</option></select><textarea className="evox-input min-h-24 text-sm" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Qué se observó y cómo se verificó" required /><input type="url" className="evox-input text-sm" value={form.fileUrl} onChange={event => setForm({ ...form, fileUrl: event.target.value })} placeholder="URL opcional del archivo" /><button disabled={pending || !tasks.length} className="evox-ghost px-4 py-2.5 text-xs font-semibold disabled:opacity-40">Registrar evidencia</button></form><div className="mt-4 grid gap-2">{evidence.slice(0, 3).map(item => <div key={item.id} className="border-l-2 border-[#c9ff4a]/60 pl-3"><p className="text-sm">{item.description}</p><p className="mt-1 text-[11px] uppercase tracking-[.1em] text-[#94a39b]">{item.type} · {dateTimeFormat.format(new Date(item.createdAt))}</p></div>)}</div></section>; }
