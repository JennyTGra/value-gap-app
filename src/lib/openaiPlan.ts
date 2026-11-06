import { type Phase, uid } from "@/lib/valuegap";

export const OPENAI_KEY_STORAGE = "user_openai_api_key";

export const getOpenAIKey = () => (typeof window === "undefined" ? "" : localStorage.getItem(OPENAI_KEY_STORAGE) ?? "");
export const setOpenAIKey = (k: string) => localStorage.setItem(OPENAI_KEY_STORAGE, k.trim());
export const clearOpenAIKey = () => localStorage.removeItem(OPENAI_KEY_STORAGE);

export const SYSTEM_PROMPT = `Du är ett kognitivt avlastande operativsystem. Din uppgift är att ta användarens råa hjärndump och strukturera den i en realistisk, skamfri 4-fasplan. Regler: 1. Skapa exakt 4 kronologiska faser. 2. Varje fas SKA innehålla fler än 2 och mindre än 8 steg (dvs 3–7 steg per fas). 3. Det allra första steget i Fas 1 MÅSTE vara ett superlätt mikrosteg under 5 minuter för att sänka starttröskeln när man öppnar datorn (t.ex. 'Skapa ett tomt dokument och döp det', 'Skriv ner en enda rubrik'). Övriga steg får ta längre tid men ska vara konkreta och avgränsade. 4. Skriv raka, konkreta och tydliga handlingar. 5. Tonen ska vara lugn, saklig och neutral – inga hurtiga hejarop eller krav på perfektion. 6. Svara ENBART med giltig JSON.
Format: {"title": string, "phases": [{"title": string, "steps": [{"title": string, "minutes": number}]}]}`;

export class PlanError extends Error {
  constructor(public kind: "missing_key" | "invalid_key" | "network" | "bad_response", msg: string) { super(msg); }
}

/** Parses the model's JSON into exactly 4 phases. Throws PlanError on bad shape. */
export function parsePlanJson(raw: string): { title?: string; phases: Phase[] } {
  let j: unknown;
  try { j = JSON.parse(raw); } catch { throw new PlanError("bad_response", "Svaret var inte giltig JSON."); }
  const o = j as { title?: unknown; phases?: unknown };
  if (!Array.isArray(o.phases) || o.phases.length < 4) throw new PlanError("bad_response", "Svaret saknade fyra faser.");
  const phases: Phase[] = o.phases.slice(0, 4).map((p: any, i: number) => {
    const steps = Array.isArray(p?.steps) ? p.steps : Array.isArray(p?.tasks) ? p.tasks : [];
    const tasks = steps
      .map((s: any) => (typeof s === "string" ? { title: s, minutes: 5 } : s))
      .filter((s: any) => s && typeof s.title === "string" && s.title.trim())
      .slice(0, 7)
      .map((s: any) => ({ id: uid(), title: String(s.title).trim(), minutes: Number(s.minutes) > 0 ? Math.round(Number(s.minutes)) : 5 }));
    return { id: uid(), title: `Fas ${i + 1} · ${String(p?.title ?? "").replace(/^Fas\s*\d+\s*[:·-]?\s*/i, "") || "Fas"}`, tasks };
  });
  if (phases.some((p) => p.tasks.length === 0)) throw new PlanError("bad_response", "En fas saknade steg.");
  const first = phases[0]!.tasks[0]!;
  first.minutes = Math.min(first.minutes, 5);
  return { title: typeof o.title === "string" ? o.title : undefined, phases };
}

export async function generatePlanWithOpenAI(userText: string): Promise<{ title?: string; phases: Phase[] }> {
  const key = getOpenAIKey();
  if (!key) throw new PlanError("missing_key", "Ingen API-nyckel är sparad.");
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini", temperature: 0.4, response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userText }],
      }),
    });
  } catch { throw new PlanError("network", "Kunde inte nå OpenAI. Kontrollera internetanslutningen."); }
  if (res.status === 401) throw new PlanError("invalid_key", "API-nyckeln är ogiltig.");
  if (!res.ok) throw new PlanError("network", `OpenAI svarade med fel (${res.status}).`);
  const body = await res.json();
  return parsePlanJson(body?.choices?.[0]?.message?.content ?? "");
}
