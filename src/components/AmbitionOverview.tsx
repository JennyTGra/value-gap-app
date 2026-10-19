import { useMemo, useState } from "react";
import { ArrowLeft, Check, Clock, Pencil, Plus } from "lucide-react";
import { addDays, currentPhaseIndex, todaysChoices, type AppData, type Project, type Phase } from "@/lib/valuegap";

const ease = "cubic-bezier(0.16,1,0.3,1)";
const btn =
  "bg-primary text-primary-foreground font-medium px-5 py-2.5 rounded-lg active:scale-[0.98] transition-transform duration-100 disabled:opacity-40";
const ghost =
  "rounded-lg border border-border px-4 py-2 text-sm active:scale-[0.98] transition-transform duration-100 hover:border-accent";
const label = "text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground";
const PHASE_NAMES = ["Planering och avgränsning", "Genomförande", "Utvärdering och justering", "Slutförande och överlämning"];

const pct = (ph: Phase) =>
  ph.tasks.length ? Math.round((ph.tasks.filter((t) => t.done).length / ph.tasks.length) * 100) : 0;
export const totalPct = (p: Project) => {
  const all = p.phases.flatMap((x) => x.tasks);
  return all.length ? Math.round((all.filter((t) => t.done).length / all.length) * 100) : 0;
};
const phaseName = (ph: Phase, i: number) => `Fas ${i + 1}: ${PHASE_NAMES[i] ?? ph.title}`;

