# Contributing

## Setup

See [README.md's Development section](README.md#development) for getting a
local instance running.

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm run test
```

All three run in CI ([.github/workflows/docker.yml](.github/workflows/docker.yml))
and must pass before merge. `npm run test` runs against mocked dependencies,
no database needed.

## Adding a module

Modules (kudos, polls, dining, ...) follow a consistent shape: a settings
toggle, a set of server actions, an admin page, a portal page, audit log
entries. [docs/adding-a-module.md](docs/adding-a-module.md) walks through all
of it end to end, including the two-step audit log requirement (add the
action string, then actually call `logAudit` at the mutation, the second step
is easy to forget and won't be caught by anything automated).

## Conventions

- Server actions return `ActionResult` (`{ok:true,...} | {ok:false, error,
  field?}`, see [src/lib/actions/types.ts](src/lib/actions/types.ts)) and are
  called through the [useAction](src/lib/use-action.ts) hook on the client.
- Every mutation checks the caller's role with `requireRole()`
  ([src/lib/rbac.ts](src/lib/rbac.ts)) before touching the database.
- `/admin` is always light-mode; don't add `dark:` classes to admin-only
  components, they're dead code there.
- See [ROADMAP.md](ROADMAP.md) for known gaps and in-progress work before
  starting something that might already be tracked (or decided against).
