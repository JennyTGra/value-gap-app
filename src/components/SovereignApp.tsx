import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Clock, Pencil, Plus } from "lucide-react";
import { addDays, generatePlan, todayKey, uid, type Phase } from "@/lib/valuegap";

type Plan = {
  id: string;
  title: string;
  drive: string;
  priority: number;
  pitfall: string;
  deadline: string;
  phases: Phase[];
};
type Note = { id: string; text: string; date: string };
type Done = { date: string; taskId: string; title: string };
type Store = { plan: Plan | null; notes: Note[]; done: Done[] };

const KEY = "valuegap.sovereign.v1";
const empty: Store = { plan: null, notes: [], done: [] };

const DRIVES = ["Lösa egen frustration", "Skapa en tillgång", "Stolt hantverk"];
const PITFALLS = ["Scope Creep", "Detaljpill", "Tidsbrist", "Osäkerhet / Dåligt självförtroende"];

const ease = "cubic-bezier(0.16,1,0.3,1)";
const btn =
  "bg-primary text-primary-foreground font-medium px-5 py-2.5 rounded-md active:scale-[0.98] transition-transform duration-100 disabled:opacity-40";

function pct(ph: Phase) {
  return ph.tasks.length ? Math.round((ph.tasks.filter((t) => t.done).length / ph.tasks.length) * 100) : 0;
}
function total(p: Plan) {
  const all = p.phases.flatMap((x) => x.tasks);
  return all.length ? Math.round((all.filter((t) => t.done).length / all.length) * 100) : 0;
}
function activePhase(p: Plan) {
  const i = p.phases.findIndex((ph) => ph.tasks.some((t) => !t.done));
  return i === -1 ? p.phases.length - 1 : i;
}
function nextSteps(p: Plan, today: string) {
  const ph = p.phases[activePhase(p)];
  return (ph?.tasks ?? []).filter((t) => !t.done && !(t.deferUntil && t.deferUntil > today)).slice(0, 2);
}

