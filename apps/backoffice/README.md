# backoffice

The WhiteBank Lending staff console for Kalinaw Bank: sign-in, work queues,
case review, approvals, maker-checker booking, reports, compliance views and
tenant configuration.

**This app runs entirely on simulated data.** There are no API calls. All
cases, decisions and configuration come from the mock module in `src/mock`
and are kept in the browser's localStorage. "Reset demo data" at the bottom of
the sidebar restores the seed. The app is a port of the clickable prototype,
recorded in OpenSpec change `port-lending-prototype` and ADR-0003.

## Things to know

- **Placeholder session.** Signing in sets an unsigned `wbl_staff_session`
  cookie holding the role. `src/proxy.ts` checks it on the server against the
  route map in `src/lib/access.ts`. This keeps route access server-side, but
  it is **not authentication**. It is replaced when `apps/api` auth lands.
- **Disconnected from web.** The two apps have separate mock stores.
  An application a borrower submits in `web` does not appear here.
- **Simulated maker-checker.** Maker-checker, authority limits and
  segregation of duties are enforced in the mock layer on the client. The real
  enforcement belongs in `apps/api`.

## Run

```bash
pnpm --filter backoffice dev   # http://localhost:3001
pnpm --filter backoffice test
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WEB_URL` | `http://localhost:3002` | Target of the "Borrower web app" link in the top strip. |

## Demo accounts

The password for every account is `kalinaw2026`. The authentication code is
any six digits.

| Role | Email |
| --- | --- |
| Branch officer | `branchofficer@kalinawbank.ph` |
| Loan officer | `loanofficer@kalinawbank.ph` |
| Approver | `approver@kalinawbank.ph` |
| Loan operations (maker) | `loanops@kalinawbank.ph` |
| Loan operations supervisor (checker) | `opssupervisor@kalinawbank.ph` |
| Credit risk manager | `creditrisk@kalinawbank.ph` |
| Compliance and audit (read-only) | `compliance@kalinawbank.ph` |
| Tenant administrator | `admin@kalinawbank.ph` |
