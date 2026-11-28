---
name: git-commit
description: Stage and commit changes using Conventional Commits. Use this skill whenever the user asks to commit, stage and commit, save changes to git, or do a git commit — even if they just say "commit this", "commit my changes", "save this to git", or "let's commit". Always use this skill for any commit-related request, don't just run git commands directly.
---

# Git Commit

Analyze the working tree, group related changes into logical commits, and execute them.

## Step 1 — Analyze what changed

Run these in parallel:
- `git status` — see which files are modified, untracked, deleted
- `git diff HEAD` — see the actual line-level changes
- `git branch --show-current` — get the current branch name

Read the diff carefully. Understand *what* changed, not just *which files*.

## Step 2 — Group into logical commits

This is the most important step. The goal is commits that tell a coherent story — each one should represent one logical unit of work.

**Group files together when:**
- They implement the same feature or fix together (e.g., a NestJS controller + its DTO + its service method)
- They're config/boilerplate that was added as part of the same setup (e.g., multiple config files bootstrapped together)
- One file is a direct consequence of another (e.g., a type file and the code that uses it)
- They belong to the same OpenSpec change (e.g., a spec delta and the code implementing it, or several fixes from the same code-review round)

**Split into separate commits when:**
- Files belong to clearly different concerns (e.g., a new feature AND a bug fix AND a docs update)
- Mixing them would make the commit message dishonest or vague (e.g., you'd have to write "feat: add auth and also fix typo and update config")
- Files span workspaces that aren't actually related (e.g., an unrelated `apps/api` fix and an `apps/backoffice` feature landing in the same working tree by coincidence)

**Default to fewer commits.** If you're unsure whether to split, group them. A single well-named commit is better than three commits that each only make sense together.

## Step 3 — Choose the prefix and scope

Use exactly one prefix per commit, written `<type>(<scope>): <description>` or `<type>: <description>` when no scope applies.

| Prefix | When to use |
|---|---|
| `feat:` | New capability visible to users or other services |
| `fix:` | Corrects broken behavior |
| `refactor:` | Restructures code without changing behavior |
| `chore:` | Config, deps, tooling, scripts, file moves |
| `docs:` | Documentation only |
| `test:` | Tests only |
| `perf:` | Performance improvement |
| `build:` | Build system or bundler changes |
| `ci:` | CI/CD pipeline changes |

**Scope** names the workspace(s) touched, matching this repo's package layout:

| Scope | Workspace |
|---|---|
| `api` | `apps/api` |
| `web` | `apps/web` |
| `backoffice` | `apps/backoffice` |
| `ui` | `packages/ui` |
| `core` | `packages/core` |
| `contracts` | `packages/contracts` |
| `openspec` | `openspec/**` (proposals, specs, archiving) |

- A commit touching one workspace: `fix(backoffice): ...`
- A commit touching a few, related workspaces: comma-join them in the order they matter most, e.g. `fix(backoffice,web): ...`
- A commit touching the repo broadly (root config, `AGENTS.md`, cross-cutting refactors) or more than ~3 workspaces: omit the scope, e.g. `fix: address spec review round 3`

## Step 4 — Write the commit message

Format: `<prefix>(<scope>): <imperative short description>` (or without scope per Step 3)

- Use imperative mood: "add auth middleware" not "added auth middleware"
- Be specific: "feat(api): add JWT refresh token endpoint" not "feat(api): update auth"
- Keep the subject line under 72 characters where possible; it's a hard ceiling, not a target — don't pad to reach it, and don't let an accurate subject get cryptic to force a fit
- Don't mention file names — describe the *change*, not the *files*
- For a commit with more than one notable change, add a short body: one or two prose sentences on what changed and why, not a mechanical bullet-per-file list

## Step 5 — Attribution trailer

If this session carries attribution instructions for commits (for example, a system reminder specifying a `Co-Authored-By` line), append that exact trailer as the last line of every commit message, after a blank line. Use whatever the current instructions say — never hardcode a specific model name, and never invent a trailer if none was given.

## Step 6 — Show the plan, then execute

Before running any git commands, generate a diff stat per commit group and show the user the proposed grouping with change counts.

For each commit group, run:
```bash
git diff HEAD --stat -- <file1> <file2> ...
```

Then display the plan with the stat output inline:

```
Proposed commits:

1. fix(backoffice): refuse resubmitting a draft case under review
   Files: apps/backoffice/src/cases/case.service.ts
          apps/backoffice/src/cases/case.service.spec.ts
   Changes:
     case.service.ts       | 18 +++++++++++
     case.service.spec.ts  | 24 +++++++++++++++
     2 files changed, 42 insertions(+)

2. chore: bump turbo and typescript-eslint
   Files: package.json
          pnpm-lock.yaml
   Changes:
     package.json    | 4 ++--
     pnpm-lock.yaml   | 56 ++++++++++++++++---------
     2 files changed, 38 insertions(+), 22 deletions(-)

```

For each file, check `git status --porcelain -- <file>`: if the output starts with `??`, it is a new untracked file — show `(new file)` instead of a stat line. For tracked files, `git diff HEAD --stat -- <file>` shows the change count.

Proceed immediately — do not ask for confirmation. Run the secret file guard, then stage and commit.

Before staging anything, run the secret file guard:

### Secret file guard

Collect the complete list of all files across all proposed commit groups. For each file path, check whether it matches any of these patterns (case-insensitive, match against the filename portion only):

| Pattern | Examples |
|---|---|
| `.env` | `.env` (exact) |
| `.env.*` | `.env.local`, `.env.production` |
| `*credentials*` | `firebase_credentials.json`, `admin_credentials.yaml` |
| `*secret*` | `jwt_secret.txt`, `secrets.json` |
| `*.pem` | `server.pem`, `ca.pem` |
| `*.key` | `private.key`, `id_rsa.key` |

For every file that matches, do not stage it. Instead, warn the user:

```
⚠  Skipping sensitive file: apps/api/.env.local
⚠  Skipping sensitive file: apps/api/firebase_credentials.json

These files were NOT staged. Remove them from the proposed grouping or add them to .gitignore.
```

After printing the warnings, remove the matched files from their respective commit groups. If removing matched files empties an entire commit group, drop that commit from the plan entirely and note it:

```
  Commit "chore: configure environment" has no remaining files — skipped.
```

Then proceed with staging and committing only the safe files.

Once secrets are removed, for each commit in order:
```bash
git add <files for this commit>
git commit -m "<message>"
```

Report each commit as it completes with its short SHA.
