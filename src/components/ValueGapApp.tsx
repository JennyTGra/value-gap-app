import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Check, Clock, Feather, Lock, Sun, Moon, Pause, CalendarArrowUp, Leaf,
  Plus, Wind, PencilLine, RotateCcw, ShieldCheck, X, Play, Coffee,
} from "lucide-react";
import {
  type AppData, type AppState, type Project, type Task, type LogEntry,
  emptyData, STORAGE_KEY, QUESTIONS, generatePlan, todaysChoices, shouldTriggerPanic,
  phasesActivated, todayKey, addDays, closeDays, currentPhaseIndex,
} from "@/lib/valuegap";

const card = "rounded-2xl border bg-card shadow-soft";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-40";
const eyebrow = "text-xs uppercase tracking-[0.2em] text-muted-foreground";

export default function ValueGapApp() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [panic, setPanic] = useState(false);
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

  // Midnight close while the tab stays open
  useEffect(() => {
    if (!loaded || data.lastOpenDate === today) return;
    setData((d) => ({ ...d, historyLog: closeDays(d.historyLog, d.lastOpenDate, today), lastOpenDate: today }));
  }, [today, loaded, data.lastOpenDate]);

  const project = data.projects.find((p) => p.id === data.activeId && !p.paused) ?? data.projects.find((p) => !p.paused);
  const choices = todaysChoices(project, today);
  const allTasks = data.projects.flatMap((p) => p.phases.flatMap((ph) => ph.tasks));
  const current = allTasks.find((t) => t.id === selected) ?? choices[0] ?? null;
  const go = (appState: AppState) => setData((d) => ({ ...d, appState }));
  const nudge = data.snoozeUntil !== null && now >= data.snoozeUntil && data.appState === "GATEWAY";

  const updateTasks = (fn: (t: Task) => Task) =>
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) => ({ ...p, phases: p.phases.map((ph) => ({ ...ph, tasks: ph.tasks.map(fn) })) })),
    }));

  const log = (e: LogEntry) => setData((d) => ({ ...d, historyLog: [...d.historyLog, e] }));

  const complete = () => {
    if (!current) return;
    updateTasks((t) => (t.id === current.id ? { ...t, done: true, doneAt: new Date().toISOString() } : t));
    log({ date: today, status: "COMPLETED", taskName: current.title });
    setSelected(null);
    go("COMPLETION_REST");
  };

  const newAmbition = () => (shouldTriggerPanic(data.projects) ? setPanic(true) : go("INTAKE"));

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData({ ...emptyData, lastOpenDate: todayKey() });
    setSelected(null); setPanic(false); setClosed(false);
  };

  if (!loaded) return <div className="min-h-screen" />;

  if (closed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center animate-fade-up">
        <div>
          <Moon className="mx-auto text-accent" size={22} />
          <h1 className="mt-6 text-3xl">Skärmen kan vila nu.</h1>
          <p className="mt-3 text-muted-foreground">Njut av dagen i den verkliga världen.</p>
          <button className="mt-10 text-sm text-muted-foreground underline underline-offset-4" onClick={() => setClosed(false)}>Öppna igen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 pt-8">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-champagne text-accent-foreground"><Feather size={15} /></span>
          <span className="truncate font-serif text-xl">ValueGap</span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {data.projects.length > 0 && data.appState !== "INTAKE" && (
            <button onClick={newAmbition} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Plus size={13} /> Ny ambition
            </button>
          )}
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><Lock size={12} /> Endast lokalt</span>
        </div>
      </header>

      {nudge && (
        <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div className={`${card} animate-slide-down flex flex-wrap items-center gap-4 px-5 py-4`}>
            <span className="font-serif text-lg">Hej. Är du redo nu?</span>
            <div className="flex gap-2">
              <button className={btnPrimary + " py-2"} onClick={() => { setData((d) => ({ ...d, snoozeUntil: null, appState: "ACTIVE_FOCUS" })); }}>Ja, kör</button>
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
            onApprove={(p) => setData((d) => ({ ...d, projects: [...d.projects, p], activeId: p.id, appState: "GATEWAY" }))}
          />
        )}
        {data.appState === "GATEWAY" && (
          <Gateway
            data={data} project={project} choices={choices} selected={current?.id ?? null} setSelected={setSelected}
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
            onSwitch={(id) => setData((d) => ({ ...d, activeId: id }))}
            onResume={(id) => setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, paused: false } : p)), activeId: id }))}
            onNew={newAmbition}
          />
        )}
        {data.appState === "ACTIVE_FOCUS" && current && (
          <Focus
            task={current} scratch={data.scratchpad}
            setScratch={(s) => setData((d) => ({ ...d, scratchpad: s }))}
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

      {panic && (
        <PanicModal
          projects={data.projects.filter((p) => !p.paused)}
          onPause={(id) => { setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, paused: true } : p)), appState: "INTAKE" })); setPanic(false); }}
          onContinue={() => { setPanic(false); go("INTAKE"); }}
          onCancel={() => setPanic(false)}
        />
      )}

      <DemoBar
        state={data.appState}
        onState={(s) => { if (s !== "INTAKE" && !data.projects.length) return; go(s); }}
        onPanic={() => setPanic(true)}
        onNudge={() => setData((d) => ({ ...d, snoozeUntil: Date.now() - 1, appState: d.projects.length ? "GATEWAY" : d.appState }))}
        onReset={reset}
      />
    </div>
  );
}

