// api/ai.js (FULL) - Vercel Serverless Function (ESM)
import OpenAI from "openai";

const ALLOWED_PATHS = [
  "data.name","data.title","data.email","data.phone","data.location","data.linkedin",
  "data.summary","data.education","data.licenses","data.clinicalSkills","data.coreCompetencies",
  "data.languages","data.experience","data.achievements","data.volunteer","data.custom1","data.custom2",

  // structured arrays
  "data.educationBlocks","data.licenseBlocks","data.experienceJobs","data.volunteerBlocks",

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
        // value can be anything (string/object/array) for allowed paths
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

Global rules:
- Always respond in the user's UI language (language code provided).
- Be proactive and concrete. Avoid being overly questioning.
- Ask at most ONE clarifying question ONLY if absolutely needed; if so, return suggestions: [].
- Suggestions must be independent and selectable (one accept per suggestion).
- Each suggestion should contain patches for exactly one theme (e.g., Summary, Skills, Experience).
- When editing text fields: provide improved text in patches (e.g., data.summary).
- If user asks for bullets: keep bullets one per line for plain text fields; for structured jobs use bullets: string[].
- Use snapshot to avoid repeating questions.

IMPORT_OLD_CV mode (high priority):
If the user message contains "IMPORT_OLD_CV":
- The message includes extracted text from an old CV (may be messy).
- Goal: Build a strong, modern CV using ONLY information that is present in the CV text.
- You MAY rewrite and improve phrasing, and you MAY restructure/move content between sections.
- You MUST NOT invent: employers, job titles, degrees, schools, locations, dates, certifications, or contact details that aren't in the text.
- If something is unclear, omit it rather than guessing.

Output requirements for IMPORT_OLD_CV:
- Produce ONE main suggestion only (suggestions array length = 1).
- That suggestion should include as many patches as needed to fully populate the template.
- Populate structured arrays (replace existing if present):
  - data.educationBlocks: [{degree, school, date, honors}]
  - data.licenseBlocks: [{title, detail}]
  - data.experienceJobs: [{title, meta, bullets: string[]}]
  - data.volunteerBlocks: [{title, date, sub, bullets: string[]}]
- For experience bullets:
  - 3–6 bullets per job when possible.
  - Start with a strong verb.
  - Prefer outcome/impact wording when the text supports it.
  - Avoid duplicates and filler.
- Set data.summary to a polished 3–5 line professional summary (no fabrication).
- Enable/disable sections based on whether content exists after restructuring.
- Adjust contact show_* toggles based on whether information exists.
- If the CV language is clearly Norwegian, keep content Norwegian and prefer Norwegian section titles (set sections.*.title accordingly).
- If the CV language is clearly English, keep content English and prefer English section titles.
`.trim();

    // We pass the context as JSON once, and do NOT repeat message twice.
    const context = {
      language,
      snapshot,
      // The user_message is the raw instruction including IMPORT_OLD_CV + CV text.
      user_message: message
    };

    const messages = [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(context) },
      ...history
    ];

    const completion = await client.chat.completions.create({
      // Better quality for import + bullets:
      model: process.env.OPENAI_MODEL || "gpt-4o",
      temperature: 0.2,
      messages
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);

    if (!parsed || typeof parsed.message !== "string" || !Array.isArray(parsed.suggestions)) {
      return res.status(200).json({
        message: language === "no"
          ? "Jeg fikk ikke laget forslag i riktig format. Prøv igjen."
          : (language === "de"
              ? "Ich konnte die Vorschläge nicht im richtigen Format erzeugen. Bitte erneut versuchen."
              : "I couldn't produce suggestions in the correct format. Please try again."),
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
