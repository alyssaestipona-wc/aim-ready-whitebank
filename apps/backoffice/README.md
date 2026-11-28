# backoffice

The WhiteBank Lending staff console for Kalinaw Bank: sign-in, work queues,
case review, approvals, maker-checker booking, reports, compliance views and
tenant configuration.

**Case, decision and configuration data runs entirely on simulated data.**
All of that comes from the mock module in `src/mock` and is kept in the
browser's localStorage. "Reset demo data" at the bottom of the sidebar
restores the seed. The app is a port of the clickable prototype, recorded in
OpenSpec change `port-lending-prototype` and ADR-0003. **Sign-in is real**,
per OpenSpec change `real-identity-service`: it calls `apps/api`'s identity
service over HTTP.

## Things to know

- **Real session.** Signing in calls `apps/api`'s `/auth/login` and
  `/auth/verify-code` (the two-step email+password, then authenticator-code
  flow), which check the seeded account and return a signed session token
  holding the role. The app stores it in the `wbl_staff_session` cookie;
  `src/proxy.ts` verifies its signature on the server (not just presence)
  against the route map in `src/lib/access.ts`.
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
| `NEXT_PUBLIC_ADMIN_URL` | `http://localhost:3003` | Target of the "Admin console" link in the top strip. |

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

The tenant administrator no longer signs in here — see `apps/admin`.
