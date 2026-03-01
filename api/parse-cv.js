// api/parse-cv.js - Vercel Serverless Function (ESM)
import formidable from "formidable";
import fs from "fs";
import pdf from "pdf-parse";
import { json } from "./_utils.js";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const form = formidable({
      multiples: false,
      maxFileSize: 15 * 1024 * 1024, // 15MB
      keepExtensions: true,
    });

    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const f = files?.file;
    const file = Array.isArray(f) ? f[0] : f;

    if (!file) return json(res, 400, { error: "Missing file" });

    const mimetype = String(file.mimetype || "");
    const originalFilename = String(file.originalFilename || "");
    const filepath = file.filepath;

    // Only PDF for now
    const isPdf = mimetype.includes("pdf") || originalFilename.toLowerCase().endsWith(".pdf");
    if (!isPdf) return json(res, 400, { error: "Only PDF is supported" });

    const buffer = fs.readFileSync(filepath);
    const parsed = await pdf(buffer);

    const text = String(parsed?.text || "").trim();

    return json(res, 200, {
      ok: true,
      text,
      pages: parsed?.numpages ?? null,
      info: parsed?.info ?? null,
      warning: text ? null : "No text extracted",
    });
  } catch (e) {
    console.error("parse-cv error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
