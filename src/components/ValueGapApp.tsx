import { useEffect, useState } from "react";
import {
  ArrowRight, ArrowUp, ArrowDown, Check, Clock, Feather, Pencil, Trash2, RotateCcw,
  Bell, ChevronDown, Sparkles, Lock, Sun,
} from "lucide-react";
import {
  type AppData, type Intake, type Task, emptyData, STORAGE_KEY, QUESTIONS,
  generateRoadmap, progress, todayKey, nextStreak, todaysChoices,
} from "@/lib/valuegap";

type Screen = "intake" | "review" | "gateway" | "later" | "focus" | "done";

const card = "rounded-2xl border bg-card shadow-soft";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-secondary";

export default function ValueGapApp() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("intake");
  const [selected, setSelected] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = { ...emptyData, ...JSON.parse(raw) } as AppData;
        setData(d);
        setScreen(d.approved ? "gateway" : d.roadmap.length ? "review" : "intake");
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded]);

  useEffect(() => {
    if (screen !== "later" || nudge) return;
    const t = setTimeout(() => setNudge(true), 60_000);
    return () => clearTimeout(t);
  }, [screen, nudge]);

  const allTasks = data.roadmap.flatMap((p) => p.tasks);
  const current = allTasks.find((t) => t.id === selected) ?? null;

  const complete = () => {
    if (!current) return;
    const today = todayKey();
    setData((d) => {
      const roadmap = d.roadmap.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === current.id ? { ...t, done: true, doneAt: new Date().toISOString() } : t)),
      }));
      let activePhase = d.activePhase;
      while (activePhase < roadmap.length - 1 && roadmap[activePhase].tasks.every((t) => t.done)) activePhase++;
      return { ...d, roadmap, activePhase, streak: nextStreak(d.streak, d.lastDoneDate, today), lastDoneDate: today };
    });
    setScreen("done");
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData(emptyData);
    setSelected(null);
    setNudge(false);
    setScreen("intake");
  };

  if (!loaded) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-champagne text-accent-foreground">
            <Feather size={15} />
          </span>
          <span className="font-serif text-xl">ValueGap</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock size={12} /> Sparas endast lokalt
        </span>
      </header>

      {nudge && (
        <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div className={`${card} animate-slide-down flex flex-wrap items-center gap-4 px-5 py-4`}>
            <Bell size={16} className="text-accent" />
            <span className="font-serif text-lg">Hej. Är du redo att stänga gapet nu?</span>
            <div className="flex gap-2">
              <button className={btnPrimary + " py-2"} onClick={() => { setNudge(false); setScreen("focus"); }}>Ja, kör</button>
              <button className={btnGhost + " py-2"} onClick={() => setNudge(false)}>Pausa 20 min till</button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 pt-12">
        {screen === "intake" && (
          <IntakeForm
            onDone={(intake) => {
              setData((d) => ({ ...d, intake, roadmap: generateRoadmap(intake), approved: false, activePhase: 0 }));
              setScreen("review");
            }}
          />
        )}
        {screen === "review" && (
          <Review
            data={data}
            setData={setData}
            onApprove={() => { setData((d) => ({ ...d, approved: true, activePhase: 0 })); setScreen("gateway"); }}
            onBack={() => setScreen("intake")}
          />
        )}
        {(screen === "gateway" || screen === "later") && (
          <Gateway
            choices={todaysChoices(data.roadmap, data.activePhase)}
            selected={selected}
            setSelected={setSelected}
            later={screen === "later"}
            onStart={() => setScreen("focus")}
            onLater={() => setScreen("later")}
            onFinishedAll={() => setScreen("done")}
          />
        )}
        {screen === "focus" && current && (
          <Focus
            task={current}
            scratch={data.scratchpad}
            setScratch={(s) => setData((d) => ({ ...d, scratchpad: s }))}
            onComplete={complete}
            onBack={() => setScreen("gateway")}
          />
        )}
        {screen === "done" && (
          <Done data={data} onBack={() => { setSelected(null); setScreen("gateway"); }} />
        )}
      </main>

      <DemoBar
        onReset={reset}
        onNudge={() => { if (!selected) { const c = todaysChoices(data.roadmap, data.activePhase)[0]; if (c) setSelected(c.id); } setNudge(true); }}
        onScreen={(s) => {
          if ((s === "focus") && !selected) {
            const c = todaysChoices(data.roadmap, data.activePhase)[0];
            if (!c) return;
            setSelected(c.id);
          }
          if (s !== "intake" && !data.roadmap.length) return;
          setScreen(s);
        }}
        screen={screen}
      />
    </div>
  );
}

