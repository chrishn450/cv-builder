// api/ai.js (FULL) - Vercel Serverless Function (ESM)
import OpenAI from "openai";

const ALLOWED_PATHS = [
  "data.name","data.title","data.email","data.phone","data.location","data.linkedin",
  "data.summary","data.education","data.licenses","data.clinicalSkills","data.coreCompetencies",
  "data.languages","data.experience","data.achievements","data.volunteer","data.custom1","data.custom2",

  "sections.summary.enabled","sections.summary.title",
  "sections.education.enabled","sections.education.title",
  "sections.licenses.enabled","sections.licenses.title",
  "sections.clinicalSkills.enabled","sections.clinicalSkills.title",
  "sections.coreCompetencies.enabled","sections.coreCompetencies.title",
  "sections.languages.enabled","sections.languages.title",
  "sections.experience.enabled","sections.experience.title",
  "sections.achievements.enabled","sections.achievements.title",
  "sections.volunteer.enabled","sections.volunteer.title",
  "sections.custom1.enabled","sections.custom1.title",
  "sections.custom2.enabled","sections.custom2.title",
];

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function clampHistory(history) {
  // keep last ~20 turns to control tokens
  if (!Array.isArray(history)) return [];
  const cleaned = history
    .filter(x => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
    .map(x => ({ role: x.role, content: x.content.slice(0, 2000) }));
  return cleaned.slice(-20);
}

function validateChanges(changes) {
  if (!Array.isArray(changes)) return [];
  return changes.filter(c => {
    if (!c || c.op !== "set") return false;
    if (typeof c.path !== "string") return false;
    if (!ALLOWED_PATHS.includes(c.path)) return false;
    // allow any JSON-serializable value
    return true;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const message = String(body.message || "").trim();
    const language = String(body.language || "en");
    const snapshot = body.snapshot || {};
    const history = clampHistory(body.history);

    if (!message) return res.status(400).json({ error: "Missing message" });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // System rules: always JSON with message + changes
    const system = `
You are an AI coach inside a CV builder.
You MUST output ONLY valid JSON (no markdown, no backticks, no extra keys).

Return:
{
  "message": string,
  "changes": array
}

Changes are patches the user can accept/reject. Only use:
{ "op": "set", "path": "<allowed path>", "value": <any> }

Allowed paths are:
${ALLOWED_PATHS.join(", ")}

Behavior:
- You have access to the current CV snapshot and the chat history.
- Always respond in the user's language (language code provided).
- If user requests a concrete edit (e.g., "fill in my name Katinka"), create a patch:
  { op:"set", path:"data.name", value:"Katinka" }
- If user asks for improvement (summary, bullets, ATS, tone), propose patches to relevant fields.
- If the user is vague, ask ONE short clarifying question in "message" and return changes: [].
- Never ask the user to repeat something that is already in chat history or in the snapshot.
`.trim();

    const context = {
      language,
      user_message: message,
      snapshot,      // includes data + sections from frontend
      notes: "Use snapshot + history to avoid repeating questions."
    };

    // We feed chat history to the model too (so it remembers)
    const messages = [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(context) },
      ...history,
      { role: "user", content: message }
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);

    if (!parsed || typeof parsed.message !== "string" || !Array.isArray(parsed.changes)) {
      return res.status(200).json({
        message: language === "no"
          ? "Jeg fikk ikke laget forslag i riktig format. Prøv igjen med en tydelig forespørsel (f.eks. «Sett navnet mitt til Katinka»)."
          : "I couldn't produce suggestions in the correct format. Please try again with a clearer request (e.g. 'Set my name to Katinka').",
        changes: []
      });
    }

    const safeChanges = validateChanges(parsed.changes);

    return res.status(200).json({
      message: parsed.message,
      changes: safeChanges
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
