import { json, env, parseCookies, setCookie } from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const url = new URL(req.url, `https://${req.headers.host}`);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return json(res, 400, { error: "Missing code or state" });
    }

    const cookies = parseCookies(req);

    if (!cookies.etsy_oauth) {
      return json(res, 400, { error: "Missing oauth cookie" });
    }

    let saved;

    try {
      saved = JSON.parse(cookies.etsy_oauth);
    } catch {
      return json(res, 400, { error: "Invalid oauth cookie" });
    }

    if (saved.state !== state) {
      return json(res, 400, { error: "State mismatch" });
    }

    const clientId = env("ETSY_API_KEYSTRING");
    const redirectUri = env("ETSY_REDIRECT_URI");

    // Exchange code for token
    const tokenRes = await fetch(
      "https://api.etsy.com/v3/public/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          redirect_uri: redirectUri,
          code,
          code_verifier: saved.codeVerifier,
        }),
      }
    );

    const text = await tokenRes.text();

    let token;

    try {
      token = JSON.parse(text);
    } catch {
      token = null;
    }

    if (!tokenRes.ok) {
      return json(res, 500, {
        error: token?.error || text,
      });
    }

    // Clear cookie
    setCookie(res, "etsy_oauth", "", {
      maxAge: 0,
      path: "/",
    });

    // IMPORTANT: copy access_token from here into Vercel later
    return json(res, 200, {
      ok: true,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_in: token.expires_in,
      note: "Copy access_token into Vercel as ETSY_ACCESS_TOKEN",
    });
  } catch (err) {
    console.error("etsy-callback error:", err);
    return json(res, 500, { error: err.message });
  }
}