/* ---------------- Screen 1: Intake ---------------- */
function Intake({ onApprove, canCancel, onCancel }: { onApprove: (p: Project) => void; canCancel: boolean; onCancel: () => void }) {
  const [step, setStep] = useState<"dump" | "q" | "plan">("dump");
  const [dump, setDump] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<number | null>(null);
  const [modular, setModular] = useState<number | null>(null);
  const [plan, setPlan] = useState<Project | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  if (step === "dump") {
    return (
      <section className="animate-fade-up mx-auto max-w-2xl">
        <p className={eyebrow}>Dumpa</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">Rå hjärndump</h1>
        <textarea
          autoFocus rows={9} value={dump} onChange={(e) => setDump(e.target.value)}
          placeholder="Dumpa allt som snurrar i huvudet just nu... Skriv helt fritt i 30 sekunder utan krav på struktur."
          className={`${card} mt-8 w-full resize-none p-6 text-base leading-relaxed outline-none focus:ring-2 focus:ring-ring`}
        />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {canCancel ? <button className="text-sm text-muted-foreground" onClick={onCancel}>Avbryt</button> : <span />}
          <button className={btnPrimary} disabled={dump.trim().length < 3} onClick={() => setStep("q")}>
            Forma detta till en plan <ArrowRight size={16} />
          </button>
        </div>
      </section>
    );
  }

  if (step === "q") {
    const ready = start !== null && horizon !== null && modular !== null;
    return (
      <section className={`${card} animate-fade-up mx-auto max-w-xl p-8 sm:p-10`}>
        <p className={eyebrow}>Några snabba val</p>
        <Choice label="Var befinner du dig just nu?" options={QUESTIONS.start} value={start} onChange={setStart} />
        <Choice label="Hur ser tidsramen ut?" options={QUESTIONS.horizon} value={horizon} onChange={setHorizon} />
        <Choice label="Är projektet modulärt?" options={QUESTIONS.modular} value={modular} onChange={setModular} />
        <div className="mt-10 flex items-center justify-between">
          <button className="text-sm text-muted-foreground" onClick={() => setStep("dump")}>Tillbaka</button>
          <button className={btnPrimary} disabled={!ready}
            onClick={() => { setPlan(generatePlan(dump, start!, horizon!, modular === 0)); setStep("plan"); }}>
            Visa min plan <ArrowRight size={16} />
          </button>
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
      <p className={eyebrow}>Din 4-stegsplan</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{plan.title}</h1>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {plan.phases.map((ph, pi) => (
          <li key={ph.id} className={`${card} p-6 ${pi === 0 ? "sm:col-span-2" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-champagne text-xs font-semibold text-accent-foreground">{pi + 1}</span>
              <h2 className="text-xl">{ph.title.split(" · ")[1]}</h2>
            </div>
            <ul className="mt-4 space-y-2.5">
              {ph.tasks.filter((t) => t.id !== first.id).map((t) => (
                <li key={t.id} className="group flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
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
              <div className="mt-6 rounded-xl bg-champagne/50 p-5">
                <p className="font-serif text-lg">Vill du ta ett första mikrosteg?</p>
                <p className="mt-2 flex items-center gap-2 text-sm"><Clock size={13} className="shrink-0 text-accent" /> {first.title} <span className="text-muted-foreground">· &lt; 5 min</span></p>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap justify-between gap-3">
        <button className={btnGhost} onClick={() => setStep("q")}>Justera val</button>
        <button className={btnPrimary} onClick={() => onApprove(plan)}>Godkänn plan & Aktivera första steget <Check size={16} /></button>
      </div>
    </section>
  );
}

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: number | null; onChange: (i: number) => void }) {
  return (
    <fieldset className="mt-8">
      <legend className="font-serif text-xl">{label}</legend>
      <div className="mt-4 grid gap-2">
        {options.map((opt, i) => (
          <button key={opt} onClick={() => onChange(i)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${value === i ? "border-accent bg-champagne/50" : "bg-background hover:bg-secondary"}`}>
            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${value === i ? "border-accent bg-accent text-accent-foreground" : ""}`}>
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
  data: AppData; project: Project | undefined; choices: Task[]; selected: string | null; setSelected: (id: string) => void;
  today: string; now: number; onStart: () => void; onSnooze: () => void; onWake: () => void; onDefer: (days: number) => void;
  onRecovery: () => void; onSwitch: (id: string) => void; onResume: (id: string) => void; onNew: () => void;
}) {
  const { data, project, choices, selected, setSelected, today, now } = props;
  const [menu, setMenu] = useState(false);
  const restedToday = data.historyLog.some((e) => e.date === today && e.status === "RECOVERY");
  const snoozed = data.snoozeUntil !== null && now < data.snoozeUntil;
  const paused = data.projects.filter((p) => p.paused);
  const active = data.projects.filter((p) => !p.paused);

  if (!project) {
    return (
      <section className="animate-fade-up text-center">
        <h1 className="text-3xl">Alla projekt vilar just nu.</h1>
        <p className="mt-3 text-muted-foreground">Det är helt i sin ordning.</p>
        <ProjectList paused={paused} onResume={props.onResume} />
        <button className={btnGhost + " mt-8"} onClick={props.onNew}><Plus size={15} /> Ny ambition</button>
      </section>
    );
  }

  return (
    <section className="animate-fade-up">
      {active.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {active.map((p) => (
            <button key={p.id} onClick={() => props.onSwitch(p.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${p.id === project.id ? "border-accent bg-champagne/60" : "text-muted-foreground hover:bg-secondary"}`}>
              {p.title}
            </button>
          ))}
        </div>
      )}
      <Sun size={20} className="text-accent" />
      <h1 className="mt-4 max-w-2xl text-2xl leading-snug sm:text-3xl">
        God morgon. Ditt sinne är lugnt. Här är dagens enda riktning:
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{project.title} · Fas {Math.min(currentPhaseIndex(project) + 1, 4)} av 4</p>

      {restedToday ? (
        <div className={`${card} mt-10 p-8 text-center`}>
          <Leaf className="mx-auto text-accent" size={20} />
          <p className="mt-4 font-serif text-2xl">Du har gjort det bra idag!</p>
          <p className="mt-2 text-sm text-muted-foreground">Planerad återhämtning. En vilodag bevarar din kognitiva energi och bryter ingen vanebildning.</p>
        </div>
      ) : !choices.length ? (
        <div className={`${card} mt-10 p-8 text-center`}>
          <p className="font-serif text-2xl">Inget väntar på dig idag.</p>
          <p className="mt-2 text-sm text-muted-foreground">Stegen ligger lugnt kvar till sin dag.</p>
        </div>
      ) : (
        <>
          <div className={`mt-10 grid gap-4 sm:grid-cols-2 transition-opacity duration-700 ${snoozed ? "opacity-50" : ""}`}>
            {choices.map((t) => {
              const on = selected === t.id;
              return (
                <button key={t.id} onClick={() => setSelected(t.id)}
                  className={`${card} p-6 text-left transition ${on ? "border-accent ring-2 ring-accent/40" : "hover:-translate-y-0.5"}`}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"><Clock size={11} />&lt; 5 min</span>
                    <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? "border-accent bg-accent text-accent-foreground" : ""}`}>{on && <Check size={12} />}</span>
                  </div>
                  <p className="mt-4 font-serif text-xl leading-snug">{t.title}</p>
                </button>
              );
            })}
          </div>

          {snoozed ? (
            <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Vilar i bakgrunden till {new Date(data.snoozeUntil!).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}.
              <button className="underline underline-offset-4" onClick={props.onWake}>Jag är redo nu</button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              <div>
                <button className={btnPrimary} disabled={!selected} onClick={props.onStart}>Jag vill ta ett mikrosteg! <ArrowRight size={16} /></button>
                <p className="mt-2 max-w-xs text-xs text-muted-foreground">1 djupt, ostört fokusblock (Rovdjursrytm – pedantisk närvaro).</p>
              </div>
              <div className="relative">
                <button className={btnGhost} onClick={() => setMenu(!menu)}>Börja när du vill</button>
                {menu && (
                  <div className={`${card} animate-fade-up mt-3 grid max-w-sm gap-1 p-2`}>
                    <MenuItem icon={<Pause size={15} />} label="Pausa 30 minuter i bakgrunden" onClick={() => { setMenu(false); props.onSnooze(); }} />
                    <MenuItem icon={<CalendarArrowUp size={15} />} label="Flytta lugnt till imorgon" onClick={() => { setMenu(false); props.onDefer(1); }} />
                    <MenuItem icon={<CalendarArrowUp size={15} />} label="Flytta lugnt till nästa vecka" onClick={() => { setMenu(false); props.onDefer(7); }} />
                    <MenuItem icon={<Leaf size={15} />} label="Markera som planerad återhämtning" onClick={() => { setMenu(false); props.onRecovery(); }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <ProjectList paused={paused} onResume={props.onResume} />
    </section>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary">
      <span className="text-accent">{icon}</span>{label}
    </button>
  );
}

function ProjectList({ paused, onResume }: { paused: Project[]; onResume: (id: string) => void }) {
  if (!paused.length) return null;
  return (
    <div className="mt-14 border-t pt-6 text-left">
      <p className={eyebrow}>Vilande projekt</p>
      <ul className="mt-3 space-y-2">
        {paused.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-muted-foreground">{p.title}</span>
            <button className="inline-flex shrink-0 items-center gap-1 text-xs underline underline-offset-4" onClick={() => onResume(p.id)}><Play size={11} /> Väck</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Screen 3: Fokus ---------------- */
function Focus({ task, scratch, setScratch, onComplete, onBack }: {
  task: Task; scratch: string; setScratch: (s: string) => void; onComplete: () => void; onBack: () => void;
}) {
  const [length, setLength] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  useEffect(() => { setLeft(length * 60); }, [length]);
  useEffect(() => { const i = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000); return () => clearInterval(i); }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <section className="animate-fade-up mx-auto max-w-2xl">
      <p className={eyebrow + " text-center"}>Aktivt fokuspass</p>
      <h1 className="mt-6 text-center text-4xl leading-tight sm:text-5xl">{task.title}</h1>
      <div className="mt-10 flex flex-col items-center gap-3">
        <span className="font-serif text-2xl tabular-nums text-muted-foreground">{mm}:{ss}</span>
        <div className="flex gap-1 text-xs">
          {[15, 25, 45].map((m) => (
            <button key={m} onClick={() => setLength(m)}
              className={`rounded-full px-3 py-1 transition ${length === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}>{m} min</button>
          ))}
        </div>
      </div>
      <div className={`${card} mt-12`}>
        <div className="flex items-center gap-2 border-b px-5 py-3 text-xs text-muted-foreground"><PencilLine size={13} /> Tankeskiss</div>
        <textarea value={scratch} onChange={(e) => setScratch(e.target.value)} rows={6}
          placeholder="Fånga tankar och sidospår här så att du slipper byta flik."
          className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed outline-none" />
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button className={btnGhost} onClick={onBack}>Tillbaka</button>
        <button className={btnPrimary} onClick={onComplete}><Check size={16} /> Slutför mikrosteg</button>
      </div>
    </section>
  );
}

