import crypto from "crypto";
import { json, env, setCookie } from "./_utils.js";

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const clientId = env("ETSY_API_KEYSTRING");
    const redirectUri = env("ETSY_REDIRECT_URI");
    const scopes = process.env.ETSY_SCOPES || "transactions_r";

    // PKCE
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );

    const state = base64url(crypto.randomBytes(16));

    // Save verifier/state in cookie
    setCookie(
      res,
      "etsy_oauth",
      JSON.stringify({ codeVerifier, state }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 600,
      }
    );

    const url =
      "https://www.etsy.com/oauth/connect" +
      "?response_type=code" +
      "&client_id=" +
      encodeURIComponent(clientId) +
      "&redirect_uri=" +
      encodeURIComponent(redirectUri) +
      "&scope=" +
      encodeURIComponent(scopes) +
      "&state=" +
      encodeURIComponent(state) +
      "&code_challenge=" +
      encodeURIComponent(codeChallenge) +
      "&code_challenge_method=S256";

    res.statusCode = 302;
    res.setHeader("Location", url);
    res.end();
  } catch (err) {
    console.error("etsy-auth error:", err);
    return json(res, 500, { error: err.message });
  }
}
