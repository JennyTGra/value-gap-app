import Dexie, { type EntityTable } from "dexie";

export type Ambition = {
  id: string;
  title: string;
  dump: string;
  context?: string;
  deadline?: string | null;
  budget?: string;
  paused: boolean;
  createdAt: string;
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
  doneAt?: string;
  deferUntil?: string;
};

export type Note = { id: string; ambitionId?: string; text: string; date: string; kind: "note" | "idea" };

export type HistoryEntry = {
  id?: number;
  date: string;
  status: "COMPLETED" | "OTHER_PRIORITIES" | "RECOVERY";
  ambitionId?: string;
  taskName?: string;
};

/** Local-only IndexedDB store. Browser-only: only use inside effects, handlers or useLiveQuery. */
export const db = new Dexie("valuegap") as Dexie & {
  ambitions: EntityTable<Ambition, "id">;
  phases: EntityTable<DbPhase, "id">;
  micro_steps: EntityTable<MicroStep, "id">;
  notes: EntityTable<Note, "id">;
  history: EntityTable<HistoryEntry, "id">;
};

db.version(1).stores({
  ambitions: "id, title, paused, createdAt",
  phases: "id, ambitionId, [ambitionId+order]",
  micro_steps: "id, ambitionId, phaseId, done, deferUntil, [phaseId+order]",
  notes: "id, ambitionId, date, kind",
  history: "++id, date, status, ambitionId",
});
