# web

The Kalinaw Bank online loans app for borrowers: sign-in, the loan
application, status tracking, inbox, document upload, offer acceptance,
e-signing and the loan view.

**Loan application data runs entirely on simulated data.** All applications
come from the mock module in `src/mock` and are kept in the browser's
localStorage; the rest of the app is a port of the clickable prototype,
recorded in OpenSpec change `port-lending-prototype` and ADR-0003.
**Sign-in is real**, per OpenSpec change `real-identity-service`: it calls
`apps/api`'s identity service over HTTP.

## Things to know

- **Real session.** Signing in calls `apps/api`'s `/auth/login`, which
  checks the seeded account and returns a signed session token. The app
  stores it in the `wbl_borrower_session` cookie; `src/proxy.ts` verifies
  its signature on the server (not just presence) to redirect signed-out or
  tampered requests.
- **Simulated bank steps.** This app has no shared back office, so its mock
  layer stands in for bank staff. About 4 seconds after a stage that waits on
  the bank, it moves the application on:
  - a referral becomes an information request;
  - after the borrower uploads, the case becomes an offer;
  - an accepted offer gets documents to sign;
  - signed documents are booked and the funds are released.

  Each step is marked "(simulated bank step)" in the history.
- **Simulated core banking.** Loan balances and schedules are a simulated
  core banking response, not a stored source of truth.
- **Disconnected from backoffice.** Applications submitted here do not appear
  in `backoffice`.

## Run

```bash
pnpm --filter web dev   # http://localhost:3002
pnpm --filter web test
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKOFFICE_URL` | `http://localhost:3001` | Target of the "Staff console" link in the top strip. |

## Demo accounts

The password for both accounts is `kalinaw2026`.

| Borrower | Email |
| --- | --- |
| Juan Dela Cruz | `juan.delacruz@email.com` |
| Carmela Bautista | `carmela.bautista@email.com` |
