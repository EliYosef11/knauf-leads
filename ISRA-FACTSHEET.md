# Knauf Israel – Conference Leads System
## Security & Risk Assessment Fact Sheet (for ISRA / RITM0913163)

Prepared for Knauf IT Security. All statements below describe the system as deployed on 2026-10-27.

---

### 1. What the system is

| Item | Detail |
|---|---|
| Name | Knauf Israel Conference Leads ("Knauf Leads") |
| URL | https://knauf-il-leads.com (also https://www.knauf-il-leads.com) |
| Purpose | Capture sales leads at trade conferences and events attended by Knauf Israel, assign each lead to a Knauf Israel sales representative, and notify that representative by email. It is the first stage of the lead process, before the lead is entered into the CRM; each record tracks whether CRM entry is done. |
| Business owner | Eli Yosef (eli.yosef@knauf.com), Knauf Israel |
| Second administrator | Keren Shay, Knauf Israel |
| Users | Knauf Israel sales representatives only. Every screen, including the lead form, requires sign-in; there is no public access. |
| Web category (per Zscaler) | Professional Services |
| Requested action | Allow access to the domain `knauf-il-leads.com` from Knauf managed devices/network. |

### 2. Domain

| Item | Detail |
|---|---|
| Domain | knauf-il-leads.com |
| Registrar | IONOS |
| Registered | May 2026, by Eli Yosef on behalf of Knauf Israel marketing |
| TLS certificate | Let's Encrypt, auto-renewed, valid (current expiry 2027-01-24) |
| HTTPS | Enforced; HTTP redirects to HTTPS; HSTS and standard security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are set. |
| Note | A legitimate registered domain operated for Knauf Israel. |

### 3. Architecture and hosting

| Component | Provider | Location | Notes |
|---|---|---|---|
| Web front-end (static files only) | Netlify | Global CDN | Contains no personal data; serves HTML/JS/CSS/images only. Netlify is SOC 2 Type II certified. |
| Database, authentication, serverless functions, file storage | Supabase | **EU – Frankfurt (AWS eu-central-1)** | All lead data is stored and processed in the EU. Supabase is SOC 2 Type II certified; data encrypted at rest (AES-256) and in transit (TLS). |
| Outbound email notifications | Google Gmail (SMTP over TLS) | Google | Dedicated mailbox `knauf.il.leads@gmail.com`, created solely for this system. See §8. |

No other third parties receive data. There are **no advertising, analytics or tracking scripts** on the site.

### 4. Data processed

| Data | Subjects | Fields |
|---|---|---|
| Leads | Conference visitors (B2B contacts: architects, contractors, distributors) | Name, phone, email, company, role, area of interest, free-text notes, the event they were met at, the assigned representative |
| Events | – | Event name, date, location |
| Representatives | Knauf Israel employees | Name, Knauf email address, phone |
| Admins | Knauf Israel employees | Knauf email address |

- **Personal data (GDPR):** yes – business contact details of prospects (B2B). Lawful basis: legitimate interest / pre-contractual steps. No special-category data. No data on minors. Data-subject requests (access, correction, deletion) are handled by an administrator; full export available.
- **Privacy notice:** shown on the lead form (purpose, EU storage, retention, rights), linking to the Knauf privacy policy at knauf.com/he-IL/privacy-policy.
- **Data residency:** EU (Frankfurt).
- **Retention:** leads are retained for sales follow-up; records can be deleted by an administrator at any time. A formal retention period can be set per Knauf policy (recommendation: 24 months after last contact).
- **Volume:** currently ~55 leads; a few hundred per year expected.

### 5. Authentication and access control

| Control | Implementation |
|---|---|
| Representative / admin login | One-time 6-digit code sent to the user's **registered Knauf email address**. No passwords are stored. |
| Who can log in | Only email addresses pre-registered by an administrator. Any other address is refused before a code is even sent. |
| Roles | *Representative* – works with their own leads. *Admin* – additionally manages events, representatives, admin rights, settings and exports. Admin rights are granted/revoked by an existing admin from the representatives screen. |
| Offboarding | An admin removes the representative; that email can no longer log in. |
| Anonymous access | None. A visitor who is not signed in cannot read or create anything; the lead form itself requires sign-in. Enforced at the database layer (Postgres Row-Level Security), not only in the UI. |
| Server-side enforcement | All authorization checks (admin status, allowed email) run in the database / server functions, not in the browser. |
| Rate limiting / abuse | Login codes limited per hour; lead submissions are flood-guarded; notification emails can only be sent to registered representatives (the form cannot be used as an open mail relay). |

### 6. Secrets and credentials

- No API keys, passwords or tokens are embedded in the public web bundle.
- Server secrets (database service key, mail credentials) are stored as encrypted environment secrets in Supabase and are never exposed to the browser.
- Developer access to the hosting accounts uses the owner's accounts with MFA where offered.

### 7. Backup and availability

- Automated daily backup (02:00 UTC) of all tables to encrypted storage in the same EU region; 30-day retention.
- Point-in-time export (JSON/Excel) available to admins on demand.
- Lead form works offline: if a representative has no reception at an event, the lead is queued on the device and sent automatically when connectivity returns.
- Previous hosting (Base44 platform) is kept as a cold standby for rollback.

### 8. Email notifications – known point for review

- When a lead is created, the assigned representative receives an email at their **Knauf address** with the lead details. Daily reminder emails are sent for leads not yet handled.
- Emails are sent from a dedicated Gmail mailbox (`knauf.il.leads@gmail.com`) over authenticated SMTP/TLS. This mailbox is **not** a Knauf-managed account.
- Emails deliberately contain **no links** (to comply with Knauf's inbound mail filtering).
- **If Knauf IT prefers**, sending can be switched to a Knauf-controlled mailbox or SMTP relay with no change to the application; only the credentials change. We are happy to do this as part of the approval.

### 9. Logging and monitoring

- Database and function logs are retained by Supabase (access limited to the system owner).
- Each email notification's delivery status and timestamp is recorded on the lead record.

### 10. Optional alternative that may simplify approval

Instead of allow-listing the external domain, the system can be served from a Knauf sub-domain, e.g. **`leads.knauf.com`**. This requires only one DNS CNAME record created by Knauf IT pointing to the existing hosting; nothing else changes. Hosting under Knauf's own domain removes the external-domain question entirely and improves trust for visitors filling in the form.

### 11. Contacts

- Business owner / system administrator: Eli Yosef – eli.yosef@knauf.com
- Second administrator: Keren Shay – Knauf Israel
- Hosting/technical documentation: available on request.
