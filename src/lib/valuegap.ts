export type Task = { id: string; title: string; minutes: number; done?: boolean; doneAt?: string; deferUntil?: string; started?: boolean; resumeNote?: string };
export type Phase = { id: string; title: string; tasks: Task[] };

export type Project = {
  id: string;
  title: string;
  dump: string;
  start: number; // 0 noll/omstart, 1 mitt i, 2 nära mål
  horizon: number; // 0 sprint, 1 period, 2 öppet
  modular: boolean;
  phases: Phase[];
  paused: boolean;
  createdAt: string;
  deadline?: string | null;
  budget?: string | undefined;
  context?: string;
};

export type AppState = "INTAKE" | "GATEWAY" | "ACTIVE_FOCUS" | "COMPLETION_REST";
export type LogStatus = "COMPLETED" | "OTHER_PRIORITIES" | "RECOVERY";
export type LogEntry = { date: string; status: LogStatus; taskName?: string; ambitionId?: string };

export type AppData = {
  projects: Project[];
  activeId: string | null;
  appState: AppState;
  historyLog: LogEntry[];
  scratchpad: string;
  scratchpadBank: { id: string; date: string; text: string; project?: string | undefined; ambitionId?: string | undefined }[];
  ideas: { id: string; text: string; date: string }[];
  snoozeUntil: number | null;
  lastOpenDate: string | null;
  focusTaskId: string | null;
  completionProjectId: string | null;
};

export const STORAGE_KEY = "valuegap.v2";

export const emptyData: AppData = {
  projects: [],
  activeId: null,
  appState: "INTAKE",
  historyLog: [],
  scratchpad: "",
  scratchpadBank: [],
  ideas: [],
  snoozeUntil: null,
  lastOpenDate: null,
  focusTaskId: null,
  completionProjectId: null,
};

export const QUESTIONS = {
  start: ["Börjar helt från noll / Omstart", "Mitt i – har redan påbörjat", "Nära mållinjen"],
  horizon: ["Snabb sprint (< 4 veckor)", "Fokuserad period (1–3 månader)", "Utan fast deadline (öppet flöde)"],
  modular: ["Modulära, självständiga delar", "Sekventiell kedja"],
  deadline: ["Ja – välj datum", "Nej"],
  budget: ["Under 2 timmar/vecka", "2–5 timmar/vecka", "5–10 timmar/vecka", "En stund varje dag"],
};

export const uid = () => Math.random().toString(36).slice(2, 9);

const PLANS: { title: string; tasks: string[] }[][] = [
  [
    { title: "Klarhet", tasks: ["Skriv en mening om varför detta betyder något", "Lista tre saker som måste finnas med", "Stryk en sak du medvetet väljer bort"] },
    { title: "Skiss", tasks: ["Rita en grov skiss på ett papper", "Samla lösa anteckningar på ett ställe", "Skriv rubriken på första delen"] },
    { title: "Bygga", tasks: ["Gör den minsta fungerande biten", "Koppla ihop två delar", "Prova flödet själv en gång"] },
    { title: "Släppa", tasks: ["Skriv tre ärliga meningar om vad det är", "Visa det för en person", "Notera en sak du lärde dig"] },
  ],
  [
    { title: "Överblick", tasks: ["Öppna det du har och läs igenom i lugn takt", "Markera det som redan fungerar", "Skriv ner nästa naturliga steg"] },
    { title: "Fördjupa", tasks: ["Arbeta vidare på den svagaste delen", "Ta bort en sak som inte behövs", "Be om en kort reaktion från någon"] },
    { title: "Färdigställa", tasks: ["Putsa en sektion", "Rätta det som skaver mest", "Läs igenom helheten en gång"] },
    { title: "Släppa", tasks: ["Välj en kanal att dela i", "Publicera — bra nog är bra nog", "Skriv en tacksam rad till dig själv"] },
  ],
  [
    { title: "Inventera", tasks: ["Lista det som återstår", "Stryk det som inte är nödvändigt", "Välj den viktigaste kvarvarande biten"] },
    { title: "Slutputs", tasks: ["Gör den sista justeringen", "Kontrollera en detalj", "Läs igenom med nya ögon"] },
    { title: "Lansera", tasks: ["Förbered en kort presentation", "Dela med en första mottagare", "Publicera"] },
    { title: "Vila & reflektera", tasks: ["Skriv vad som gick bra", "Notera en lärdom", "Ta en medveten paus"] },
  ],
];

