import { useEffect, useRef, useState } from "react";
import { Check, Pause, PencilLine, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/valuegap";

export default function FocusSession({ task, projectTitle, scratch, setScratch, onSave, onComplete, onBack, onPark }: {
  task: Task; projectTitle: string; scratch: string; setScratch: (s: string) => void;
  onSave: () => void; onComplete: () => void; onBack: () => void; onPark: (note: string) => void;
}) {
  const [length, setLength] = useState(5);
  const [left, setLeft] = useState(300);
  const end = useRef(Date.now() + 300000);
  const [parking, setParking] = useState(false);
  const [note, setNote] = useState(task.resumeNote ?? "");
  const [saved, setSaved] = useState(false);
  const restart = (minutes: number) => { setLength(minutes); end.current = Date.now() + minutes * 60000; setLeft(minutes * 60); };
  useEffect(() => {
    const i = setInterval(() => setLeft(Math.max(0, Math.ceil((end.current - Date.now()) / 1000))), 250);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (left !== 0) return;
    // A small audible cue; browsers may suppress audio until user interaction.
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain); gain.connect(audio.destination); gain.gain.value = 0.08;
      oscillator.frequency.value = 660; oscillator.start(); oscillator.stop(audio.currentTime + 0.3);
      oscillator.onended = () => { void audio.close(); };
    } catch { /* The visible timer choices remain available without sound. */ }
  }, [left === 0]);
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(false), 2200); return () => clearTimeout(t); }, [saved]);
  return (
    <section className="animate-fade-up mx-auto max-w-2xl">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">{projectTitle}</p>
      <h1 className="mt-6 text-center text-3xl leading-tight sm:text-4xl">{task.title}</h1>
      <div className="mt-10 flex flex-col items-center gap-3">
        <div className="flex items-center gap-5">
          <span role="timer" aria-label="Återstående tid" className="w-24 text-center text-2xl font-light tabular-nums text-muted-foreground">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>
          <Button variant="outline" onClick={() => setParking(true)}><Pause /> Parkera</Button>
        </div>
        <div className="flex gap-1" aria-label="Passlängd">
          {[5, 15, 25, 45].map((m) => <Button key={m} variant={length === m ? "secondary" : "ghost"} size="sm" aria-pressed={length === m} onClick={() => restart(m)}>{m} min</Button>)}
        </div>
      </div>
      {left === 0 && <div role="status" className="mt-8 border-y py-6 text-center">
        <p className="mb-4 font-medium">Fokuspasset är slut. Vad känns rätt nu?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => restart(length)}>Jag är i flow – fortsätt fokuspass</Button>
          <Button variant="outline" onClick={onComplete}>Klar med steget</Button>
        </div>
      </div>}
      <div className="mt-12 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2 border-b px-5 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><PencilLine size={13} /> Tankeskiss</span>
          <div className="flex items-center gap-2">{saved && <span role="status">Sparad i arkivet</span>}<Button variant="ghost" size="sm" disabled={!scratch.trim()} onClick={() => { onSave(); setSaved(true); }}><Save /> Spara</Button></div>
        </div>
        <textarea aria-label="Tankeskiss" value={scratch} onChange={(e) => setScratch(e.target.value)} rows={6} placeholder="Fånga en tanke…" className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed outline-none" />
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onBack}>Tillbaka</Button>
        {left > 0 && <Button onClick={onComplete}><Check /> Slutför steget</Button>}
      </div>
      {parking && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-5 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="park-title" className="w-full max-w-md rounded-lg border bg-card p-6 shadow-soft">
          <h2 id="park-title" className="text-xl">Var var du?</h2>
          <label htmlFor="park-note" className="mt-3 block text-sm text-muted-foreground">En snabb anteckning till nästa gång</label>
          <textarea id="park-note" autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-ring" />
          <div className="mt-5 flex flex-wrap justify-end gap-3"><Button variant="ghost" onClick={() => setParking(false)}>Avbryt</Button><Button onClick={() => onPark(note)}>Spara som påbörjat</Button></div>
        </div>
      </div>}
    </section>
  );
}