import { useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import { clearOpenAIKey, getOpenAIKey, setOpenAIKey } from "@/lib/openaiPlan";

export default function AiKeySettings() {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (open) { const k = getOpenAIKey(); setSaved(!!k); setVal(k); setMsg(""); } }, [open]);

  return (
    <>
      <button aria-label="Utvecklarinställningar" onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full p-2 text-muted-foreground/50 transition hover:bg-secondary hover:text-foreground">
        <Settings size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/15 p-4 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Utvecklarinställningar / AI-nyckel" className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Utvecklarinställningar / AI-nyckel</h2>
              <button aria-label="Stäng" onClick={() => setOpen(false)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            <label className="mt-5 block text-sm font-medium" htmlFor="oai">OpenAI API-nyckel</label>
            <input id="oai" type="password" autoComplete="off" value={val} onChange={(e) => setVal(e.target.value)} placeholder="sk-..."
              className="mt-2 w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <p className="mt-2 text-xs text-muted-foreground">Nyckeln sparas bara i den här webbläsaren och skickas endast direkt till OpenAI.</p>
            <p className="mt-1 text-xs text-muted-foreground">Status: {saved ? "Nyckel sparad" : "Ingen nyckel sparad"}{msg && ` · ${msg}`}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-full border px-4 py-2 text-sm hover:bg-secondary" onClick={() => { clearOpenAIKey(); setVal(""); setSaved(false); setMsg("Rensad"); }}>Rensa</button>
              <button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40" disabled={!val.trim()}
                onClick={() => { setOpenAIKey(val); setSaved(true); setMsg("Sparad"); }}>Spara</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
