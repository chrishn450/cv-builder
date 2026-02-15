import { json, setCookie } from "./_utils.js";

export default async function handler(req, res){
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  setCookie(res, "cv_session", "", { maxAge: 0, path: "/" });
  return json(res, 200, { ok: true });
}