export const FIRST_STEPS = [
  "Öppna utkastet och skriv en enda rå rubrik",
  "Öppna filen och läs bara första stycket",
  "Skriv ner det enda som återstår, i en mening",
];

export function titleFromDump(dump: string) {
  const first = dump.trim().split(/[\n.!?]/)[0]?.trim() ?? "";
  return first.length > 70 ? first.slice(0, 67).trimEnd() + "…" : first || "Mitt projekt";
}

export function generatePlan(dump: string, start: number, horizon: number, modular: boolean): Project {
   const tpl = PLANS[start] ?? PLANS[0] ?? [];
  const perPhase = horizon === 0 ? 2 : 3;
  const phases: Phase[] = tpl.map((p, pi) => {
    let titles = p.tasks.slice(0, perPhase);
    if (modular && pi === 2) titles = titles.map((t, i) => (i === 0 ? "Välj en självständig del: " + t.toLowerCase() : t));
    if (pi === 0) titles = [FIRST_STEPS[start] ?? FIRST_STEPS[0] ?? "Skriv en rubrik", ...titles].slice(0, perPhase + 1);
    return { id: uid(), title: `Fas ${pi + 1} · ${p.title}`, tasks: titles.map((t) => ({ id: uid(), title: t, minutes: 5 })) };
  });
  return {
    id: uid(), title: titleFromDump(dump), dump, start, horizon, modular, phases, paused: false,
    createdAt: new Date().toISOString(),
  };
}

export function currentPhaseIndex(p: Project) {
  const i = p.phases.findIndex((ph) => ph.tasks.some((t) => !t.done));
  return i === -1 ? p.phases.length : i;
}

export function parkTask(task: Task, note: string): Task {
  return { ...task, started: true, resumeNote: note.trim(), done: false };
}

export function finishTask(task: Task, doneAt: string): Task {
  return { ...task, done: true, doneAt, started: false, resumeNote: "" };
}

export function addReflection(data: AppData, ambitionId: string | null, text: string, date: string): AppData {
  const project = data.projects.find((p) => p.id === ambitionId);
  if (!project || !text.trim()) return data;
  return { ...data, scratchpadBank: [{ id: uid(), date, text: text.trim(), ambitionId: project.id, project: project.title }, ...data.scratchpadBank] };
}

/** Strictly max 2 open micro-steps from the current phase, skipping ones moved to a later day. */
export function todaysChoices(p: Project | undefined, today: string): Task[] {
  if (!p) return [];
  const out: Task[] = [];
  for (const ph of p.phases.slice(currentPhaseIndex(p))) {
    for (const t of ph.tasks) {
      if (out.length >= 2) return out;
      if (!t.done && !(t.deferUntil && t.deferUntil > today)) out.push(t);
    }
    if (out.length) return out; // stay within the current phase
  }
  return out;
}

export function openCount(projects: Project[]) {
  return projects.filter((p) => !p.paused).reduce((n, p) => {
    const ph = p.phases[currentPhaseIndex(p)];
    return n + (ph ? ph.tasks.filter((t) => !t.done).length : 0);
  }, 0);
}

/** Panikspärren: trigger before a new ambition when ≥2 active projects or >4 open steps. */
export function shouldTriggerPanic(projects: Project[]) {
  const active = projects.filter((p) => !p.paused && currentPhaseIndex(p) < p.phases.length);
  return active.length >= 2 || openCount(active) > 4;
}

export function phasesActivated(projects: Project[]) {
  return projects.reduce((n, p) => n + p.phases.filter((ph) => ph.tasks.some((t) => t.done)).length, 0);
}

export function todayKey(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

function addDays(key: string, n: number) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export { addDays };

/** Midnight close: every past day since last open without an entry becomes OTHER_PRIORITIES. */
export function closeDays(log: LogEntry[], lastOpen: string | null, today: string): LogEntry[] {
  if (!lastOpen || lastOpen >= today) return log;
  const out = [...log];
  for (let d = lastOpen; d < today; d = addDays(d, 1)) {
    if (!out.some((e) => e.date === d)) out.push({ date: d, status: "OTHER_PRIORITIES" });
  }
  return out;
}
