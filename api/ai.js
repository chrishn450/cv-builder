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

  "sections.contact.show_title",
  "sections.contact.show_email",
  "sections.contact.show_phone",
  "sections.contact.show_location",
  "sections.contact.show_linkedin",
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

function validateSuggestions(suggestions) {
  if (!Array.isArray(suggestions)) return [];
  return suggestions
    .map((s) => {
      const topic = typeof s?.topic === "string" ? s.topic.slice(0, 80) : "Suggestion";
      const preview = typeof s?.preview === "string" ? s.preview.slice(0, 2000) : "";
      const patches = Array.isArray(s?.patches) ? s.patches : [];

      const safePatches = patches.filter(p => {
        if (!p || p.op !== "set") return false;
        if (typeof p.path !== "string") return false;
        if (!ALLOWED_PATHS.includes(p.path)) return false;
        return true;
      });

      return { topic, preview, patches: safePatches };
    })
    .filter(s => s.patches.length > 0 || s.preview.length > 0);
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
You are an AI coach inside a CV builder.

You MUST output ONLY valid JSON (no markdown, no backticks).

Return EXACTLY:
{
  "message": string,
  "suggestions": [
    { "topic": string, "preview": string, "patches": [ { "op":"set", "path":"<allowed>", "value": <any> } ] }
  ]
}

Allowed paths:
${ALLOWED_PATHS.join(", ")}

Rules:
- Always respond in the user's UI language (language code provided).
- Be proactive and concrete. Avoid being overly questioning.
- Ask at most ONE clarifying question ONLY if absolutely needed; if so, return suggestions: [].
- Suggestions must be independent and selectable (one accept per suggestion).
- Each suggestion should contain patches for exactly one "theme" (e.g., Summary, Skills, Experience bullets).
- When editing text fields: provide improved text in patches (e.g., data.summary).
- If user asks for new bullets: update the relevant field. Keep bullets one per line.
- Use snapshot to avoid repeating questions.
`.trim();

    const context = {
      language,
      user_message: message,
      snapshot,
      notes: "Use snapshot + history to avoid repeating questions."
    };

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

    if (!parsed || typeof parsed.message !== "string" || !Array.isArray(parsed.suggestions)) {
      return res.status(200).json({
        message: language === "no"
          ? "Jeg fikk ikke laget forslag i riktig format. Prøv igjen med en tydelig forespørsel (f.eks. «Forbedre oppsummeringen min»)."
          : (language === "de"
              ? "Ich konnte die Vorschläge nicht im richtigen Format erzeugen. Bitte erneut mit einer klaren Anfrage versuchen."
              : "I couldn't produce suggestions in the correct format. Please try again with a clearer request."),
        suggestions: []
      });
    }

    const safeSuggestions = validateSuggestions(parsed.suggestions);

    return res.status(200).json({
      message: parsed.message,
      suggestions: safeSuggestions
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
