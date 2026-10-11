export type Intake = {
  goal: string;
  state: number; // 0..2
  bandwidth: number; // 0..2
  pitfall: number; // 0..3
  timeline: number; // 0..2
};

export type Task = { id: string; title: string; minutes: number; done?: boolean; doneAt?: string };
export type Phase = { id: string; title: string; tasks: Task[] };

export type AppData = {
  intake: Intake | null;
  roadmap: Phase[];
  approved: boolean;
  activePhase: number;
  streak: number;
  lastDoneDate: string | null;
  scratchpad: string;
};

export const STORAGE_KEY = "valuegap.v1";

export const emptyData: AppData = {
  intake: null,
  roadmap: [],
  approved: false,
  activePhase: 0,
  streak: 0,
  lastDoneDate: null,
  scratchpad: "",
};

export const QUESTIONS = {
  state: ["Bara en idé i huvudet", "Har anteckningar / lös skiss", "Halvfärdigt utkast / prototyp finns"],
  bandwidth: ["Mikrofokus (15–30 min/dag)", "Ett gediget block (45–90 min/dag)", "Flexibelt / Oregelbundet"],
  pitfall: [
    "Det blir för stort och komplext i huvudet",
    "Jag drunknar i appar och underhåll",
    "Perfektionism och fastnar i detaljer",
    "Riktningen tappas bort i vardagens brus",
  ],
  timeline: [
    "Inom 3 månader (snabbt & fokuserat)",
    "Inom 6–12 månader (tålmodig precision)",
    "Ingen fast deadline (håll bara riktningen)",
  ],
};

const uid = () => Math.random().toString(36).slice(2, 9);

const PHASES: { title: string; tasks: string[] }[] = [
  {
    title: "Klarhet",
    tasks: [
      "Skriv en mening om varför detta betyder något för dig",
      "Lista tre saker som måste finnas med i första versionen",
      "Bestäm vad du medvetet väljer bort",
      "Beskriv hur 'klart' ser ut i fem meningar",
    ],
  },
  {
    title: "Skiss",
    tasks: [
      "Rita en grov skiss på papper",
      "Samla dina befintliga anteckningar på ett ställe",
      "Formulera det första steget en användare tar",
      "Visa skissen för en person du litar på",
    ],
  },
  {
    title: "Första versionen",
    tasks: [
      "Bygg den minsta fungerande delen",
      "Koppla ihop två delar så de fungerar tillsammans",
      "Testa flödet själv från början till slut",
      "Skriv ner tre saker som skaver",
    ],
  },
  {
    title: "Förfining",
    tasks: [
      "Åtgärda det som skaver mest",
      "Be två personer prova och lyssna utan att försvara",
      "Ta bort en funktion som inte behövs",
      "Putsa texterna så de låter som du",
    ],
  },
  {
    title: "Lansering",
    tasks: [
      "Skriv en kort, ärlig presentation",
      "Välj en kanal att dela i först",
      "Publicera — bra nog är bra nog",
      "Reflektera: vad lärde du dig?",
    ],
  },
];

const SMALL_STARTS = [
  "Öppna ett tomt dokument och skriv målet i en mening",
  "Sätt en timer på 10 minuter och skriv fritt om idén",
  "Välj ETT ord som beskriver vad du vill känna när du är klar",
];

export function minutesFor(bandwidth: number, i: number) {
  const base = bandwidth === 0 ? [15, 20, 25, 30] : bandwidth === 1 ? [45, 60, 75, 90] : [20, 30, 45, 60];
  return base[i % base.length]!;
}

export function generateRoadmap(intake: Intake): Phase[] {
  const start = intake.state; // skip phases already behind you
  const phases = PHASES.slice(Math.min(start, 1)).slice(0, intake.timeline === 0 ? 4 : 5);
  const perPhase = intake.timeline === 0 ? 3 : 4;
  return phases.map((p, pi) => {
    let titles = p.tasks.slice(0, perPhase);
    if (pi === 0 && intake.pitfall === 0) titles = [...SMALL_STARTS, ...titles].slice(0, perPhase);
    if (intake.pitfall === 2 && pi === phases.length - 1) titles[titles.length - 1] = "Släpp det — 80 % räcker gott";
    return {
      id: uid(),
      title: `Fas ${pi + 1} · ${p.title}`,
      tasks: titles.map((t, ti) => ({
        id: uid(),
        title: t,
        minutes: pi === 0 && intake.pitfall === 0 ? 10 : minutesFor(intake.bandwidth, ti),
      })),
    };
  });
}

export function progress(roadmap: Phase[]) {
  const all = roadmap.flatMap((p) => p.tasks);
  if (!all.length) return 0;
  return Math.round((all.filter((t) => t.done).length / all.length) * 100);
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** New streak after completing a task on `today`. */
export function nextStreak(streak: number, last: string | null, today: string) {
  if (last === today) return streak;
  if (!last) return 1;
  const diff = Math.round((Date.parse(today) - Date.parse(last)) / 86400000);
  return diff === 1 ? streak + 1 : 1;
}

/** Up to two open tasks from the active phase (falls forward to next phases). */
export function todaysChoices(roadmap: Phase[], active: number): Task[] {
  const out: Task[] = [];
  for (let i = active; i < roadmap.length && out.length < 2; i++) {
    for (const t of roadmap[i]!.tasks) if (!t.done && out.length < 2) out.push(t);
  }
  return out;
}