export default function SovereignApp() {
  const [s, setS] = useState<Store>(empty);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"dash" | "focus">("dash");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const today = todayKey();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...empty, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(s));
  }, [s, ready]);

  if (!ready) return <div className="min-h-screen bg-background" />;

  const updatePlan = (fn: (p: Plan) => Plan) => setS((x) => (x.plan ? { ...x, plan: fn(x.plan) } : x));

  const completeTask = (id: string) => {
    setS((x) => {
      if (!x.plan) return x;
      let title = "";
      const phases = x.plan.phases.map((ph) => ({
        ...ph,
        tasks: ph.tasks.map((t) => {
          if (t.id !== id) return t;
          title = t.title;
          return { ...t, done: true, doneAt: today };
        }),
      }));
      return { ...x, plan: { ...x.plan, phases }, done: [...x.done, { date: today, taskId: id, title }] };
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={`mx-auto ${s.plan && view === "dash" ? "max-w-4xl" : "max-w-2xl"} px-5 py-8 sm:py-10 transition-[opacity,filter] duration-500`}
        style={{ opacity: resolved ? 0.35 : 1, filter: resolved ? "blur(1px)" : "none" }}
      >
        <TopBar
          title={s.plan ? "Ambitionsöversikt" : "ValueGap"}
          onNew={() => {
            if (confirm("Börja om med en ny plan? Nuvarande plan tas bort.")) setS({ ...s, plan: null });
          }}
          onReset={() => {
            if (confirm("Rensa all data på den här enheten?")) {
              setS(empty);
              setView("dash");
            }
          }}
        />

        {!s.plan ? (
          <Intake onCreate={(plan) => setS({ ...s, plan })} />
        ) : view === "focus" && focusId ? (
          <Focus
            plan={s.plan}
            taskId={focusId}
            onBack={() => setView("dash")}
            onDone={() => {
              completeTask(focusId);
              setView("dash");
            }}
          />
        ) : (
          <Dashboard
            store={s}
            today={today}
            updatePlan={updatePlan}
            setNotes={(notes) => setS({ ...s, notes })}
            onFocus={(id) => {
              setFocusId(id);
              setView("focus");
            }}
            onResolve={() => setResolved(true)}
          />
        )}
      </div>

      {resolved && s.plan && (
        <Resolution plan={s.plan} wins={s.done.filter((d) => d.date === today)} onBack={() => setResolved(false)} />
      )}
    </div>
  );
}

/* ---------------- Intake ---------------- */

function Intake({ onCreate }: { onCreate: (p: Plan) => void }) {
  const [title, setTitle] = useState("");
  const [drive, setDrive] = useState("");
  const [priority, setPriority] = useState(7);
  const [pitfall, setPitfall] = useState("");
  const [micro, setMicro] = useState("");
  const ok = title.trim() && drive && pitfall && micro.trim();

  const create = () => {
    const base = generatePlan(title, 0, 1, pitfall === "Scope Creep");
    const names = ["Planering och avgränsning", "Genomförande", "Utvärdering och justering", "Slutförande och överlämning"];
    const phases = base.phases.map((ph, i) => {
      const named = { ...ph, title: `Fas ${i + 1}: ${names[i]}` };
      return i === 0
        ? { ...named, tasks: [{ ...ph.tasks[0]!, title: micro.trim() }, ...ph.tasks.slice(1)] }
        : named;
    });
    onCreate({ id: uid(), title: title.trim(), drive, priority, pitfall, deadline: "", phases });
  };

  return (
    <section className="animate-fade-up rounded-xl border border-border bg-card p-6 sm:p-8 shadow-soft">
      <h1 className="text-3xl">Skapa din plan</h1>
      <p className="mt-2 text-muted-foreground">Några lugna frågor. Ingen brådska.</p>

      <div className="mt-8 space-y-8">
        <Field n={1} label="Vad för projekt vill du skapa eller färdigställa?">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="t.ex. Genomföra min huvudambition och färdigställa underlaget"
            className="w-full rounded-md border border-input bg-background px-4 py-3 outline-none focus:border-ring"
          />
        </Field>

        <Field n={2} label="Varför måste det här projektet existera i världen?">
          <Radios options={DRIVES} value={drive} onChange={setDrive} />
        </Field>

        <Field n={3} label="Hur viktigt är det att påbörja eller bli klar med det här projektet?">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={10}
              value={priority}
              onChange={(e) => setPriority(+e.target.value)}
              className="flex-1 accent-[var(--primary)]"
            />
            <span className="w-8 text-right text-xl font-medium">{priority}</span>
          </div>
          <p className="mt-3 text-sm italic text-muted-foreground">
            Varför valde du {priority} och inte en {priority > 2 ? 2 : 1}:a?
          </p>
        </Field>

        <Field n={4} label="Vad brukar stanna av dina byggen innan mållinjen?">
          <Radios options={PITFALLS} value={pitfall} onChange={setPitfall} />
        </Field>

        <Field n={5} label="Skriv ett första mikrosteg (< 5 min) för att skapa omedelbart momentum">
          <input
            value={micro}
            onChange={(e) => setMicro(e.target.value)}
            placeholder="t.ex. Skriv en rå rubrik i utkastet"
            className="w-full rounded-md border border-input bg-background px-4 py-3 outline-none focus:border-ring"
          />
        </Field>
      </div>

      <button disabled={!ok} onClick={create} className={btn + " mt-10 w-full sm:w-auto"}>
        Skapa din plan & Se nästa steg
      </button>
    </section>
  );
}

function Field({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-medium">
        <span className="mr-2 text-sand-deep">{n}.</span>
        {label}
      </p>
      {children}
    </div>
  );
}

function Radios({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-md border px-4 py-3 text-left transition-colors active:scale-[0.99] ${
            value === o ? "border-accent bg-accent/40" : "border-border bg-background hover:border-accent"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard({
  store,
  today,
  updatePlan,
  setNotes,
  onFocus,
  onResolve,
}: {
  store: Store;
  today: string;
  updatePlan: (fn: (p: Plan) => Plan) => void;
  setNotes: (n: Note[]) => void;
  onFocus: (id: string) => void;
  onResolve: () => void;
}) {
  const plan = store.plan!;
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(plan.title);
  const [draftDate, setDraftDate] = useState(plan.deadline);
  const [leaving, setLeaving] = useState<string | null>(null);
  const steps = nextSteps(plan, today);
  const ai = activePhase(plan);
  const progress = total(plan);

  const later = (id: string) => {
    setLeaving(id);
    setTimeout(() => {
      updatePlan((p) => ({
        ...p,
        phases: p.phases.map((ph) => ({
          ...ph,
          tasks: ph.tasks.map((t) => (t.id === id ? { ...t, deferUntil: addDays(today, 1) } : t)),
        })),
      }));
      setLeaving(null);
    }, 200);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="rounded-xl border border-border bg-card p-5 text-muted-foreground">
        Du gör framsteg i din egen takt. Varje litet steg för dig närmare din ambition – i din egen rytm och på dina
        egna villkor.
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
        {editing ? (
          <div className="space-y-3">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
            <label className="block text-sm text-muted-foreground">
              Måldatum
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-foreground"
              />
            </label>
            <div className="flex gap-3">
              <button
                className={btn}
                onClick={() => {
                  updatePlan((p) => ({ ...p, title: draftTitle.trim() || p.title, deadline: draftDate }));
                  setEditing(false);
                }}
              >
                Spara
              </button>
              <button className="text-sm hover:underline" onClick={() => setEditing(false)}>
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl">{plan.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.deadline ? `Måldatum ${plan.deadline}` : "Inget måldatum"} · {plan.phases[ai]?.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setDraftTitle(plan.title);
                  setDraftDate(plan.deadline);
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent"
              >
                <Pencil className="h-3.5 w-3.5" /> Redigera
              </button>
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-sand-deep transition-[width] duration-700"
                style={{ width: `${progress}%`, transitionTimingFunction: ease }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{progress} % åstadkommit</p>
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center">
          <button className={btn} disabled={!steps[0]} onClick={() => steps[0] && onFocus(steps[0].id)}>
            Se nästa steg
          </button>
          <span onClick={onResolve} className="ml-4 cursor-pointer text-foreground hover:underline">
            Avsluta jag är nöjd
          </span>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Nästa steg (max 2 mikrosteg &lt; 5 min)
        </h2>
        {steps.length === 0 ? (
          <p className="text-muted-foreground">
            {progress === 100 ? "Hela planen är genomförd." : "Inget mer för idag. Vila är också framsteg."}
          </p>
        ) : (
          <div className="space-y-3">
            {steps.map((t, i) => (
              <div
                key={t.id}
                className={`rounded-lg border bg-background p-4 ${i === 0 ? "border-accent" : "border-border"}`}
                style={{
                  transition: `transform 200ms ${ease}, opacity 200ms ${ease}`,
                  transform: leaving === t.id ? "translateY(-12px)" : "none",
                  opacity: leaving === t.id ? 0 : 1,
                }}
              >
                <p className="font-medium">{t.title}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> &lt; 5 min · Fas {ai + 1}
                </p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  <button className={btn} onClick={() => onFocus(t.id)}>
                    Jag vill ta ett mikrosteg!
                  </button>
                  <button
                    className="rounded-lg border border-border px-4 py-2 text-sm active:scale-[0.98] transition-transform duration-100 hover:border-accent"
                    onClick={() => later(t.id)}
                  >
                    Börja senare (skuldfri förskjutning)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Notes notes={store.notes} setNotes={setNotes} today={today} />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Hela planen (4 faser)</h2>
        <div className="space-y-4">
          {plan.phases.map((ph, i) => {
            const v = pct(ph);
            const status = v === 100 ? "Slutförd" : i === ai ? "Aktiv" : "Planerad";
            const showTasks = v === 100 || i === ai;
            return (
              <div key={ph.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={i === ai ? "font-medium" : ""}>{ph.title}</span>
                  <span
                    className={`shrink-0 rounded-md border px-2.5 py-0.5 text-xs ${
                      i === ai ? "border-accent bg-accent/40" : "border-border text-muted-foreground"
                    }`}
                  >
                    {status} {v}%
                  </span>
                </div>
                {showTasks && (
                  <ul className="mt-2 grid gap-1 pl-4 text-sm text-muted-foreground sm:grid-cols-2">
                    {ph.tasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
                            t.done ? "border-sand-deep" : "border-border"
                          }`}
                        >
                          {t.done && <Check className="h-2.5 w-2.5 text-sand-deep" />}
                        </span>
                        {t.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <History done={store.done} today={today} />
    </div>
  );
}

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-5 text-left">
        <span className="font-medium">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", transitionTimingFunction: ease }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Notes({ notes, setNotes, today }: { notes: Note[]; setNotes: (n: Note[]) => void; today: string }) {
  const [text, setText] = useState("");
  return (
    <Accordion title="Mina anteckningar och idéarkiv">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="En tanke, en referens, en idé..."
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring"
      />
      <button
        disabled={!text.trim()}
        onClick={() => {
          setNotes([{ id: uid(), text: text.trim(), date: today }, ...notes]);
          setText("");
        }}
        className={btn + " mt-2 inline-flex items-center gap-1.5 text-sm"}
      >
        <Plus className="h-4 w-4" /> Spara
      </button>
      <ul className="mt-4 space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="group rounded-md border border-border bg-background p-3 text-sm">
            <p className="whitespace-pre-wrap">{n.text}</p>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{n.date}</span>
              <button className="hover:underline" onClick={() => setNotes(notes.filter((x) => x.id !== n.id))}>
                Ta bort
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Accordion>
  );
}

function History({ done, today }: { done: Done[]; today: string }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, -i)), [today]);
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-medium">Senast gjort</h2>
      <ul className="space-y-3 text-sm">
        {days.map((d) => {
          const items = done.filter((x) => x.date === d);
          return (
            <li key={d} className="flex gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
              <span className="w-24 shrink-0 text-muted-foreground">{d === today ? "Idag" : d}</span>
              {items.length ? (
                <ul className="space-y-1">
                  {items.map((x) => (
                    <li key={x.taskId} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-sand-deep" /> {x.title}
                    </li>
                  ))}
                </ul>
              ) : d === today ? (
                <span className="text-muted-foreground">Dagen är fortfarande öppen</span>
              ) : (
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Andra prioriteringar{" "}
                  <span className="normal-case tracking-normal">(Planerad återhämtning – bevarade din kognitiva energi)</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- Focus ---------------- */

function Focus({ plan, taskId, onBack, onDone }: { plan: Plan; taskId: string; onBack: () => void; onDone: () => void }) {
  const task = plan.phases.flatMap((p) => p.tasks).find((t) => t.id === taskId);
  const [left, setLeft] = useState(300);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  if (!task) return null;
  return (
    <section
      className="animate-fade-up rounded-xl border border-accent bg-card p-8 text-center shadow-soft"
      style={{
        transition: `transform 200ms ${ease}, opacity 200ms ${ease}`,
        transform: leaving ? "translateY(-24px)" : "none",
        opacity: leaving ? 0 : 1,
      }}
    >
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Översikten
      </button>
      <p className="text-sm uppercase tracking-wider text-muted-foreground">{plan.title}</p>
      <h1 className="mt-3 text-2xl">{task.title}</h1>
      <p className="mt-8 text-5xl font-light tabular-nums">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Bara det här. Inget annat just nu.</p>
      <button
        className={btn + " mt-8"}
        onClick={() => {
          setLeaving(true);
          setTimeout(onDone, 200);
        }}
      >
        Klart
      </button>
    </section>
  );
}

/* ---------------- Resolution ---------------- */

function Resolution({ plan, wins, onBack }: { plan: Plan; wins: Done[]; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-5 backdrop-blur-sm">
      <div className="animate-fade-up w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-soft">
        <p className="text-xs font-medium tracking-[0.2em] text-sand-deep">LOOPEN ÄR STÄNGD</p>
        <p className="mt-3 text-lg">
          Bra jobbat för idag. Du har flyttat din ambition framåt och kan stänga skärmen med fullständigt gott samvete.
        </p>
        <hr className="my-6 border-border" />
        <p className="text-xs font-medium tracking-[0.15em] text-muted-foreground">VAD DU ÅSTADKOMMIT IDAG:</p>
        {wins.length ? (
          <ul className="mt-3 space-y-2">
            {wins.map((w) => (
              <li key={w.taskId} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-sand-deep" /> {w.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted-foreground">Du gav dig själv utrymme idag. Det räknas också.</p>
        )}
        <p className="mt-6 text-xs font-medium tracking-[0.15em] text-muted-foreground">TOTAL FRAMDRIFT:</p>
        <p className="mt-2">{total(plan)} % av hela planen är nu genomförd.</p>
        <hr className="my-6 border-border" />
        <button className={btn} onClick={onBack}>
          Tillbaka till översikten
        </button>
      </div>
    </div>
  );
}
