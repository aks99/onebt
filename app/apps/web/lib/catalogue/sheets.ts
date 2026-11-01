import { createSign } from "node:crypto";

// Google Sheets reader with a service account (6.2 F1.2.16). Read-only scope. No SDK: a signed JWT exchanged
// for an access token, then the values endpoint. The owner shares the sheet with the service-account email
// shown in Curator Console > Sources.

export interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }

export function loadServiceAccount(): ServiceAccount | null {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw && process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) raw = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString("utf8");
  if (!raw) return null;
  try { const j = JSON.parse(raw); return j.client_email && j.private_key ? j : null; } catch { return null; }
}

function b64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function buildJwt(sa: ServiceAccount, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: sa.token_uri ?? "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256"); signer.update(`${header}.${claims}`);
  const sig = b64url(signer.sign(sa.private_key));
  return `${header}.${claims}.${sig}`;
}

export async function accessToken(sa: ServiceAccount, fetchFn: typeof fetch = fetch) {
  const res = await fetchFn(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: buildJwt(sa) }),
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`);
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

// Returns the raw values of one tab (header row first). An empty or missing tab returns [].
export async function readTab(sheetId: string, tab: string, token: string, fetchFn: typeof fetch = fetch): Promise<string[][]> {
  const range = encodeURIComponent(`'${tab.replace(/'/g, "''")}'`);
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 400) return [];                       // tab does not exist
  if (res.status === 403) throw new Error("The sheet is not shared with the service account.");
  if (res.status === 404) throw new Error("Sheet not found. Check the sheet id.");
  if (!res.ok) throw new Error(`Sheets API error (${res.status})`);
  const j = (await res.json()) as { values?: unknown[][] };
  return (j.values ?? []).map((r) => r.map((v) => (v === null || v === undefined ? "" : String(v))));
}

// Extracts a sheet id from a pasted URL or returns the id as given.
export function sheetIdFrom(input: string) {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input.trim();
}
