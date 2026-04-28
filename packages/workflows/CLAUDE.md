# workflows/

## Purpose
Inngest client. Multi-step workflows (durable, retryable, time-aware) use this primitive instead of per-feature ad-hoc orchestration. Vision §Architecture-10.

## Critical Rules
- NEVER write a `setTimeout`/`setInterval`/queue retry loop in feature code. If you reach for one, you want a workflow.
- NEVER import vendor SDKs (Stripe, Polar, Resend) directly inside a workflow function — go through `packages/adapters/`.
- ALWAYS define functions in their feature folder (`apps/api/features/<domain>/workflows/`); they register with this client at boot.
- ALWAYS make functions idempotent. Inngest retries on failure; non-idempotent functions corrupt state.

## Imports (use from other modules)
```ts
import { inngest } from '@gaia/workflows'

export const sendWelcome = inngest.createFunction(
  { id: 'send-welcome' },
  { event: 'user/created' },
  async ({ event, step }) => {
    await step.run('email', () => sendEmail(event.data))
  },
)
```

## Recipe: New workflow
1. Pick the feature folder (e.g. `apps/api/features/account/workflows/`).
2. `inngest.createFunction(...)` with an idempotent `step.run(...)` body.
3. Export from the feature; register at boot in `apps/api/server/`.

## Verify
```sh
bunx tsc --noEmit
```