export default function AmbitionOverview(props: {
  data: AppData;
  project: Project;
  today: string;
  onBack: () => void;
  onFocus: (taskId: string) => void;
  onDefer: (taskId: string) => void;
  onEdit: (patch: Partial<Project>) => void;
  onAddNote: (text: string) => void;
  onRemoveNote: (id: string) => void;
}) {
  const { data, project: p, today } = props;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [deadline, setDeadline] = useState(p.deadline ?? "");
  const [leaving, setLeaving] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const steps = todaysChoices(p, today);
  const ai = Math.min(currentPhaseIndex(p), p.phases.length - 1);
  const progress = totalPct(p);
  const taskNames = new Set(p.phases.flatMap((ph) => ph.tasks.map((t) => t.title)));
  const wins = data.historyLog.filter((e) => e.date === today && e.status === "COMPLETED" && e.taskName && taskNames.has(e.taskName));

  const later = (id: string) => {
    setLeaving(id);
    setTimeout(() => {
      props.onDefer(id);
      setLeaving(null);
    }, 200);
  };

  return (
    <>
      <div
        className="space-y-14 animate-fade-up transition-[opacity,filter] duration-500"
        style={{ opacity: resolved ? 0.35 : 1, filter: resolved ? "blur(1px)" : "none" }}
      >
        <div>
          <button onClick={props.onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Tillbaka
          </button>
          <p className={label + " mt-10"}>Ambitionsöversikt</p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Du gör framsteg i din egen takt. Varje litet steg för dig närmare din ambition – i din egen rytm och på dina
            egna villkor.
          </p>
        </div>

        <section className="rounded-2xl border bg-card p-8 shadow-soft sm:p-10">
          {editing ? (
            <div className="space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border bg-background px-4 py-3 text-xl outline-none focus:ring-2 focus:ring-ring" />
              <label className="block text-sm text-muted-foreground">
                Måldatum
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-2 block rounded-lg border bg-background px-4 py-2.5 text-foreground" />
              </label>
              <div className="flex items-center gap-4 pt-2">
                <button className={btn} onClick={() => { props.onEdit({ title: title.trim() || p.title, deadline: deadline || null }); setEditing(false); }}>Spara</button>
                <button className="text-sm hover:underline" onClick={() => setEditing(false)}>Avbryt</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-3xl">{p.title}</h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {p.deadline ? `Måldatum: ${new Date(p.deadline + "T12:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}` : "Inget måldatum"}
                    <span className="mx-2">|</span>Aktiv fas: Fas {ai + 1} ({PHASE_NAMES[ai]})
                  </p>
                </div>
                <button onClick={() => { setTitle(p.title); setDeadline(p.deadline ?? ""); setEditing(true); }} className={ghost + " inline-flex shrink-0 items-center gap-1.5"}>
                  <Pencil size={13} /> Redigera
                </button>
              </div>
              <div className="mt-10 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%`, transitionTimingFunction: ease }} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{progress} % åstadkommit</p>
            </>
          )}
          <div className="mt-10 flex flex-wrap items-center">
            <button className={btn} disabled={!steps[0]} onClick={() => steps[0] && props.onFocus(steps[0].id)}>Se nästa steg</button>
            <span onClick={() => setResolved(true)} className="ml-4 cursor-pointer font-medium text-foreground hover:underline">Avsluta jag är nöjd</span>
          </div>
        </section>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border bg-card p-8">
            <h2 className={label}>Nästa steg</h2>
            <p className="mt-1 text-xs text-muted-foreground">Max 2 mikrosteg, under 5 min</p>
            <div className="mt-6 space-y-4">
              {steps.length === 0 && (
                <p className="text-muted-foreground">{progress === 100 ? "Hela planen är genomförd." : "Inget mer för idag. Vila är också framsteg."}</p>
              )}
              {steps.map((t, i) => (
                <div key={t.id} className={`rounded-xl border bg-background p-5 ${i === 0 ? "border-accent" : ""}`}
                  style={{ transition: `transform 200ms ${ease}, opacity 200ms ${ease}`, transform: leaving === t.id ? "translateY(-12px)" : "none", opacity: leaving === t.id ? 0 : 1 }}>
                  <p className="font-medium leading-snug">{t.title}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock size={11} /> &lt; 5 min · Fas {ai + 1}</p>
                  <div className="mt-5 flex flex-col items-start gap-2">
                    <button className={btn} onClick={() => props.onFocus(t.id)}>Jag vill ta ett mikrosteg!</button>
                    <button className={ghost} onClick={() => later(t.id)}>Börja senare (skuldfri förskjutning)</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <Notes data={data} project={p} onAdd={props.onAddNote} onRemove={props.onRemoveNote} />
        </div>

        <section className="rounded-2xl border bg-card p-8">
          <h2 className={label}>Hela planen (4 faser)</h2>
          <div className="mt-6 space-y-6">
            {p.phases.map((ph, i) => {
              const v = pct(ph);
              const status = v === 100 ? "Slutförd" : i === ai ? "Aktiv" : "Planerad";
              return (
                <div key={ph.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={i === ai ? "font-medium" : ""}>{phaseName(ph, i)}</span>
                    <span className={`shrink-0 rounded-md border px-2.5 py-0.5 text-xs ${i === ai ? "border-accent bg-accent/40" : "text-muted-foreground"}`}>{status} {v}%</span>
                  </div>
                  {(v === 100 || i === ai) && (
                    <ul className="mt-3 grid gap-2 pl-4 text-sm text-muted-foreground sm:grid-cols-2">
                      {ph.tasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-2">
                          <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${t.done ? "border-sand-deep" : ""}`}>
                            {t.done && <Check size={10} className="text-sand-deep" />}
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

        <HistoryCard data={data} today={today} taskNames={taskNames} />
      </div>

      {resolved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-6 backdrop-blur-sm">
          <div className="animate-fade-up w-full max-w-lg rounded-2xl border bg-card p-10 shadow-soft">
            <p className="text-xs font-medium tracking-[0.2em] text-sand-deep">LOOPEN ÄR STÄNGD</p>
            <p className="mt-4 text-lg leading-relaxed">Bra jobbat för idag. Du har flyttat din ambition framåt och kan stänga skärmen med fullständigt gott samvete.</p>
            <hr className="my-8" />
            <p className={label}>Vad du åstadkommit idag:</p>
            {wins.length ? (
              <ul className="mt-4 space-y-2">{wins.map((w, i) => <li key={i} className="flex items-center gap-2"><Check size={15} className="text-sand-deep" /> {w.taskName}</li>)}</ul>
            ) : <p className="mt-4 text-muted-foreground">Du gav dig själv utrymme idag. Det räknas också.</p>}
            <p className={label + " mt-8"}>Total framdrift:</p>
            <p className="mt-3">{progress} % av hela planen är nu genomförd.</p>
            <hr className="my-8" />
            <button className={btn} onClick={() => setResolved(false)}>Tillbaka till översikten</button>
          </div>
        </div>
      )}
    </>
  );
}

function Notes({ data, project, onAdd, onRemove }: { data: AppData; project: Project; onAdd: (t: string) => void; onRemove: (id: string) => void }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const notes = data.scratchpadBank.filter((n) => n.project === project.title);
  return (
    <section className="rounded-2xl border bg-card p-8">
      <h2 className={label}>Mina anteckningar och idéarkiv</h2>
      <p className="mt-1 text-xs text-muted-foreground">Samlad yta för kontext och tankar</p>
      <ul className="mt-6 space-y-3 text-sm">
        {notes.length === 0 && !adding && <li className="text-muted-foreground">Här samlas dina tankar, länkar och insikter.</li>}
        {notes.map((n) => (
          <li key={n.id} className="group flex gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sand-deep" />
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap break-words">
                {/^https?:\/\//.test(n.text) ? <a href={n.text} target="_blank" rel="noreferrer" className="underline">{n.text}</a> : n.text}
              </p>
              <button className="text-xs text-muted-foreground opacity-0 transition-opacity hover:underline group-hover:opacity-100" onClick={() => onRemove(n.id)}>Ta bort</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: adding ? "1fr" : "0fr", transitionTimingFunction: ease }}>
        <div className="overflow-hidden">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="En tanke, en länk, en insikt..."
            className="mt-4 w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div className="mt-3 flex items-center gap-4">
            <button disabled={!text.trim()} className={btn + " text-sm"} onClick={() => { onAdd(text.trim()); setText(""); setAdding(false); }}>Spara</button>
            <button className="text-sm hover:underline" onClick={() => setAdding(false)}>Avbryt</button>
          </div>
        </div>
      </div>
      {!adding && (
        <button onClick={() => setAdding(true)} className={ghost + " mt-6 inline-flex items-center gap-1.5"}>
          <Plus size={14} /> Lägg till ny anteckning/länk
        </button>
      )}
    </section>
  );
}

function HistoryCard({ data, today, taskNames }: { data: AppData; today: string; taskNames: Set<string> }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, -i)), [today]);
  const dayLabel = (d: string) =>
    d === today ? "Idag" : d === addDays(today, -1) ? "Igår" : new Date(d + "T12:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  return (
    <section className="rounded-2xl border bg-card p-8">
      <h2 className={label}>Senast gjort (skamfri historik)</h2>
      <ul className="mt-6 space-y-3 text-sm">
        {days.flatMap((d) => {
          const items = data.historyLog.filter((e) => e.date === d && e.status === "COMPLETED" && e.taskName && taskNames.has(e.taskName));
          if (items.length)
            return items.map((x, i) => (
              <li key={d + i} className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sand-deep" />
                <span><span className="font-medium">{dayLabel(d)}:</span> Slutförde mikrosteget "{x.taskName}"</span>
              </li>
            ));
          if (d === today) return [];
          return [
            <li key={d} className="flex gap-3 text-muted-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border" />
              <span><span className="font-medium text-foreground">{dayLabel(d)}:</span> ANDRA PRIORITERINGAR (Planerad återhämtning – bevarade din kognitiva energi)</span>
            </li>,
          ];
        })}
      </ul>
    </section>
  );
}