/* ---------------- Screen 4: Avslut ---------------- */
function Completion({ data, today, onBack, onClose }: { data: AppData; today: string; onBack: () => void; onClose: () => void }) {
  const days = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const e of data.historyLog) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  }, [data.historyLog]);
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
          <p className="mt-3 font-serif text-4xl">{started}</p>
          <p className="mt-1 text-sm text-muted-foreground">{phasesActivated(data.projects)} faser påbörjade eller framskridna</p>
        </div>
        <div className={`${card} p-6`}>
          <p className={eyebrow}>Kognitiv språngbräda</p>
          <p className="mt-3 font-serif text-lg leading-snug">Målet är uppnått för stunden. Stäng fliken och njut av dagen i den verkliga världen.</p>
        </div>
      </div>

      <div className={`${card} mt-4 p-6`}>
        <p className={eyebrow}>Historik</p>
        <ul className="mt-4 divide-y">
          {days.map(([date, entries]) => {
            const done = entries.filter((e) => e.status === "COMPLETED");
            const rest = entries.some((e) => e.status === "RECOVERY");
            return (
              <li key={date} className="flex items-start gap-3 py-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  {date === today ? "Idag" : new Date(date + "T12:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
                {done.length ? (
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {done.map((e, i) => <span key={i} className="flex items-center gap-2"><Check size={13} className="shrink-0 text-accent" />{e.taskName}</span>)}
                  </span>
                ) : rest ? (
                  <span className="flex items-center gap-2 text-muted-foreground"><Leaf size={13} className="text-accent" /> Du har gjort det bra idag!</span>
                ) : (
                  <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><Coffee size={13} /> Andra prioriteringar</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Wind size={12} /> En vilodag bevarar din kognitiva energi och bryter ingen vanebildning.</p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button className={btnGhost} onClick={onBack}>Till morgonvyn</button>
        <button className={btnPrimary} onClick={onClose}><Moon size={15} /> Stäng och lämna skärmen</button>
      </div>
    </section>
  );
}

/* ---------------- Panikspärren ---------------- */
function PanicModal({ projects, onPause, onContinue, onCancel }: {
  projects: Project[]; onPause: (id: string) => void; onContinue: () => void; onCancel: () => void;
}) {
  const [choosing, setChoosing] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 px-4 backdrop-blur-sm animate-fade-up" role="dialog" aria-modal="true" aria-labelledby="panic-title">
      <div className={`${card} relative w-full max-w-md p-8`}>
        <button aria-label="Stäng" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={onCancel}><X size={16} /></button>
        <ShieldCheck className="text-accent" size={22} />
        <h2 id="panic-title" className="mt-4 text-2xl">Har du mycket nu?</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Att stapla för många ambitioner samtidigt skapar kognitiv stress och panikångest. Är det något du vill pausa eller lägga i vila innan vi tar in detta?
        </p>
        {choosing ? (
          <ul className="mt-6 grid gap-2">
            {projects.length ? projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => onPause(p.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm hover:bg-secondary">
                  <span className="min-w-0 truncate">{p.title}</span><Pause size={14} className="shrink-0 text-accent" />
                </button>
              </li>
            )) : <li className="text-sm text-muted-foreground">Inga aktiva projekt att pausa.</li>}
            <button className="mt-2 text-xs text-muted-foreground underline underline-offset-4" onClick={() => setChoosing(false)}>Tillbaka</button>
          </ul>
        ) : (
          <div className="mt-8 grid gap-2">
            <button className={btnPrimary} onClick={() => setChoosing(true)}><Pause size={15} /> Pausa ett tidigare projekt</button>
            <button className={btnGhost} onClick={onContinue}>Fortsätt ändå medvetet</button>
            <button className="py-2 text-sm text-muted-foreground hover:text-foreground" onClick={onCancel}>Avbryt och bevara lugnet</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Demo Controls ---------------- */
function DemoBar({ state, onState, onPanic, onNudge, onReset }: {
  state: AppState; onState: (s: AppState) => void; onPanic: () => void; onNudge: () => void; onReset: () => void;
}) {
  const items: [AppState, string][] = [["INTAKE", "Intake"], ["GATEWAY", "Morgonvy"], ["ACTIVE_FOCUS", "Fokus"], ["COMPLETION_REST", "Avslut"]];
  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="flex max-w-full flex-wrap items-center gap-1 rounded-full border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-soft backdrop-blur">
        <span className="mr-1 uppercase tracking-widest">Demo</span>
        {items.map(([s, l]) => (
          <button key={s} onClick={() => onState(s)} className={`rounded-full px-2.5 py-1 hover:bg-secondary ${state === s ? "bg-secondary text-foreground" : ""}`}>{l}</button>
        ))}
        <button onClick={onPanic} className="rounded-full px-2.5 py-1 hover:bg-secondary">Panikspärr</button>
        <button onClick={onNudge} className="rounded-full px-2.5 py-1 hover:bg-secondary">Påminnelse</button>
        <button onClick={onReset} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 hover:bg-secondary"><RotateCcw size={11} /> Nollställ</button>
      </div>
    </div>
  );
}
