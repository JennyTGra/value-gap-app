import { db, type Ambition, type DbPhase, type MicroStep, type Note, type HistoryEntry } from "./db";
import { emptyData, STORAGE_KEY, type AppData, type Project } from "./valuegap";

const META_KEYS = ["activeId", "appState", "scratchpad", "snoozeUntil", "lastOpenDate", "focusTaskId", "completionProjectId"] as const;

/** Load app data from IndexedDB; on first run, migrate from the old localStorage blob. */
export async function loadAppData(): Promise<AppData> {
  const migrated = await db.meta.get("migratedFromLocalStorage");
  if (!migrated) {
    let legacy: AppData | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) legacy = { ...emptyData, ...JSON.parse(raw) };
    } catch {}
    if (legacy) await saveAppData(legacy);
    await db.meta.put({ key: "migratedFromLocalStorage", value: new Date().toISOString() });
    if (legacy) return legacy;
  }

  const [ambitions, phases, steps, notes, history, meta] = await Promise.all([
    db.ambitions.toArray(), db.phases.toArray(), db.micro_steps.toArray(),
    db.notes.toArray(), db.history.orderBy("id").toArray(), db.meta.toArray(),
  ]);
  const m = Object.fromEntries(meta.map((r) => [r.key, r.value]));

  const projects = ambitions
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((a) => ({
      id: a.id, title: a.title, dump: a.dump, start: a.start ?? 0, horizon: a.horizon ?? 1,
      modular: a.modular ?? true, paused: a.paused, createdAt: a.createdAt,
      deadline: a.deadline, budget: a.budget, context: a.context,
      phases: phases.filter((p) => p.ambitionId === a.id).sort((x, y) => x.order - y.order).map((p) => ({
        id: p.id, title: p.title,
        tasks: steps.filter((s) => s.phaseId === p.id).sort((x, y) => x.order - y.order).map((s) => ({
          id: s.id, title: s.title, minutes: s.minutes, done: s.done === 1, doneAt: s.doneAt, deferUntil: s.deferUntil, started: s.started, resumeNote: s.resumeNote,
        })),
      })),
    })) as unknown as Project[];

  const byOrder = (x: Note, y: Note) => (x.order ?? 0) - (y.order ?? 0);
  return clean({
    ...emptyData,
    projects,
    activeId: (m["activeId"] as string | null) ?? null,
    appState: (m["appState"] as AppData["appState"]) ?? emptyData.appState,
    scratchpad: (m["scratchpad"] as string) ?? "",
    snoozeUntil: (m["snoozeUntil"] as number | null) ?? null,
    lastOpenDate: (m["lastOpenDate"] as string | null) ?? null,
    focusTaskId: (m["focusTaskId"] as string | null) ?? null,
    completionProjectId: (m["completionProjectId"] as string | null) ?? null,
    historyLog: history.map((h) => ({ date: h.date, status: h.status, taskName: h.taskName, ambitionId: h.ambitionId })),
    ideas: notes.filter((n) => n.kind === "idea").sort(byOrder).map((n) => ({ id: n.id, text: n.text, date: n.date })),
    scratchpadBank: notes.filter((n) => n.kind === "note").sort(byOrder).map((n) => ({ id: n.id, text: n.text, date: n.date, project: n.project, ambitionId: n.ambitionId })),
  }) as AppData;
}

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Persist the full app state into the IndexedDB tables in one transaction. */
export async function saveAppData(d: AppData): Promise<void> {
  const ambitions: Ambition[] = [], phases: DbPhase[] = [], steps: MicroStep[] = [];
  d.projects.forEach((p, pi) => {
    ambitions.push({
      id: p.id, title: p.title, dump: p.dump, context: p.context, deadline: p.deadline, budget: p.budget,
      paused: p.paused, createdAt: p.createdAt, start: p.start, horizon: p.horizon, modular: p.modular, order: pi,
    });
    p.phases.forEach((ph, i) => {
      phases.push({ id: ph.id, ambitionId: p.id, title: ph.title, order: i });
      ph.tasks.forEach((t, j) => steps.push({
        id: t.id, ambitionId: p.id, phaseId: ph.id, title: t.title, minutes: t.minutes, order: j,
        done: t.done ? 1 : 0, doneAt: t.doneAt, deferUntil: t.deferUntil, started: t.started, resumeNote: t.resumeNote,
      }));
    });
  });
  const notes: Note[] = [
    ...d.ideas.map((n, i): Note => ({ id: n.id, text: n.text, date: n.date, kind: "idea", order: i })),
    ...d.scratchpadBank.map((n, i): Note => ({
      id: n.id, text: n.text, date: n.date, project: n.project, kind: "note", order: i,
      ambitionId: n.ambitionId ?? d.projects.find((p) => p.title === n.project)?.id,
    })),
  ];
  const history: HistoryEntry[] = d.historyLog.map((h) => ({ date: h.date, status: h.status, taskName: h.taskName, ambitionId: h.ambitionId }));

  const [A, P, S, N, H] = clean([ambitions, phases, steps, notes, history] as const);
  await db.transaction("rw", [db.ambitions, db.phases, db.micro_steps, db.notes, db.history, db.meta], async () => {
    await Promise.all([db.ambitions.clear(), db.phases.clear(), db.micro_steps.clear(), db.notes.clear(), db.history.clear()]);
    await Promise.all([
      db.ambitions.bulkPut(A), db.phases.bulkPut(P), db.micro_steps.bulkPut(S),
      db.notes.bulkPut(N), db.history.bulkAdd(H),
      db.meta.bulkPut(META_KEYS.map((k) => ({ key: k, value: d[k] }))),
    ]);
  });
}
