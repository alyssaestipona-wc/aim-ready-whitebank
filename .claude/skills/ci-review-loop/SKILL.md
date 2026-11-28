---
name: ci-review-loop
description: 'User-invoked only. Do NOT auto-invoke. Only run when user explicitly types /ci-review-loop. Pushes the current branch and iterates, polling the `ci.yml` GitHub Actions run for the open PR, reading the failed step and its log, applying fixes, and re-pushing, until the run passes. Runs on Node (already required by this repo) — no additional setup needed on Windows, macOS, or Linux.'
---

# ci-review-loop

If `--help` is passed, print the following and stop:

```
ci-review-loop — push and iterate until the ci.yml run passes

Usage: /ci-review-loop [options]

Options:
  --no-push        Skip the initial push (use if you already pushed)
  --poll N         Poll interval in seconds (default: 270 — maximum cache-warm interval)
  --max-rounds N   Max fix+push rounds before stopping (default: 10)
  --help           Show this help

Examples:
  /ci-review-loop
  /ci-review-loop --no-push
  /ci-review-loop --poll 180 --max-rounds 5
```

This repo's CI (`.github/workflows/ci.yml`) is a single job, `build`, with steps in order: Checkout, Setup pnpm, Setup Node, Install dependencies, Lint, Typecheck, Build, Test. There is no automated review bot, but there is a `.husky/pre-push` git hook that runs the same four checks (scoped to what changed since `origin/main`) on every `git push` — so a push this skill makes can fail locally before it ever reaches GitHub. Treat that the same as any other push failure: read its output, fix it, retry. Never bypass it with `--no-verify`.

---

## Entry Point — Fresh Run or Wakeup?

**Before anything else**, check whether `.claude/ci-loop-state.json` exists and whether it was written by a scheduled wakeup:

```javascript
import fs from 'node:fs';

const statePath = '.claude/ci-loop-state.json';
if (fs.existsSync(statePath)) {
  const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (s.isWakeup === true) {
    // ScheduleWakeup re-entry — clear the flag and continue
    s.isWakeup = false;
    fs.writeFileSync(statePath, JSON.stringify(s, null, 2));
    // → jump to Step 2a
  } else {
    // User manually re-invoked — stale file from a previous session; start fresh
    fs.rmSync(statePath, { force: true });
    // → proceed to Step 0
  }
} else {
  // No state file — fresh run
  // → proceed to Step 0
}
```

- **`isWakeup == true`** → this is a **wakeup re-entry** — skip Steps 0–2 and jump directly to **Step 2a**.
- **Otherwise** (file missing or `isWakeup != true`) → this is a **fresh run** — delete the state file if present, proceed to Step 0.

This is the only branch in the command. Steps 0–2 run once (fresh); Step 2a onwards runs on every wakeup.

---

## Step 0 — Setup Check (fresh run only)

### 0a. GitHub CLI reachable

Run `gh auth status`. If it fails:

```
✗ The GitHub CLI is not authenticated.
  Run: gh auth login
```

Stop.

### 0b. Open PR for current branch

```javascript
import { execSync } from 'node:child_process';

const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
```

This repo's only GitHub remote is `origin`, but confirm it rather than assume (a fork or renamed remote changes this):

```javascript
import { execSync } from 'node:child_process';

const remotes = execSync('git remote -v', { encoding: 'utf8' });
const remote =
  remotes.split('\n').find((l) => l.includes('github.com') && l.endsWith('(push)'))?.split('\t')[0] ?? 'origin';
const repo = execSync('gh repo view --json nameWithOwner --jq .nameWithOwner', {
  encoding: 'utf8',
}).trim();
```

Find the open PR for the branch:

```
gh pr list --repo <repo> --head <branch> --state open --json number,title,isDraft,url
```

**No PR found:**

```
✗ No open PR found for branch '<branch>'.
  Create one first (gh pr create --base main), then re-run /ci-review-loop.
```

Stop.

**PR found:** extract `prNumber`. Display:

```
PR: #<prNumber>, <title>
Branch: <branch>
```

