# Security Setup Guide — Pujoপথ

This document explains how to properly restrict the Google Maps API keys used in this project to prevent unauthorised usage and billing surprises.

---

## API Keys in This Project

| Environment Variable | Usage | Where It Is Used |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client-side map rendering (Maps JavaScript API) | Browser / Next.js client components |
| `GOOGLE_MAPS_SERVER_API_KEY` | Server-side Directions API calls | Genkit flow (`get-directions-flow.ts`) — never exposed to the browser |

> **Why two keys?**  
> Using separate keys allows you to apply different restrictions to each, following the principle of least privilege.

---

## Step-by-Step: Restricting Keys in Google Cloud Console

### 1. Open Google Cloud Console

Go to [https://console.cloud.google.com/](https://console.cloud.google.com/) and select your project (`pujopath-navigator`).

### 2. Navigate to API & Services → Credentials

- Click the **☰ Navigation Menu** (top-left)
- Go to **APIs & Services** → **Credentials**

---

### Key 1 — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Client-Side)

This key is embedded in public browser code. Restrict it by **HTTP referrer**.

1. Click the pencil ✏️ icon next to this key.
2. Under **Application restrictions**, select **Websites**.
3. Add your allowed referrers:
   - `https://your-production-domain.com/*`
   - `https://*.your-production-domain.com/*`
   - `http://localhost:9002/*` (local dev — remove before production lock-down)
   - `http://192.168.31.210:9002/*` ← **add this for LAN / network port access**
4. Under **API restrictions**, select **Restrict key**, then enable only:
   - **Maps JavaScript API**
   - **Places API** (if used)
5. Click **Save**.

> **Why this error occurs:**  
> `RefererNotAllowedMapError` means the `Referer` HTTP header sent by the browser
> (`http://192.168.31.210:9002/`) is not in the allowlist for the API key in
> Google Cloud Console. The Maps JavaScript API rejects the request outright —
> the fix is entirely server-side (Google's side); no code change resolves it alone.

---

### Fix 2 — Next.js `allowedDevOrigins` (Already Applied)

Next.js 15 introduced an additional same-origin check for dev-server resource
requests (`/_next/*`). Without this, assets fail to load when you access the app
from another device on the LAN.

This has been added to `next.config.ts`:

```ts
allowedDevOrigins: [
  'http://192.168.31.210:9002',
  'http://localhost:9002',
],
```

> **Scope:** This setting is development-only and has zero effect on production builds.
> Your LAN IP (`192.168.31.210`) changes if your router reassigns DHCP — update this
> value if you get a new IP address.

---

### Key 2 — `GOOGLE_MAPS_SERVER_API_KEY` (Server-Side)

This key is used only in the Node.js server environment and is never sent to the browser. Restrict it by **IP address**.

1. Click the pencil ✏️ icon next to this key.
2. Under **Application restrictions**, select **IP addresses**.
3. Add the IP address(es) of your server(s):
   - Your Firebase App Hosting server egress IP(s)
   - Any CI/CD runner IPs if used during builds
4. Under **API restrictions**, select **Restrict key**, then enable only:
   - **Directions API**
5. Click **Save**.

> **Tip:** If you are using Firebase App Hosting and don't have a fixed egress IP, consider using a VPC connector with a static IP or switch to using a service account with Workload Identity instead of an API key for server-to-server calls.

---

## Firestore Security Rules

The `firestore.rules` file in this project enforces the following policy:

- `/pandals/{pandalId}` — **public read**, **no client writes**
- `/Metro/{metroId}` — **public read**, **no client writes**

All write operations to Firestore must be performed via the Firebase Admin SDK (server-side scripts only), never from client-side code.

---

## Environment Variable Checklist

Before deploying to production, verify:

- [ ] `.env.local` is listed in `.gitignore` and is **never committed** to version control.
- [ ] `.env.example` is committed and kept up-to-date with all required key names (no real values).
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has HTTP referrer restrictions applied in Google Cloud Console.
- [ ] `GOOGLE_MAPS_SERVER_API_KEY` has IP address restrictions applied in Google Cloud Console.
- [ ] Both keys have API restrictions set to only the APIs they need.
- [ ] Production hosting environment variables are set via the hosting provider's secret manager (e.g., Firebase App Hosting environment config), not via a committed file.
