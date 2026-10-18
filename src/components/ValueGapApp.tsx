import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Check, Clock, Feather, Lock, Sun, Moon, Pause, CalendarArrowUp, Leaf,
  Plus, PencilLine, RotateCcw, ShieldCheck, X, Play, Coffee, Menu, ArrowUpDown,
  Lightbulb, FolderOpen, NotebookPen, History, Settings2, Shuffle, Save,
} from "lucide-react";
import {
  type AppData, type AppState, type Project, type Task, type LogEntry,
  emptyData, STORAGE_KEY, QUESTIONS, generatePlan, todaysChoices, shouldTriggerPanic,
  phasesActivated, todayKey, addDays, closeDays, currentPhaseIndex, uid,
} from "@/lib/valuegap";

const card = "rounded-2xl border bg-card shadow-soft";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-40";
const eyebrow = "text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground";
const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
const isFinished = (p: Project) => currentPhaseIndex(p) >= p.phases.length;

export default function ValueGapApp() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [panic, setPanic] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [closed, setClosed] = useState(false);
  const today = todayKey(new Date(now));

  useEffect(() => {
    let d = emptyData;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) d = { ...emptyData, ...JSON.parse(raw) };
    } catch {}
    const t = todayKey();
    d = { ...d, historyLog: closeDays(d.historyLog, d.lastOpenDate, t), lastOpenDate: t };
    if (!d.projects.length) d.appState = "INTAKE";
    setData(d);
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data, loaded]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!loaded || data.lastOpenDate === today) return;
    setData((d) => ({ ...d, historyLog: closeDays(d.historyLog, d.lastOpenDate, today), lastOpenDate: today }));
  }, [today, loaded, data.lastOpenDate]);

  const live = data.projects.filter((p) => !p.paused && !isFinished(p));
  const project = live.find((p) => p.id === data.activeId) ?? live[0];
  const choices = todaysChoices(project, today);
  const allTasks = data.projects.flatMap((p) => p.phases.flatMap((ph) => ph.tasks));
  const current = allTasks.find((t) => t.id === selected) ?? choices[0] ?? null;
  const currentProject = data.projects.find((p) => p.phases.some((ph) => ph.tasks.some((t) => t.id === current?.id)));
  const go = (appState: AppState) => setData((d) => ({ ...d, appState }));
  const nudge = data.snoozeUntil !== null && now >= data.snoozeUntil && data.appState === "GATEWAY";

  const updateTasks = (fn: (t: Task) => Task) =>
    setData((d) => ({ ...d, projects: d.projects.map((p) => ({ ...p, phases: p.phases.map((ph) => ({ ...ph, tasks: ph.tasks.map(fn) })) })) }));
  const log = (e: LogEntry) => setData((d) => ({ ...d, historyLog: [...d.historyLog, e] }));
  const setPaused = (id: string, paused: boolean) =>
    setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, paused } : p)), activeId: paused ? d.activeId : id }));

  const complete = () => {
    if (!current) return;
    setData((d) => {
      let projects = d.projects.map((p) => ({ ...p, phases: p.phases.map((ph) => ({ ...ph, tasks: ph.tasks.map((t) => (t.id === current.id ? { ...t, done: true, doneAt: new Date().toISOString() } : t)) })) }));
      // When an active project finishes, gently surface the first resting one.
      const justFinished = projects.some((p) => !p.paused && isFinished(p) && d.projects.find((o) => o.id === p.id && !isFinished(o)));
      if (justFinished) {
        const rest = projects.find((p) => p.paused);
        if (rest) projects = projects.map((p) => (p.id === rest.id ? { ...p, paused: false } : p));
      }
      return { ...d, projects, historyLog: [...d.historyLog, { date: today, status: "COMPLETED", taskName: current.title }], appState: "COMPLETION_REST" };
    });
    setSelected(null);
  };

  const newAmbition = () => { setMenuOpen(false); shouldTriggerPanic(data.projects) ? setPanic(true) : go("INTAKE"); };
  const addIdea = (text: string) => setData((d) => ({ ...d, ideas: [{ id: uid(), text, date: today }, ...d.ideas] }));

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData({ ...emptyData, lastOpenDate: todayKey() });
    setSelected(null); setPanic(false); setClosed(false); setMenuOpen(false);
  };

  if (!loaded) return <div className="min-h-screen" />;

  if (closed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center animate-fade-up">
        <div>
          <Moon className="mx-auto text-sand-deep" size={22} />
          <h1 className="mt-6 text-3xl">Skärmen kan vila nu.</h1>
          <p className="mt-3 text-muted-foreground">Njut av dagen i den verkliga världen.</p>
          <button className="mt-10 text-sm text-muted-foreground underline underline-offset-4" onClick={() => setClosed(false)}>Öppna igen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 pt-8">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-champagne text-accent-foreground"><Feather size={15} /></span>
          <span className="truncate text-xl font-medium">ValueGap</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><Lock size={12} /> Endast lokalt</span>
          {data.projects.length > 0 && (
            <button onClick={() => setPanic(true)} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">För mycket just nu?</button>
          )}
          <button aria-label="Öppna menyn" onClick={() => setMenuOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border bg-card hover:bg-secondary"><Menu size={16} /></button>
        </div>
      </header>

      {nudge && (
        <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div className={`${card} animate-slide-down flex flex-wrap items-center gap-4 px-5 py-4`}>
            <span className="text-lg">Hej. Är du redo nu?</span>
            <div className="flex gap-2">
              <button className={btnPrimary + " py-2"} onClick={() => setData((d) => ({ ...d, snoozeUntil: null, appState: "ACTIVE_FOCUS" }))}>Ja, kör</button>
              <button className={btnGhost + " py-2"} onClick={() => setData((d) => ({ ...d, snoozeUntil: Date.now() + 30 * 60000 }))}>30 min till</button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 pt-12">
        {data.appState === "INTAKE" && (
          <Intake
            canCancel={data.projects.length > 0}
            onCancel={() => go("GATEWAY")}
            onIdea={addIdea}
            onApprove={(p) => setData((d) => ({ ...d, projects: [...d.projects, p], activeId: p.id, appState: "GATEWAY" }))}
          />
        )}
        {data.appState === "GATEWAY" && (
          <Gateway
            data={data} project={project} live={live} choices={choices} selected={current?.id ?? null} setSelected={setSelected}
            today={today} now={now}
            onStart={() => go("ACTIVE_FOCUS")}
            onSnooze={() => setData((d) => ({ ...d, snoozeUntil: Date.now() + 30 * 60000 }))}
            onWake={() => setData((d) => ({ ...d, snoozeUntil: null }))}
            onDefer={(days) => {
              const until = addDays(today, days);
              const ids = new Set(choices.map((c) => c.id));
              updateTasks((t) => (ids.has(t.id) ? { ...t, deferUntil: until } : t));
            }}
            onRecovery={() => log({ date: today, status: "RECOVERY" })}
            onSwitch={(id) => { setSelected(null); setData((d) => ({ ...d, activeId: id })); }}
            onNew={newAmbition}
          />
        )}
        {data.appState === "ACTIVE_FOCUS" && current && (
          <Focus
            task={current} projectTitle={currentProject?.title ?? ""} scratch={data.scratchpad}
            setScratch={(s) => setData((d) => ({ ...d, scratchpad: s }))}
            onSave={() => setData((d) => d.scratchpad.trim() ? ({
              ...d, scratchpad: "",
              scratchpadBank: [{ id: uid(), date: today, text: d.scratchpad.trim(), project: currentProject?.title }, ...d.scratchpadBank],
            }) : d)}
            onComplete={complete} onBack={() => go("GATEWAY")}
          />
        )}
        {data.appState === "ACTIVE_FOCUS" && !current && (
          <p className="text-center text-muted-foreground">Inget mikrosteg är valt just nu.</p>
        )}
        {data.appState === "COMPLETION_REST" && (
          <Completion data={data} today={today} onBack={() => go("GATEWAY")} onClose={() => { try { window.close(); } catch {} setClosed(true); }} />
        )}
      </main>

      {menuOpen && (
        <SideMenu
          data={data} today={today}
          onClose={() => setMenuOpen(false)}
          onNew={newAmbition}
          onPause={(id) => setPaused(id, true)}
          onResume={(id) => { setPaused(id, false); setSelected(null); }}
          onIdea={addIdea}
          onRemoveIdea={(id) => setData((d) => ({ ...d, ideas: d.ideas.filter((i) => i.id !== id) }))}
          onState={(s) => { if (s !== "INTAKE" && !data.projects.length) return; go(s); setMenuOpen(false); }}
          onPanic={() => { setMenuOpen(false); setPanic(true); }}
          onNudge={() => { setMenuOpen(false); setData((d) => ({ ...d, snoozeUntil: Date.now() - 1, appState: d.projects.length ? "GATEWAY" : d.appState })); }}
          onReset={reset}
        />
      )}

      {panic && (
        <PanicModal
          projects={live}
          onPause={(id) => { setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, paused: true } : p)), appState: "INTAKE" })); setPanic(false); }}
          onContinue={() => { setPanic(false); go("INTAKE"); }}
          onCancel={() => setPanic(false)}
        />
      )}
    </div>
  );
}