(`ci.yml`'s `pull_request` trigger has no `types:` filter, so it runs on draft PRs too — no draft warning needed.)

### 0c. Parse options

- `--no-push`: boolean, default `false`
- `--poll N`: integer seconds, default `270`
- `--max-rounds N`: integer, default `10`

Set `round = 0`.

---

## Step 1 — Initial Push (fresh run only)

Skip if `--no-push` was passed.

Check for unpushed commits:

```javascript
import { execSync } from 'node:child_process';

let unpushed = '';
try {
  unpushed = execSync(`git log ${remote}/${branch}..HEAD --oneline`, { encoding: 'utf8' });
} catch {
  unpushed = '';
}
```

- **Commits found** → run `git push <remote> <branch>` (see **Pushing and the pre-push hook** below for what to do when it fails).
- **No unpushed commits** → display `"Nothing new to push, monitoring the existing run."` and continue.

### Pushing and the pre-push hook

`.husky/pre-push` fires on every `git push` in this repo (this one included) and runs:

```
pnpm turbo run lint typecheck build test --filter='...[origin/main]'
```

— the same four checks as `ci.yml`, scoped to what changed since `origin/main` plus everything that depends on it. (`packages/base` defines none of these scripts; turbo skips it automatically.) When the push fails, tell the two causes apart from the error output:

- **The hook caught a real problem** (turbo's task output — `lint`, `typecheck`, `build`, or `test` — appears in the error, ending in something like `ERROR run failed: command exited (1)`): fix it using Step 5a's per-type guidance, commit, and push again. This never needs a CI round-trip — resolve it locally before touching `ScheduleWakeup` at all. Never pass `--no-verify` to push past a real failure.
- **A git-level push problem** (the error contains `non-fast-forward` or `rejected (fetch first)`, with no turbo output): run `git pull --rebase <remote> <branch>`, then retry the push once. If the retry also fails, stop and show the error.
- **Any other error** → stop immediately and show it.

If any task fails, do **not** push. Read the error output for the failing task(s), fix the flagged files using the same per-type guidance as Step 5a (lint / build / test), and re-run the command above. Keep iterating locally until it passes cleanly.

If it still fails after 5 local iterations without resolving, stop and report to the user — don't keep guessing.

---

## Step 2 — Write State and Schedule First Wakeup (fresh run only)

Write `.claude/ci-loop-state.json` (valid JSON — no comments). Replace `<maxRounds>` and `<pollInterval>` with their integer values — do not quote them. `<prNumber>` is a string.

| Field           | Purpose                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `isWakeup`      | Entry-point gate — `true` only when set by a `ScheduleWakeup` call; a user re-invocation finds `false` and starts fresh |
| `lastPushedAt`  | Time-based short-circuit in Step 2a — skip the status check if the push was too recent                   |
| `lastRunSha`    | Tracks which head commit the last-seen run was for                                                        |
| `runDurations`  | Adaptive poll interval — keeps the last 5 completed run durations (seconds)                                |

```json
{
  "prNumber": "<prNumber>",
  "repo": "<repo>",
  "remote": "<remote>",
  "branch": "<branch>",
  "round": 0,
  "maxRounds": <maxRounds>,
  "pollInterval": <pollInterval>,
  "startedAt": "<ISO timestamp>",

  "isWakeup": true,
  "lastPushedAt": "<ISO timestamp>",
  "lastRunSha": "",
  "runDurations": []
}
```

Set `lastPushedAt` to the current ISO timestamp at the moment the state file is written (or `"none"` if `--no-push` was passed and no push occurred).

```javascript
import fs from 'node:fs';

const pushOccurred = /* true if Step 1's push actually ran; false if --no-push or no unpushed commits */ false;

const state = {
  prNumber: '<prNumber>',
  repo: '<repo>',
  remote: '<remote>',
  branch: '<branch>',
  round: 0,
  maxRounds: /* <maxRounds> */ 10,
  pollInterval: /* <pollInterval> */ 270,
  startedAt: new Date().toISOString(),

  isWakeup: true,
  lastPushedAt: pushOccurred ? new Date().toISOString() : 'none',
  lastRunSha: '',
  runDurations: [],
};

fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

Display:

```
Polling every <poll>s. You'll be notified when the run finishes. No need to watch.
```

Call `ScheduleWakeup` with `delaySeconds: <pollInterval>` and `reason: "checking ci.yml run for PR #<prNumber> (<branch>)"`.

**Stop.** The wakeup re-enters at Step 2a.

---

## Step 2a — Check CI Status (wakeup re-entry)

Read state file (one file read, no network calls for setup):

```javascript
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync('.claude/ci-loop-state.json', 'utf8'));
```

Extract: `prNumber`, `repo`, `remote`, `branch`, `round`, `maxRounds`, `pollInterval`, `lastPushedAt`, `lastRunSha`, `runDurations`.

**Time-based short-circuit:** If `lastPushedAt` is set (not `"none"`), check how long ago the push was:

```javascript
let elapsedSeconds = null;
if (state.lastPushedAt && state.lastPushedAt !== 'none') {
  elapsedSeconds = (Date.now() - new Date(state.lastPushedAt).getTime()) / 1000;
}
```

If `elapsedSeconds !== null && elapsedSeconds < 120`, the run cannot have results yet. Display `"CI check skipped — push was <N>s ago, too early for results. Next check in <poll>s."`, then:

```javascript
import fs from 'node:fs';

state.isWakeup = true;
fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

Call `ScheduleWakeup` with `delaySeconds: Math.max(60, Math.round(120 - elapsedSeconds) + 30)` and `reason: "push too recent — waiting before checking ci.yml run for PR #<prNumber>"`. **Stop.**

**Adaptive poll interval:** Compute the next poll interval from historical run durations:

```javascript
let nextPoll;
if (state.runDurations.length > 0 && state.lastPushedAt && state.lastPushedAt !== 'none') {
  const avg = state.runDurations.reduce((a, b) => a + b, 0) / state.runDurations.length;
  const elapsed = (Date.now() - new Date(state.lastPushedAt).getTime()) / 1000;
  const remaining = avg - elapsed;
  nextPoll = Math.max(60, Math.min(state.pollInterval, remaining + 30));
} else {
  nextPoll = state.pollInterval;
}
```

Use `$nextPoll` (not `$state.pollInterval`) for all `ScheduleWakeup` calls in this step.

Fetch the most recent `ci.yml` run for the PR's branch:

```
gh run list --repo <repo> --workflow ci.yml --branch <branch> --event pull_request --limit 5 --json databaseId,status,conclusion,headSha,createdAt
```

Pick the run with the highest `databaseId` whose `headSha` equals the branch's current head (`git rev-parse HEAD`). If none matches yet, the run has not started: reschedule as for a running run. If no run ever appears, check that the workflow actually triggered on the push.

Check `status`:

| Status / conclusion                                | Action                                     |
| -------------------------------------------------- | ------------------------------------------- |
| `queued` / `in_progress` / `waiting` / `requested` | Display and reschedule, see below           |
| `completed` + `success`                            | Record duration, proceed to Step 4 (passed) |
| `completed` + `failure` / `cancelled`              | Record duration, proceed to Step 3          |
| `completed` + `skipped`                            | Treat as passed — record duration, proceed to Step 4 |

**When the run completes** (`status: completed`): update `runDurations`. The `run` object is in scope here from the `gh run list` call above.

```javascript
import fs from 'node:fs';

const duration = (Date.now() - new Date(run.createdAt).getTime()) / 1000;
state.runDurations = [...state.runDurations, duration].slice(-5);
state.lastRunSha = run.headSha;
fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

**If still running**, display and reschedule:

```
Run <id>: in progress  (started <N> min ago)
Next check in <poll>s.
```

```javascript
import fs from 'node:fs';

state.isWakeup = true;
fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

Call `ScheduleWakeup` with `delaySeconds: $nextPoll` and `reason: "ci.yml run still in progress for PR #<prNumber>, round <round>/<maxRounds>"`. **Stop.**

---

## Step 3 — Read CI Results

Fetch the `build` job and its steps:

```
gh run view <runId> --repo <repo> --json jobs --jq '.jobs[] | {name, status, conclusion, steps: [.steps[] | {name, status, conclusion}]}'
```

If the job conclusion is `success`, nothing actually failed — proceed to Step 4 (defensive: Step 2a's run-level check should already have caught this).

If the job conclusion is `failure` or `cancelled`: GitHub Actions stops a job at its first failed step, so walk `steps` in order and find the first one with `conclusion: failure` (later steps show `skipped` or are missing). Classify by step name:

| Step name              | Classify as                           |
| ----------------------- | -------------------------------------- |
| `Install dependencies` | install                               |
| `Lint`                  | lint                                   |
| `Typecheck`             | typecheck                             |
| `Build`                 | build                                  |
| `Test`                  | test                                   |
| anything else (`Checkout`, `Setup pnpm`, `Setup Node`) | infra — not a code problem, see below |

Read the job's log, capped to **first 40 lines + last 40 lines** (the first 40 capture the root error, the last 40 capture the crash summary; discard the middle):

```
gh run view <runId> --repo <repo> --job <jobId> --log-failed
```

**If the failed step is infra** (checkout, pnpm/node setup): this is not a code problem — a runner hiccup, a registry outage, a corrupted cache. Re-run the job and keep polling instead of changing code:

```
gh run rerun <runId> --repo <repo> --job <jobId>
```

**Causal chain ordering:** our steps already run in this exact order and the job stops at the first failure, so normally there is only one failed step per round. If more than one is independently broken (e.g. after a large rebase), fix in this sequence:

1. install
2. lint
3. typecheck
4. build
5. test

After fixing lint and typecheck, re-evaluate whether build/test failures are likely already resolved (e.g. if build failed from the same type error typecheck already flagged). Avoid spending tokens on downstream fixes that will self-resolve once the upstream one is fixed.

### 3a. Display summary

```
Run <id>: failed   Round <round>/<maxRounds>
Failed step: <name> (<type>)
```

---

## Step 4 — Evaluate Stop Condition

| Condition                              | Action                           |
| --------------------------------------- | --------------------------------- |
| `round >= maxRounds`                    | → Step 7 (unresolved handoff)     |
| CI run conclusion = `success`/`skipped` | → Step 6 (clean handoff)          |
| CI run conclusion = `failure`/`cancelled` | → Step 5 (fix loop)             |

---

## Step 5 — Fix Loop

Increment `round`. Update the state file:

```javascript
import fs from 'node:fs';

state.round = /* <new round> */ state.round + 1;
fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

### 5a. Fix the failed step

**Invoke `superpowers:systematic-debugging`** when the failure is not immediately obvious from the log — cryptic test failures, unclear build errors, or any error whose cause isn't directly stated in the output. Skip it for straightforward failures where the fix is self-evident (an ESLint error naming the exact rule and location, a TypeScript error with a file:line reference).

Apply the fix per step type:

- **install** — almost always a stale `pnpm-lock.yaml` relative to a `package.json` change; run `pnpm install` locally and include the updated lockfile, or fix whatever dependency change caused the mismatch
- **lint** — read the flagged files and rule names from the log; fix them
- **typecheck** — read the `tsc` error (file:line, error code) from the log; fix the flagged files
- **build** — read the compilation/bundling errors; fix the flagged files
- **test** — read the failure output; fix broken assertions or the underlying logic

### 5b. Commit and push

Stage only the files you changed.

**Empty commit prevention:** Before staging, check whether any changes actually exist:

```javascript
import { execSync } from 'node:child_process';

let noUnstaged = false;
let noStaged = false;
try {
  execSync('git diff --quiet');
  noUnstaged = true;
} catch {
  noUnstaged = false;
}
try {
  execSync('git diff --cached --quiet');
  noStaged = true;
} catch {
  noStaged = false;
}
if (noUnstaged && noStaged) {
  // Nothing changed — the fix produced no file modifications
  // Skip commit and push entirely; schedule next CI check
}
```

If no changes exist:

```javascript
import fs from 'node:fs';

state.isWakeup = true;
fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

Call `ScheduleWakeup` with `delaySeconds: $nextPoll` and `reason: "no changes from fix — waiting for next ci.yml result on PR #<prNumber>, round <round>/<maxRounds>"`. **Stop.**

Stage and commit directly — **do not invoke the `git-commit` skill** (it has interactive confirmation steps that block automation). Apply its conventions inline:

- One commit per fix type (install, lint, typecheck, build, test). Don't bundle unrelated fix types into a single commit.
- Conventional Commits format, scoped to the workspace(s) touched (`api`, `borrower-web`, `staff-web`, `web`, `ui`, `core`, `contracts`) per the `git-commit` skill's scope table, e.g. `fix(staff-web): ...`. Omit the scope only if the fix is genuinely repo-wide.
- **The subject must describe what was actually fixed** — not a round number or generic phrase:
  - ✅ `fix(api): null-check the case lookup before updating its status`
  - ✅ `fix(ui): import @testing-library/jest-dom/vitest instead of the plain entrypoint`
  - ❌ `fix: address CI failures (round 7)` — meaningless once merged
  - ❌ `fix: fix the build` — same problem
    If multiple unrelated fixes land in one commit, write the broadest accurate description that covers them all.
- Add a body listing what specifically changed, when there's more than one notable change.
- Append whatever `Co-Authored-By` trailer this session's attribution instructions specify (same rule as the `git-commit` skill) — never hardcode a model name, never invent one if none given.

Push:

```javascript
import { execSync } from 'node:child_process';

execSync(`git push ${remote} ${branch}`);
```

Apply the same **Pushing and the pre-push hook** triage from Step 1: a hook-caught failure goes back to the top of 5a (fix, recommit, push again — no CI round needed); `non-fast-forward`/`rejected (fetch first)` means `git pull --rebase <remote> <branch>` then retry once; anything else, stop and show it.

**Update `lastPushedAt`** in state immediately after a successful push:

```javascript
import fs from 'node:fs';

state.lastPushedAt = new Date().toISOString();
fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

Display:

```
Round <round>: fixes pushed.
Next CI check in <poll>s.
```

```javascript
import fs from 'node:fs';

state.isWakeup = true;
fs.writeFileSync('.claude/ci-loop-state.json', JSON.stringify(state, null, 2));
```

Call `ScheduleWakeup` with `delaySeconds: $nextPoll` and `reason: "waiting for ci.yml after round <round> fixes on PR #<prNumber>"`. **Stop**, wakeup re-enters at Step 2a.

---

## Step 6 — Clean Handoff

Delete the state file:

```javascript
import fs from 'node:fs';

fs.rmSync('.claude/ci-loop-state.json', { force: true });
```

Call `PushNotification`:

```
PushNotification(
  title: "ci-review-loop ✅",
  body:  "PR #<prNumber> — ci.yml passed after <round> round(s), ready to merge."
)
```

Print:

```
Done ✅   Round <round>/<maxRounds>

ci.yml: passed

PR #<prNumber> is ready to merge.
```

Stop. Do not merge — per `AGENTS.md`, a human merges, agents do not self-merge.

---

## Step 7 — Unresolved Handoff

Delete the state file:

```javascript
import fs from 'node:fs';

fs.rmSync('.claude/ci-loop-state.json', { force: true });
```

Call `PushNotification`:

```
PushNotification(
  title: "ci-review-loop ⚠",
  body:  "Reached <maxRounds> rounds on PR #<prNumber>, manual intervention needed."
)
```

Print:

```
Reached <maxRounds> rounds. Remaining issue:

<failed step summary>

What would you like to do?
1) Keep going — Claude continues fixing
2) Stop — investigate manually
```

- **1)** Ask for a new `--max-rounds` value (default: current + 10). Re-write the state file with `round = 0` and the new `maxRounds`. Preserve all other fields without modification — specifically `runDurations`, `lastRunSha`, and `lastPushedAt`. Only reset `round` and `maxRounds`. Re-enter Step 5 immediately.
- **2)** Stop. Print the remaining issue. Do not push.