/* ---------------- Screen 1 ---------------- */
function IntakeForm({ onDone }: { onDone: (i: Intake) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<Intake>>({ goal: "" });
  const keys = ["goal", "state", "bandwidth", "pitfall", "timeline"] as const;
  const labels = [
    "Vad vill du ha skapat eller uppnått när du är i mål?",
    "Var börjar vi ifrån idag?",
    "Hur mycket ostörd fokustid har du realistiskt per dag för detta?",
    "Vad brukar skapa motstånd när du genomför stora projekt?",
    "När vill du att detta ska vara i hamn?",
  ];
  const key = keys[step];
  const valid = key === "goal" ? (form.goal ?? "").trim().length > 2 : form[key] !== undefined;
  const next = () => (step < 4 ? setStep(step + 1) : onDone(form as Intake));

  return (
    <section className={`${card} animate-fade-up mx-auto max-w-xl p-8 sm:p-10`} key={step}>
      <div className="mb-8 flex gap-1.5">
        {keys.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fråga {step + 1} av 5</p>
      <h1 className="mt-3 text-2xl leading-snug sm:text-3xl">{labels[step]}</h1>

      <div className="mt-8">
        {key === "goal" ? (
          <div>
            <textarea
              autoFocus
              maxLength={120}
              rows={3}
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="t.ex. Bygga och lansera mitt webbtillägg och förbereda en exit"
              className="w-full resize-none rounded-xl border bg-background p-4 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.goal?.length ?? 0}/120</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {QUESTIONS[key].map((opt, i) => {
              const active = form[key] === i;
              return (
                <button
                  key={opt}
                  onClick={() => setForm({ ...form, [key]: i })}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition ${
                    active ? "border-accent bg-champagne/50" : "bg-background hover:bg-secondary"
                  }`}
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? "border-accent bg-accent text-accent-foreground" : ""}`}>
                    {active && <Check size={12} />}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button className="text-sm text-muted-foreground disabled:opacity-0" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Tillbaka
        </button>
        <button className={btnPrimary} disabled={!valid} onClick={next}>
          {step === 4 ? "Skapa min plan" : "Fortsätt"} <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ---------------- Screen 2 ---------------- */
function Review({ data, setData, onApprove, onBack }: {
  data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; onApprove: () => void; onBack: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const total = data.roadmap.reduce((s, p) => s + p.tasks.length, 0);

  const updateTask = (pi: number, fn: (tasks: Task[]) => Task[]) =>
    setData((d) => ({ ...d, roadmap: d.roadmap.map((p, i) => (i === pi ? { ...p, tasks: fn(p.tasks) } : p)) }));

  return (
    <section className="animate-fade-up">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Din plan</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{data.intake?.goal}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {data.roadmap.length} faser · {total} små steg. Justera fritt — det här är din väg.
      </p>

      <ol className="mt-10 space-y-6">
        {data.roadmap.map((phase, pi) => (
          <li key={phase.id} className={`${card} p-6`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-champagne text-xs font-semibold text-accent-foreground">{pi + 1}</span>
              <h2 className="text-xl">{phase.title.split(" · ")[1]}</h2>
            </div>
            <ul className="divide-y">
              {phase.tasks.map((t, ti) => (
                <li key={t.id} className="group flex items-center gap-3 py-3">
                  {editing === t.id ? (
                    <input
                      autoFocus
                      defaultValue={t.title}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v) updateTask(pi, (ts) => ts.map((x) => (x.id === t.id ? { ...x, title: v } : x))); setEditing(null); }}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 text-sm">{t.title}</span>
                  )}
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock size={12} />{t.minutes} min</span>
                  <div className="flex shrink-0 gap-0.5 text-muted-foreground opacity-60 transition group-hover:opacity-100">
                    <IconBtn label="Flytta upp" disabled={ti === 0} onClick={() => updateTask(pi, (ts) => swap(ts, ti, ti - 1))}><ArrowUp size={14} /></IconBtn>
                    <IconBtn label="Flytta ner" disabled={ti === phase.tasks.length - 1} onClick={() => updateTask(pi, (ts) => swap(ts, ti, ti + 1))}><ArrowDown size={14} /></IconBtn>
                    <IconBtn label="Redigera" onClick={() => setEditing(t.id)}><Pencil size={14} /></IconBtn>
                    <IconBtn label="Ta bort" disabled={phase.tasks.length <= 1} onClick={() => updateTask(pi, (ts) => ts.filter((x) => x.id !== t.id))}><Trash2 size={14} /></IconBtn>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap justify-between gap-3">
        <button className={btnGhost} onClick={onBack}>Börja om</button>
        <button className={btnPrimary} onClick={onApprove}>Godkänn plan <Check size={16} /></button>
      </div>
    </section>
  );
}

function swap<T>(a: T[], i: number, j: number) { const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b; }

function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded-md p-1.5 hover:bg-secondary hover:text-foreground disabled:opacity-30">
      {children}
    </button>
  );
}

/* ---------------- Screen 3 ---------------- */
function Gateway({ choices, selected, setSelected, later, onStart, onLater, onFinishedAll }: {
  choices: Task[]; selected: string | null; setSelected: (id: string) => void; later: boolean;
  onStart: () => void; onLater: () => void; onFinishedAll: () => void;
}) {
  if (!choices.length) {
    return (
      <section className="animate-fade-up text-center">
        <h1 className="text-3xl">Hela planen är genomförd.</h1>
        <p className="mt-3 text-muted-foreground">Gapet är stängt. Ta en stund och känn efter.</p>
        <button className={btnPrimary + " mt-8"} onClick={onFinishedAll}>Se dina stats</button>
      </section>
    );
  }
  return (
    <section className={`animate-fade-up transition-opacity duration-700 ${later ? "opacity-60" : ""}`}>
      <Sun size={20} className="text-accent" />
      <h1 className="mt-4 max-w-2xl text-2xl leading-snug sm:text-3xl">
        Ny dag, nya möjligheter. Jag vet att du har många prioriteringar, men håll dessa i huvudet idag:
      </h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {choices.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`${card} p-6 text-left transition ${active ? "border-accent ring-2 ring-accent/40" : "hover:-translate-y-0.5"}`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock size={12} />{t.minutes} min</span>
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-accent bg-accent text-accent-foreground" : ""}`}>
                  {active && <Check size={12} />}
                </span>
              </div>
              <p className="mt-4 font-serif text-xl leading-snug">{t.title}</p>
            </button>
          );
        })}
      </div>
      {later ? (
        <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Jag finns här när du är redo. Vi påminner dig varsamt.
          <button className="ml-auto underline underline-offset-4" onClick={onStart} disabled={!selected}>Börja nu ändå</button>
        </div>
      ) : (
        <div className="mt-10 flex flex-wrap gap-3">
          <button className={btnPrimary} disabled={!selected} onClick={onStart}>Börja nu <ArrowRight size={16} /></button>
          <button className={btnGhost} disabled={!selected} onClick={onLater}>Börja senare</button>
        </div>
      )}
    </section>
  );
}

/* ---------------- Screen 4 ---------------- */
function Focus({ task, scratch, setScratch, onComplete, onBack }: {
  task: Task; scratch: string; setScratch: (s: string) => void; onComplete: () => void; onBack: () => void;
}) {
  const [left, setLeft] = useState(task.minutes * 60);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(i);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = 1 - left / (task.minutes * 60);

  return (
    <section className="animate-fade-up mx-auto max-w-xl text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fokus</p>
      <h1 className="mt-4 text-3xl leading-snug sm:text-4xl">{task.title}</h1>
      <div className="relative mx-auto mt-10 grid h-48 w-48 place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--muted)" strokeWidth="2" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46} strokeDashoffset={2 * Math.PI * 46 * (1 - pct)} className="transition-all duration-1000" />
        </svg>
        <span className="font-serif text-4xl tabular-nums">{mm}:{ss}</span>
      </div>

      <div className={`${card} mt-10 text-left`}>
        <button className="flex w-full items-center justify-between px-5 py-4 text-sm" onClick={() => setOpen(!open)}>
          <span className="inline-flex items-center gap-2"><Pencil size={14} /> Anteckningar</span>
          <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <textarea
            value={scratch}
            onChange={(e) => setScratch(e.target.value)}
            rows={6}
            placeholder="Tankar, länkar, idéer — fånga dem här och fortsätt."
            className="w-full resize-none border-t bg-transparent px-5 py-4 text-sm outline-none"
          />
        )}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button className={btnGhost} onClick={onBack}>Tillbaka</button>
        <button className={btnPrimary} onClick={onComplete}><Check size={16} /> Markera som klar</button>
      </div>
    </section>
  );
}

/* ---------------- Screen 5 ---------------- */
function Done({ data, onBack }: { data: AppData; onBack: () => void }) {
  const [stats, setStats] = useState(false);
  const done = data.roadmap.flatMap((p) => p.tasks).filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  return (
    <section className="animate-fade-up text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-champagne text-accent-foreground animate-ring">
        <Sparkles size={28} />
      </div>
      <h1 className="mx-auto mt-10 max-w-lg text-3xl leading-snug sm:text-4xl">Wow, vad fint att du levde efter dina värderingar!</h1>
      <button className="mt-6 text-sm text-muted-foreground underline underline-offset-4" onClick={() => setStats(!stats)}>
        Vill du se dina stats?
      </button>

      {stats && (
        <div className="animate-fade-up mt-10 text-left">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`${card} p-6`}>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Dagar i linje med dina värderingar</p>
              <p className="mt-3 font-serif text-5xl">{data.streak}</p>
            </div>
            <div className={`${card} p-6`}>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Värdegap stängt</p>
              <p className="mt-3 font-serif text-5xl">{progress(data.roadmap)}%</p>
              <div className="mt-4 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress(data.roadmap)}%` }} />
              </div>
            </div>
          </div>
          <div className={`${card} mt-4 p-6`}>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Slutförda steg</p>
            <ul className="mt-4 divide-y">
              {done.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                  <Check size={14} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">{t.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t.doneAt && new Date(t.doneAt).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <button className={btnPrimary + " mt-10"} onClick={onBack}>Tillbaka till översikten</button>
    </section>
  );
}

/* ---------------- Demo bar ---------------- */
function DemoBar({ onReset, onNudge, onScreen, screen }: {
  onReset: () => void; onNudge: () => void; onScreen: (s: Screen) => void; screen: Screen;
}) {
  const items: [Screen, string][] = [["intake", "1 Intag"], ["review", "2 Plan"], ["gateway", "3 Morgon"], ["focus", "4 Fokus"], ["done", "5 Klar"]];
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
        <span className="mr-1 uppercase tracking-widest">Demo</span>
        {items.map(([s, l]) => (
          <button key={s} onClick={() => onScreen(s)} className={`rounded-full px-2.5 py-1 hover:bg-secondary ${screen === s ? "bg-secondary text-foreground" : ""}`}>{l}</button>
        ))}
        <span className="ml-auto flex gap-1">
          <button onClick={onNudge} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 hover:bg-secondary"><Bell size={12} /> Puff</button>
          <button onClick={onReset} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 hover:bg-secondary"><RotateCcw size={12} /> Nollställ</button>
        </span>
      </div>
    </div>
  );
}
