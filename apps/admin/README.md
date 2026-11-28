# admin

The WhiteBank Lending tenant administrator console for Kalinaw Bank: sign-in,
products and campaigns, workflows, the approval matrix, documents and
templates, notifications, decisioning, AI models, integrations, users and
roles, tenant settings, and the audit log. See ADR-0005 and OpenSpec change
`split-admin-console`.

**Configuration data runs entirely on simulated data.** All of that comes
from the mock module in `src/mock` and is kept in the browser's
localStorage, independent of `apps/backoffice`'s own mock store. "Reset demo
data" at the bottom of the sidebar restores the seed. **Sign-in is real**,
per OpenSpec change `real-identity-service`: it calls `apps/api`'s identity
service over HTTP.

## Things to know

- **Real session.** Signing in calls `apps/api`'s `/auth/login` and
  `/auth/verify-code` (the two-step email+password, then authenticator-code
  flow), which check the seeded tenant-administrator account and return a
  signed session token. The app stores it in the `wbl_admin_session`
  cookie; `src/proxy.ts` verifies its signature on the server (not just
  presence) against the route map in `src/lib/access.ts`.
- **Disconnected from the staff console.** This app's mock store is
  independent of `apps/backoffice`'s. A product or rule-set draft credit risk
  submits in the staff console is simulated here as already-seeded,
  in-review state — there is no live cross-app action.
- **Single role.** Unlike `apps/backoffice`, every signed-in session here is
  the tenant administrator; the sidebar lists every configuration route with
  no role filtering.

## Run

```bash
pnpm --filter admin dev   # http://localhost:3003
pnpm --filter admin test
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WEB_URL` | `http://localhost:3002` | Target of the "Borrower web app" link in the top strip. |
| `NEXT_PUBLIC_BACKOFFICE_URL` | `http://localhost:3001` | Target of the "Staff console" link in the top strip. |

## Demo account

The password is `kalinaw2026`. The authentication code is any six digits.

| Role | Email |
| --- | --- |
| Tenant administrator | `admin@kalinawbank.ph` |