/* ---------------- Screen 1: Intake ---------------- */
function Intake({ onApprove, canCancel, onCancel, onIdea }: { onApprove: (p: Project) => void; canCancel: boolean; onCancel: () => void; onIdea: (t: string) => void }) {
  const [step, setStep] = useState<"dump" | "q" | "context" | "plan">("dump");
  const [dump, setDump] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<number | null>(null);
  const [modular, setModular] = useState<number | null>(null);
  const [hasDeadline, setHasDeadline] = useState<number | null>(null);
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [context, setContext] = useState("");
  const [idea, setIdea] = useState("");
  const [savedIdeas, setSavedIdeas] = useState(0);
  const [plan, setPlan] = useState<Project | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  if (step === "dump") {
    return (
      <section className="animate-fade-up mx-auto max-w-2xl">
        <p className={eyebrow}>Steg 1 av 3 · Dumpa</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">Rå hjärndump</h1>
        <textarea
          autoFocus rows={9} value={dump} onChange={(e) => setDump(e.target.value)}
          placeholder="Dumpa allt som snurrar i huvudet just nu... Skriv helt fritt i 30 sekunder – inga taggar, mappar eller regler."
          className={`${card} mt-8 w-full resize-y p-6 text-base leading-relaxed outline-none focus:ring-2 focus:ring-ring`}
        />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {canCancel ? <button className="text-sm text-muted-foreground" onClick={onCancel}>Avbryt</button> : <span />}
          <button className={btnPrimary} disabled={dump.trim().length < 3} onClick={() => setStep("q")}>
            Vidare <ArrowRight size={16} />
          </button>
        </div>
      </section>
    );
  }

  if (step === "q") {
    const ready = start !== null && horizon !== null && modular !== null && budget !== null && (hasDeadline === 1 || (hasDeadline === 0 && !!deadline));
    return (
      <section className={`${card} animate-fade-up mx-auto max-w-xl p-8 sm:p-10`}>
        <p className={eyebrow}>Steg 2 av 3 · Fem snabba frågor</p>
        <Choice label="Var befinner du dig i processen?" options={QUESTIONS.start} value={start} onChange={setStart} />
        <Choice label="Hur ser tidsramen ut?" options={QUESTIONS.horizon} value={horizon} onChange={setHorizon} />
        <Choice label="Hur är projektet uppbyggt?" options={QUESTIONS.modular} value={modular} onChange={setModular} />
        <Choice label="Finns det en fast deadline?" options={QUESTIONS.deadline} value={hasDeadline} onChange={setHasDeadline} />
        {hasDeadline === 0 && (
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Deadline"
            className="mt-3 w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        )}
        <Choice label="Hur mycket tid har du?" options={QUESTIONS.budget} value={budget} onChange={setBudget} />
        <div className="mt-10 flex items-center justify-between">
          <button className="text-sm text-muted-foreground" onClick={() => setStep("dump")}>Tillbaka</button>
          <button className={btnPrimary} disabled={!ready} onClick={() => setStep("context")}>Vidare <ArrowRight size={16} /></button>
        </div>
      </section>
    );
  }

  if (step === "context") {
    return (
      <section className="animate-fade-up mx-auto max-w-2xl">
        <p className={eyebrow}>Steg 3 av 3 · Kontext & material</p>
        <h1 className="mt-3 text-3xl">Något mer som hör till?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Lägg till extra kontext, länkar eller anteckningar för projektet (PDF:er, studiematerial, bakgrundsidéer). Helt valfritt.</p>
        <textarea rows={5} value={context} onChange={(e) => setContext(e.target.value)} placeholder="https://… eller några rader om bakgrunden"
          className={`${card} mt-6 w-full resize-y p-5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring`} />
        <div className={`${card} mt-6 p-5`}>
          <p className="flex items-center gap-2 text-sm font-medium"><Lightbulb size={14} className="text-sand-deep" /> Sidoidé? Lägg den i Idébanken</p>
          <div className="mt-3 flex gap-2">
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="En tanke som inte hör hemma i planen…"
              onKeyDown={(e) => { if (e.key === "Enter" && idea.trim()) { onIdea(idea.trim()); setIdea(""); setSavedIdeas((n) => n + 1); } }}
              className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button className={btnGhost + " px-4 py-2.5"} disabled={!idea.trim()} onClick={() => { onIdea(idea.trim()); setIdea(""); setSavedIdeas((n) => n + 1); }}>Spara</button>
          </div>
          {savedIdeas > 0 && <p className="mt-2 text-xs text-muted-foreground">{savedIdeas} {savedIdeas === 1 ? "idé" : "idéer"} vilar nu tryggt i menyn.</p>}
        </div>
        <div className="mt-8 flex items-center justify-between">
          <button className="text-sm text-muted-foreground" onClick={() => setStep("q")}>Tillbaka</button>
          <button className={btnPrimary} onClick={() => {
            const p = generatePlan(dump, start!, horizon!, modular === 0);
            setPlan({ ...p, deadline: hasDeadline === 0 ? deadline : null, budget: QUESTIONS.budget[budget!], context: context.trim() });
            setStep("plan");
          }}>Skapa din plan <ArrowRight size={16} /></button>
        </div>
      </section>
    );
  }

  if (!plan) return null;
  const first = plan.phases[0]!.tasks[0]!;
  const rename = (id: string, title: string) =>
    setPlan({ ...plan, phases: plan.phases.map((ph) => ({ ...ph, tasks: ph.tasks.map((t) => (t.id === id ? { ...t, title } : t)) })) });

  return (
    <section className="animate-fade-up">
      <p className={eyebrow}>Din 4-fasplan</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{plan.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {plan.budget}{plan.deadline ? ` · Deadline ${fmtDate(plan.deadline)}` : " · Ingen fast deadline"}
      </p>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {plan.phases.map((ph, pi) => (
          <li key={ph.id} className={`${card} p-6 ${pi === 0 ? "sm:col-span-2" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-champagne text-xs font-medium text-accent-foreground">{pi + 1}</span>
              <h2 className="text-xl">{ph.title.split(" · ")[1]}</h2>
            </div>
            <ul className="mt-4 space-y-2.5">
              {ph.tasks.filter((t) => t.id !== first.id).map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sand-deep" />
                  {editing === t.id ? (
                    <input autoFocus defaultValue={t.title}
                      onBlur={(e) => { if (e.target.value.trim()) rename(t.id, e.target.value.trim()); setEditing(null); }}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-ring" />
                  ) : (
                    <button className="min-w-0 flex-1 text-left hover:text-muted-foreground" onClick={() => setEditing(t.id)} title="Klicka för att ändra">{t.title}</button>
                  )}
                </li>
              ))}
            </ul>
            {pi === 0 && (
              <div className="mt-6 rounded-xl bg-champagne/60 p-5">
                <p className="text-lg">Vill du ta ett första mikrosteg?</p>
                <p className="mt-2 flex items-center gap-2 text-sm"><Clock size={13} className="shrink-0 text-sand-deep" /> {first.title} <span className="text-muted-foreground">· &lt; 5 min</span></p>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap justify-between gap-3">
        <button className={btnGhost} onClick={() => setStep("q")}>Justera val</button>
        <button className={btnPrimary} onClick={() => onApprove(plan)}>Börja med den här planen <Check size={16} /></button>
      </div>
    </section>
  );
}

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: number | null; onChange: (i: number) => void }) {
  return (
    <fieldset className="mt-8">
      <legend className="text-lg font-medium">{label}</legend>
      <div className="mt-3 grid gap-2">
        {options.map((opt, i) => (
          <button key={opt} onClick={() => onChange(i)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${value === i ? "border-sand-deep bg-champagne/60" : "bg-background hover:bg-secondary"}`}>
            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${value === i ? "border-primary bg-primary text-primary-foreground" : ""}`}>
              {value === i && <Check size={10} />}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------------- Screen 2: Morgonvyn ---------------- */
function Gateway(props: {
  data: AppData; project: Project | undefined; live: Project[]; choices: Task[]; selected: string | null; setSelected: (id: string) => void;
  today: string; now: number; onStart: () => void; onSnooze: () => void; onWake: () => void; onDefer: (days: number) => void;
  onRecovery: () => void; onSwitch: (id: string) => void; onNew: () => void;
}) {
  const { data, project, live, choices, selected, setSelected, today, now } = props;
  const [menu, setMenu] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const restedToday = data.historyLog.some((e) => e.date === today && e.status === "RECOVERY");
  const snoozed = data.snoozeUntil !== null && now < data.snoozeUntil;
  const others = live.filter((p) => p.id !== project?.id);
  const ordered = swapped ? [...choices].reverse() : choices;

  if (!project) {
    return (
      <section className="animate-fade-up text-center">
        <h1 className="text-3xl">Alla projekt vilar just nu.</h1>
        <p className="mt-3 text-muted-foreground">Det är helt i sin ordning. Du hittar dem i menyn när du vill.</p>
        <button className={btnGhost + " mt-8"} onClick={props.onNew}><Plus size={15} /> Ny ambition</button>
      </section>
    );
  }

  return (
    <section className="animate-fade-up">
      <Sun size={20} className="text-sand-deep" />
      <h1 className="mt-4 max-w-2xl text-2xl leading-snug sm:text-3xl">God morgon. Ditt sinne är lugnt. Här är dagens enda riktning:</h1>
      <p className="mt-3 text-sm text-muted-foreground">{project.title} · Fas {Math.min(currentPhaseIndex(project) + 1, 4)} av 4</p>

      {restedToday ? (
        <div className={`${card} mt-10 p-8 text-center`}>
          <Leaf className="mx-auto text-sand-deep" size={20} />
          <p className="mt-4 text-2xl">Du har gjort det bra idag!</p>
          <p className="mt-2 text-sm text-muted-foreground">Planerad återhämtning. En vilodag bevarar din kognitiva energi.</p>
        </div>
      ) : !choices.length ? (
        <div className={`${card} mt-10 p-8 text-center`}>
          <p className="text-2xl">Inget väntar på dig idag.</p>
          <p className="mt-2 text-sm text-muted-foreground">Stegen ligger lugnt kvar till sin dag.</p>
        </div>
      ) : (
        <>
          <div className={`mt-10 grid gap-4 sm:grid-cols-2 transition-opacity duration-700 ${snoozed ? "opacity-50" : ""}`}>
            {ordered.map((t) => {
              const on = selected === t.id;
              return (
                <button key={t.id} onClick={() => setSelected(t.id)}
                  className={`${card} p-6 text-left transition ${on ? "border-sand-deep ring-2 ring-accent" : "hover:-translate-y-0.5"}`}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"><Clock size={11} />&lt; 5 min</span>
                    <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>{on && <Check size={12} />}</span>
                  </div>
                  <p className="mt-4 text-xl leading-snug">{t.title}</p>
                </button>
              );
            })}
          </div>
          {choices.length > 1 && !snoozed && (
            <button className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setSwapped(!swapped)}>
              <ArrowUpDown size={12} /> Byt ordning
            </button>
          )}

          {snoozed ? (
            <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sand-deep" />
              Vilar i bakgrunden till {new Date(data.snoozeUntil!).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}.
              <button className="underline underline-offset-4" onClick={props.onWake}>Jag är redo nu</button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              <div>
                <button className={btnPrimary} disabled={!selected} onClick={props.onStart}>Jag vill ta ett mikrosteg! <ArrowRight size={16} /></button>
                <p className="mt-2 max-w-xs text-xs text-muted-foreground">1 djupt, ostört fokusblock (Rovdjursrytm – pedantisk närvaro).</p>
              </div>
              <div>
                <button className={btnGhost} onClick={() => setMenu(!menu)}>Börja när du vill</button>
                {menu && (
                  <div className={`${card} animate-fade-up mt-3 grid max-w-sm gap-1 p-2`}>
                    <MenuItem icon={<Pause size={15} />} label="+30 minuters lugn vila" onClick={() => { setMenu(false); props.onSnooze(); }} />
                    <MenuItem icon={<CalendarArrowUp size={15} />} label="Flytta varsamt till imorgon" onClick={() => { setMenu(false); props.onDefer(1); }} />
                    <MenuItem icon={<CalendarArrowUp size={15} />} label="Flytta till nästa vecka" onClick={() => { setMenu(false); props.onDefer(7); }} />
                    <MenuItem icon={<Leaf size={15} />} label="Markera som planerad återhämtning" onClick={() => { setMenu(false); props.onRecovery(); }} />
                    {others.map((p) => (
                      <MenuItem key={p.id} icon={<Shuffle size={15} />} label={`Byt till: ${p.title}`} onClick={() => { setMenu(false); props.onSwitch(p.id); }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary">
      <span className="shrink-0 text-sand-deep">{icon}</span><span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

/* ---------------- Screen 3: Fokus ---------------- */
function Focus({ task, projectTitle, scratch, setScratch, onSave, onComplete, onBack }: {
  task: Task; projectTitle: string; scratch: string; setScratch: (s: string) => void; onSave: () => void; onComplete: () => void; onBack: () => void;
}) {
  const [length, setLength] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setLeft(length * 60); }, [length]);
  useEffect(() => { const i = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(false), 2200); return () => clearTimeout(t); }, [saved]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <section className="animate-fade-up mx-auto max-w-2xl">
      <p className={eyebrow + " text-center"}>{projectTitle}</p>
      <h1 className="mt-6 text-center text-4xl leading-tight sm:text-5xl">{task.title}</h1>
      <div className="mt-10 flex flex-col items-center gap-3">
        <span className="text-2xl font-light tabular-nums text-muted-foreground">{mm}:{ss}</span>
        <div className="flex gap-1 text-xs">
          {[15, 25, 45].map((m) => (
            <button key={m} onClick={() => setLength(m)}
              className={`rounded-full px-3 py-1 transition ${length === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}>{m} min</button>
          ))}
        </div>
      </div>
      <div className={`${card} mt-12`}>
        <div className="flex items-center justify-between gap-2 border-b px-5 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><PencilLine size={13} /> Tankeskiss</span>
          <span className="flex items-center gap-3">
            {saved && <span className="animate-fade-up">Sparad i arkivet</span>}
            <button disabled={!scratch.trim()} onClick={() => { onSave(); setSaved(true); }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium uppercase tracking-widest text-foreground hover:bg-secondary disabled:opacity-40">
              <Save size={12} /> Spara
            </button>
          </span>
        </div>
        <textarea value={scratch} onChange={(e) => setScratch(e.target.value)} rows={6}
          placeholder="Fånga sidotankar och idéer här så att du slipper byta flik."
          className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed outline-none" />
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button className={btnGhost} onClick={onBack}>Tillbaka</button>
        <button className={btnPrimary} onClick={onComplete}><Check size={16} /> Slutför mikrosteg</button>
      </div>
    </section>
  );
}

/* ---------------- History (shared) ---------------- */
function HistoryList({ log, today, range }: { log: LogEntry[]; today: string; range: 7 | 30 }) {
  const days = useMemo(() => {
    const out: [string, LogEntry[]][] = [];
    for (let i = 0; i < range; i++) {
      const d = addDays(today, -i);
      const entries = log.filter((e) => e.date === d);
      if (entries.length || d === today) out.push([d, entries]);
    }
    return out;
  }, [log, today, range]);

  return (
    <ul className="divide-y">
      {days.map(([date, entries]) => {
        const done = entries.filter((e) => e.status === "COMPLETED");
        const rest = entries.some((e) => e.status === "RECOVERY");
        const isToday = date === today;
        return (
          <li key={date} className={`flex items-start gap-3 py-3 text-sm ${isToday && done.length ? "-mx-3 rounded-xl bg-champagne/60 px-3" : ""}`}>
            <span className="w-14 shrink-0 text-xs text-muted-foreground">{isToday ? "Idag" : fmtDate(date)}</span>
            {done.length ? (
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {isToday && <span className="text-xs font-medium text-sand-deep">Titta vad jag har gjort idag!</span>}
                {done.map((e, i) => <span key={i} className="flex items-center gap-2"><Check size={13} className="shrink-0 text-sand-deep" />{e.taskName}</span>)}
              </span>
            ) : rest ? (
              <span className="flex items-center gap-2 text-muted-foreground"><Leaf size={13} className="text-sand-deep" /> Planerad återhämtning</span>
            ) : isToday ? (
              <span className="text-muted-foreground">Dagen är fortfarande öppen.</span>
            ) : (
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><Coffee size={13} /> Andra prioriteringar</span>
                <span className="text-xs text-muted-foreground">Du gjorde det bra, även om inget blev gjort här. Kanske åstadkom du något annat viktigt?</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RangeToggle({ range, setRange }: { range: 7 | 30; setRange: (r: 7 | 30) => void }) {
  return (
    <div className="flex gap-1 text-xs">
      {([7, 30] as const).map((r) => (
        <button key={r} onClick={() => setRange(r)} className={`rounded-full px-2.5 py-1 ${range === r ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}>{r} dagar</button>
      ))}
    </div>
  );
}

/* ---------------- Screen 4: Avslut ---------------- */
function Completion({ data, today, onBack, onClose }: { data: AppData; today: string; onBack: () => void; onClose: () => void }) {
  const [range, setRange] = useState<7 | 30>(7);
  const started = data.projects.filter((p) => p.phases.some((ph) => ph.tasks.some((t) => t.done))).length;

  return (
    <section className="animate-fade-up">
      <div className="text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-champagne animate-ring" />
        <h1 className="mx-auto mt-10 max-w-lg text-3xl leading-snug sm:text-4xl">Vackert. Ett mikrosteg närmare verkligheten.</h1>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        <div className={`${card} p-6`}>
          <p className={eyebrow}>Aktiverade planer</p>
          <p className="mt-3 text-4xl font-light">{started}</p>
          <p className="mt-1 text-sm text-muted-foreground">{phasesActivated(data.projects)} faser påbörjade eller framskridna</p>
        </div>
        <div className={`${card} p-6`}>
          <p className={eyebrow}>Kognitiv språngbräda</p>
          <p className="mt-3 text-lg leading-snug">Skärmen kan vila nu. Njut av dagen i den verkliga världen.</p>
        </div>
      </div>

      <div className={`${card} mt-4 p-6`}>
        <div className="mb-3 flex items-center justify-between">
          <p className={eyebrow}>Historik</p>
          <RangeToggle range={range} setRange={setRange} />
        </div>
        <HistoryList log={data.historyLog} today={today} range={range} />
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button className={btnGhost} onClick={onBack}>Till morgonvyn</button>
        <button className={btnPrimary} onClick={onClose}><Moon size={15} /> Stäng appen</button>
      </div>
    </section>
  );
}

/* ---------------- Hamburgermeny ---------------- */
type Tab = "projects" | "ideas" | "notes" | "history" | "settings";
function SideMenu(props: {
  data: AppData; today: string; onClose: () => void; onNew: () => void;
  onPause: (id: string) => void; onResume: (id: string) => void;
  onIdea: (t: string) => void; onRemoveIdea: (id: string) => void;
  onState: (s: AppState) => void; onPanic: () => void; onNudge: () => void; onReset: () => void;
}) {
  const { data, today } = props;
  const [tab, setTab] = useState<Tab | null>(null);
  const [idea, setIdea] = useState("");
  const [range, setRange] = useState<7 | 30>(7);
  const active = data.projects.filter((p) => !p.paused && !isFinished(p));
  const resting = data.projects.filter((p) => p.paused);
  const finished = data.projects.filter((p) => isFinished(p));
  const tabs: [Tab, string, React.ReactNode, number?][] = [
    ["projects", "Aktiva & vilande projekt", <FolderOpen size={16} />, data.projects.length],
    ["ideas", "Idébank", <Lightbulb size={16} />, data.ideas.length],
    ["notes", "Tankeskiss-arkiv", <NotebookPen size={16} />, data.scratchpadBank.length],
    ["history", "Historik", <History size={16} />],
    ["settings", "Nollställ & demo", <Settings2 size={16} />],
  ];
  const current = tabs.find((t) => t[0] === tab);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/15 backdrop-blur-[2px] animate-fade-up" onClick={props.onClose}>
      <aside role="dialog" aria-label="Meny" onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-sm flex-col border-l bg-background shadow-soft">
        <div className="flex items-center justify-between border-b px-6 py-5">
          {tab ? (
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setTab(null)}>← Meny</button>
          ) : <span className="text-lg font-medium">Meny</span>}
          <button aria-label="Stäng menyn" onClick={props.onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!tab && (
            <>
              <button className={btnPrimary + " w-full"} onClick={props.onNew}><Plus size={15} /> Ny ambition</button>
              <ul className="mt-6 grid gap-1">
                {tabs.map(([id, label, icon, n]) => (
                  <li key={id}>
                    <button onClick={() => setTab(id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary">
                      <span className="text-sand-deep">{icon}</span><span className="flex-1">{label}</span>
                      {n ? <span className="text-xs text-muted-foreground">{n}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {current && <h2 className="mb-5 text-xl">{current[1]}</h2>}

          {tab === "projects" && (
            <div className="grid gap-6">
              <Group title="Aktiva">
                {active.length ? active.map((p) => (
                  <Row key={p.id} title={p.title} sub={`Fas ${Math.min(currentPhaseIndex(p) + 1, 4)} av 4`}
                    action={<button className="inline-flex items-center gap-1 text-xs underline underline-offset-4" onClick={() => props.onPause(p.id)}><Pause size={11} /> Vila</button>} />
                )) : <Empty>Inga aktiva projekt.</Empty>}
              </Group>
              <Group title="Vilande">
                {resting.length ? resting.map((p) => (
                  <Row key={p.id} title={p.title} sub="Vilar tryggt"
                    action={<button className="inline-flex items-center gap-1 text-xs underline underline-offset-4" onClick={() => props.onResume(p.id)}><Play size={11} /> Väck</button>} />
                )) : <Empty>Inga vilande projekt.</Empty>}
              </Group>
              {finished.length > 0 && (
                <Group title="Slutförda">
                  {finished.map((p) => <Row key={p.id} title={p.title} sub="Alla fyra faser klara" />)}
                </Group>
              )}
            </div>
          )}

          {tab === "ideas" && (
            <>
              <p className="text-sm text-muted-foreground">En trygg plats för lösa tankar som inte ska störa morgonvyn.</p>
              <div className="mt-4 flex gap-2">
                <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Ny idé…"
                  onKeyDown={(e) => { if (e.key === "Enter" && idea.trim()) { props.onIdea(idea.trim()); setIdea(""); } }}
                  className="min-w-0 flex-1 rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button className={btnGhost + " px-4 py-2.5"} disabled={!idea.trim()} onClick={() => { props.onIdea(idea.trim()); setIdea(""); }}>Spara</button>
              </div>
              <ul className="mt-5 grid gap-2">
                {data.ideas.length ? data.ideas.map((i) => (
                  <li key={i.id} className={`${card} flex items-start gap-3 p-4 text-sm`}>
                    <span className="flex-1">{i.text}</span>
                    <button aria-label="Ta bort" className="text-muted-foreground hover:text-foreground" onClick={() => props.onRemoveIdea(i.id)}><X size={14} /></button>
                  </li>
                )) : <Empty>Idébanken är tom.</Empty>}
              </ul>
            </>
          )}

          {tab === "notes" && (
            <ul className="grid gap-2">
              {data.scratchpadBank.length ? data.scratchpadBank.map((n) => (
                <li key={n.id} className={`${card} p-4 text-sm`}>
                  <p className="text-xs text-muted-foreground">{n.date === today ? "Idag" : fmtDate(n.date)}{n.project ? ` · ${n.project}` : ""}</p>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{n.text}</p>
                </li>
              )) : <Empty>Inga sparade anteckningar än. Tryck "Spara" i Tankeskissen under ett fokuspass.</Empty>}
            </ul>
          )}

          {tab === "history" && (
            <>
              <div className="mb-3 flex justify-end"><RangeToggle range={range} setRange={setRange} /></div>
              <HistoryList log={data.historyLog} today={today} range={range} />
            </>
          )}

          {tab === "settings" && (
            <div className="grid gap-6">
              <Group title="Visa vy">
                <div className="flex flex-wrap gap-2">
                  {([["INTAKE", "Intake"], ["GATEWAY", "Morgonvy"], ["ACTIVE_FOCUS", "Fokus"], ["COMPLETION_REST", "Avslut"]] as [AppState, string][]).map(([s, l]) => (
                    <button key={s} onClick={() => props.onState(s)} className={`rounded-full border px-3 py-1.5 text-xs hover:bg-secondary ${data.appState === s ? "bg-secondary" : ""}`}>{l}</button>
                  ))}
                </div>
              </Group>
              <Group title="Simulera">
                <div className="flex flex-wrap gap-2">
                  <button onClick={props.onPanic} className="rounded-full border px-3 py-1.5 text-xs hover:bg-secondary">Panikspärren</button>
                  <button onClick={props.onNudge} className="rounded-full border px-3 py-1.5 text-xs hover:bg-secondary">Påminnelse</button>
                </div>
              </Group>
              <Group title="Data">
                <p className="text-xs text-muted-foreground">Allt sparas bara i den här webbläsaren.</p>
                <button onClick={props.onReset} className={btnGhost + " mt-2"}><RotateCcw size={14} /> Nollställ allt</button>
              </Group>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div><p className={eyebrow + " mb-2"}>{title}</p><div className="grid gap-2">{children}</div></div>
);
const Row = ({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
    <span className="min-w-0"><span className="block truncate">{title}</span><span className="text-xs text-muted-foreground">{sub}</span></span>
    {action}
  </div>
);
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/* ---------------- Panikspärren ---------------- */
function PanicModal({ projects, onPause, onContinue, onCancel }: {
  projects: Project[]; onPause: (id: string) => void; onContinue: () => void; onCancel: () => void;
}) {
  const [choosing, setChoosing] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 px-4 backdrop-blur-sm animate-fade-up" role="dialog" aria-modal="true" aria-labelledby="panic-title">
      <div className={`${card} relative w-full max-w-md p-8`}>
        <button aria-label="Stäng" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={onCancel}><X size={16} /></button>
        <ShieldCheck className="text-sand-deep" size={22} />
        <h2 id="panic-title" className="mt-4 text-2xl">Känns det mycket just nu?</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Att hålla för många aktiva projekt igång samtidigt skapar oro och kognitiv utmattning. Vill du låta ett projekt VILA en stund?
        </p>
        {choosing ? (
          <ul className="mt-6 grid gap-2">
            {projects.length ? projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => onPause(p.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm hover:bg-secondary">
                  <span className="min-w-0 truncate">{p.title}</span><Pause size={14} className="shrink-0 text-sand-deep" />
                </button>
              </li>
            )) : <li className="text-sm text-muted-foreground">Inga aktiva projekt att vila.</li>}
            <button className="mt-2 text-xs text-muted-foreground underline underline-offset-4" onClick={() => setChoosing(false)}>Tillbaka</button>
          </ul>
        ) : (
          <div className="mt-8 grid gap-2">
            <button className={btnPrimary} onClick={() => setChoosing(true)}><Pause size={15} /> Låt ett projekt vila</button>
            <button className={btnGhost} onClick={onContinue}>Fortsätt ändå, medvetet</button>
            <button className="py-2 text-sm text-muted-foreground hover:text-foreground" onClick={onCancel}>Avbryt och skydda ditt lugn</button>
          </div>
        )}
      </div>
    </div>
  );
}
