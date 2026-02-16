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
    return true;
  });
}

function validateSuggestions(suggestions) {
  if (!Array.isArray(suggestions)) return [];
  return suggestions.map(s => {
    const title = typeof s?.title === "string" ? s.title.slice(0, 80) : "Suggestion";
    const message = typeof s?.message === "string" ? s.message : "";
    const changes = validateChanges(s?.changes);
    return { title, message, changes };
  }).filter(s => s.message || (s.changes && s.changes.length));
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

    const system = `
You are an AI CV assistant embedded in a CV builder.

You MUST output ONLY valid JSON (no markdown, no backticks).

Return exactly one of these shapes:

A) If you have suggestions:
{
  "suggestions": [
    { "title": string, "message": string, "changes": [ { "op":"set","path":"...","value": any } ] }
  ]
}

B) If you truly need clarification:
{
  "suggestions": [
    { "title": string, "message": string, "changes": [] }
  ]
}

Rules:
- Always respond in the provided language code.
- Be direct and solution-oriented. Avoid unnecessary questions.
- Only ask 1 short clarifying question if absolutely required.
- If user asks for improvements, rewrite the relevant field(s) completely with clean, final text.
- Each suggestion should be independently acceptable (so user can pick).
- Allowed patch paths:
${ALLOWED_PATHS.join(", ")}
`.trim();

    const context = {
      language,
      user_message: message,
      snapshot,
      instruction: "Use snapshot to avoid repeating or asking for content already present."
    };

    const messages = [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(context) },
      ...history,
      { role: "user", content: message }
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);

    if (!parsed) {
      return res.status(200).json({
        suggestions: [{
          title: language === "no" ? "Feil" : "Error",
          message: language === "no"
            ? "Jeg fikk ikke laget forslag i riktig format. Prøv igjen med en tydelig forespørsel."
            : "I couldn't produce suggestions in the correct format. Please try again with a clearer request.",
          changes: []
        }]
      });
    }

    const suggestions = validateSuggestions(parsed.suggestions);
    if (!suggestions.length) {
      return res.status(200).json({
        suggestions: [{
          title: language === "no" ? "Spørsmål" : "Question",
          message: language === "no"
            ? "Hva vil du at jeg skal forbedre (f.eks. 'summary', 'experience bullets', eller 'skills')?"
            : "What would you like me to improve (e.g. summary, experience bullets, or skills)?",
          changes: []
        }]
      });
    }

    return res.status(200).json({ suggestions });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
