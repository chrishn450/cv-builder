// api/import-cv.js (FULL) - Vercel Serverless Function (ESM)
import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";

// Required for file uploads on Vercel/Next API routes
export const config = { api: { bodyParser: false } };

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

function validatePatches(patches) {
  if (!Array.isArray(patches)) return [];
  return patches.filter(p => {
    if (!p || p.op !== "set") return false;
    if (typeof p.path !== "string") return false;
    if (!ALLOWED_PATHS.includes(p.path)) return false;
    return true;
  });
}

async function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: 8 * 1024 * 1024, // 8MB
    keepExtensions: true,
  });

  return await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

async function extractTextFromFile(file) {
  const filepath = file?.filepath;
  const mimetype = file?.mimetype || "";
  const original = (file?.originalFilename || "").toLowerCase();

  if (!filepath) throw new Error("Missing uploaded file");

  const buf = await fs.readFile(filepath);

  // PDF
  if (mimetype.includes("pdf") || original.endsWith(".pdf")) {
    const out = await pdf(buf);
    return String(out?.text || "").trim();
  }

  // DOCX
  if (
    mimetype.includes("officedocument.wordprocessingml.document") ||
    original.endsWith(".docx")
  ) {
    const out = await mammoth.extractRawText({ buffer: buf });
    return String(out?.value || "").trim();
  }

  // DOC (old Word)
  if (original.endsWith(".doc") || mimetype.includes("msword")) {
    throw new Error("DOC støttes ikke enda. Last opp DOCX eller PDF.");
  }

  throw new Error("Ukjent filtype. Last opp PDF eller DOCX.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { files, fields } = await parseForm(req);
    const file = files?.file;

    const language = String(fields?.language || "no");
    const snapshotRaw = typeof fields?.snapshot === "string" ? fields.snapshot : "";
    const snapshot = snapshotRaw ? (safeJsonParse(snapshotRaw) || {}) : {};

    const text = await extractTextFromFile(file);

    if (!text || text.length < 80) {
      return res.status(400).json({ error: "Fant for lite tekst i dokumentet." });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `
Du er en CV-importer inne i en CV-builder.

Du MÅ returnere KUN gyldig JSON (ingen markdown).

Returner EXACT:
{
  "summary": string,
  "patches": [ { "op":"set", "path":"<allowed>", "value": <any> } ],
  "missingSuggestions": [ string, ... ]
}

Allowed paths:
${ALLOWED_PATHS.join(", ")}

Regler:
- Svar på språket i "language".
- Ekstraher info fra CV-teksten og map til feltene.
- Skru på seksjoner (sections.<x>.enabled=true) når CV-en inneholder relevant innhold.
- Bruk custom1/custom2 hvis nødvendig (hvis mer enn 2 custom tema: prioriter de viktigste).
- Ikke overfyll: prioriter de mest relevante jobbene/ punktene. Kutt til et kort, template-vennlig nivå.
- Ikke skriv mer enn ca 2–4 jobber, og maks ca 4–6 bullet points per jobb.
- missingSuggestions: konkrete forslag til hva brukeren kan legge til (2–6 punkter).
- Bruk snapshot som “hva som allerede finnes”.
`.trim();

    const userPayload = {
      language,
      snapshot,
      cv_text: text.slice(0, 20000),
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) }
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);

    if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.patches)) {
      return res.status(200).json({
        summary: language === "no"
          ? "Jeg klarte ikke å importere CV-en i riktig format. Prøv å laste opp en annen fil (helst DOCX)."
          : "I couldn't import in the correct format. Please try a different file.",
        patches: [],
        missingSuggestions: [],
      });
    }

    const safePatches = validatePatches(parsed.patches);
    const missingSuggestions = Array.isArray(parsed.missingSuggestions)
      ? parsed.missingSuggestions.map(x => String(x).slice(0, 220)).slice(0, 8)
      : [];

    return res.status(200).json({
      summary: parsed.summary,
      patches: safePatches,
      missingSuggestions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
