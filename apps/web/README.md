# web

The Kalinaw Bank online loans app for borrowers: sign-in, the loan
application, status tracking, inbox, document upload, offer acceptance,
e-signing and the loan view.

**This app runs entirely on simulated data.** There are no API calls. All
applications come from the mock module in `src/mock` and are kept in the
browser's localStorage. The app is a port of the clickable prototype,
recorded in OpenSpec change `port-lending-prototype` and ADR-0003.

## Things to know

- **Placeholder session.** Signing in sets an unsigned
  `wbl_borrower_session` cookie. `src/proxy.ts` checks it on the server to
  redirect signed-out requests. This is **not authentication**.
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
