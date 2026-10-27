import Dexie, { type EntityTable } from "dexie";

export type Ambition = {
  id: string;
  title: string;
  dump: string;
  context?: string | undefined;
  deadline?: string | null | undefined;
  budget?: string | undefined;
  paused: boolean;
  createdAt: string;
  start?: number | undefined;
  horizon?: number | undefined;
  modular?: boolean | undefined;
  order?: number | undefined;
};

export type DbPhase = { id: string; ambitionId: string; title: string; order: number };

export type MicroStep = {
  id: string;
  ambitionId: string;
  phaseId: string;
  title: string;
  minutes: number;
  order: number;
  done: 0 | 1;
  doneAt?: string | undefined;
  deferUntil?: string | undefined;
  started?: boolean | undefined;
  resumeNote?: string | undefined;
};

export type Note = { id: string; ambitionId?: string | undefined; project?: string | undefined; text: string; date: string; kind: "note" | "idea"; order?: number | undefined };

export type HistoryEntry = {
  id?: number | undefined;
  date: string;
  status: "COMPLETED" | "OTHER_PRIORITIES" | "RECOVERY";
  ambitionId?: string | undefined;
  taskName?: string | undefined;
};

export type Meta = { key: string; value: unknown };

/** Local-only IndexedDB store. Browser-only: only use inside effects, handlers or useLiveQuery. */
export const db = new Dexie("valuegap") as Dexie & {
  ambitions: EntityTable<Ambition, "id">;
  phases: EntityTable<DbPhase, "id">;
  micro_steps: EntityTable<MicroStep, "id">;
  notes: EntityTable<Note, "id">;
  history: EntityTable<HistoryEntry, "id">;
  meta: EntityTable<Meta, "key">;
};

db.version(1).stores({
  ambitions: "id, title, paused, createdAt",
  phases: "id, ambitionId, [ambitionId+order]",
  micro_steps: "id, ambitionId, phaseId, done, deferUntil, [phaseId+order]",
  notes: "id, ambitionId, date, kind",
  history: "++id, date, status, ambitionId",
});

db.version(2).stores({ meta: "key" });
