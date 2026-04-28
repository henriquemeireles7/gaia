# AI — Building agent-native features

> Status: Reference
> Last verified: April 2026
> Scope: Anything that calls the Anthropic API or wraps an LLM in product
> Paired with: `backend.md` (route patterns), `errors.md` (failure model), `observability.md` (cost + latency tracking)

---

## What this file is

Gaia is "agent-native" — that's marketing positioning that has to land in code. This file is the playbook for AI features: how to call the Anthropic API safely, how to structure prompts, when to use tool calling, when to cache, and how to keep cost / latency observable.

The adapter is `packages/adapters/ai.ts` (capability-named per `backend.md`). Feature code never imports `@anthropic-ai/sdk` directly.

Read `backend.md` first for the adapter pattern. Read `errors.md` for ProviderError / AppError. Then this file.

---

## The 10 AI principles

### Boundaries

**1. Vendor isolation through `packages/adapters/ai.ts`.**
Feature code calls `complete(...)` and similar from `@gaia/adapters/ai`. Never import `@anthropic-ai/sdk` outside the adapter. Switching providers (Anthropic → another) means changing one file, not 40.

**2. Server-side only.**
The Anthropic API key never reaches the browser. AI calls happen server-side via Elysia routes; the frontend talks to the API via Eden Treaty. Enforced by `frontend/no-vendor-sdk-on-client` (`harden-check.ts`).

**3. Errors propagate as `ProviderError`.**
SDK exceptions bubble out as `ProviderError('anthropic', operation, status, details)`. Routes wrap calls in try/catch and translate to user-facing `AppError` codes (see `errors.md`).

### Prompt structure

**4. System prompt = persistent context. User prompt = the task.**
System prompts describe the product, the persona, the rules. User prompts are the specific question / input. Don't mix them.

**5. Always set a `max_tokens` ceiling.**
Runaway generation is a cost and latency hazard. Pick a sane ceiling for the task type:

- Short structured output: 256–512 tokens
- Conversational reply: 1–2k tokens
- Long-form generation: 4–8k tokens

**6. Use the latest Claude model unless you have a reason not to.**
The default in `packages/adapters/ai.ts` is the most recent `claude-opus` or `claude-sonnet` family member. Pin to a specific model only when:

- A user-facing feature must produce identical output across runs
- Cost requires a smaller model
- An older model behavior is load-bearing for a reproducibility reason

### Cost + latency

**7. Prompt caching is on by default for repeatable system prompts.**
Use the SDK's caching primitives (`cache_control: 'ephemeral'`) on system prompts that repeat across requests. Cache hits are ~10% of the cost — measurable savings for any feature with a non-trivial system prompt.

**8. Stream by default for user-visible output.**
Anything the user reads as it generates uses streaming (`stream: true`). The Eden Treaty surface for streaming is a `Response` with `text/event-stream`. Falls back to the non-streaming endpoint for batch / async features.

**9. Track tokens, latency, and cost on every call.**
Wrap calls in OTel spans (`packages/core/observability.ts`). Tags: `model`, `prompt_tokens`, `completion_tokens`, `cache_hit_tokens`, `latency_ms`. Sentry captures errors automatically; the OTel trace captures cost.

### Tool use

**10. Tools are a server-side capability, not a model decision.**
When a feature uses tool calling, the tools are defined in TypeScript on the server and passed to the SDK. The model's job is to pick which tool to call with what args; the server's job is to validate args (TypeBox) and execute. Never trust an LLM to call an arbitrary HTTP endpoint, run shell commands, or write files unless the action is explicitly enumerated in your tool definitions.

---

## Adapter shape (`packages/adapters/ai.ts`)

```ts
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@gaia/config'
import { ProviderError } from '@gaia/adapters/errors'

export const ai = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const DEFAULT_MODEL = 'claude-opus-4-7'

export async function complete(input: {
  system?: string
  prompt: string
  maxTokens?: number
  model?: string
}): Promise<{ text: string; tokens: { in: number; out: number } }> {
  try {
    const res = await ai.messages.create({
      model: input.model ?? DEFAULT_MODEL,
      max_tokens: input.maxTokens ?? 1024,
      system: input.system,
      messages: [{ role: 'user', content: input.prompt }],
    })
    const text = res.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('')
    return {
      text,
      tokens: { in: res.usage.input_tokens, out: res.usage.output_tokens },
    }
  } catch (err) {
    throw new ProviderError('anthropic', 'complete', 502, String(err))
  }
}
```

Feature code calls `complete({ system, prompt, maxTokens })`. The SDK shape never escapes the adapter.

---

## Tool calling pattern

```ts
// In a feature route
const tools: Anthropic.Tool[] = [
  {
    name: 'search_users',
    description: 'Find users by email or name fragment.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
]

const res = await ai.messages.create({
  model,
  max_tokens: 1024,
  tools,
  messages,
})

if (res.stop_reason === 'tool_use') {
  const toolBlock = res.content.find((c) => c.type === 'tool_use')
  if (toolBlock?.name === 'search_users') {
    // Validate args via TypeBox before executing
    const args = Value.Parse(SearchSchema, toolBlock.input)
    const results = await userService.search(args.query)
    // Send results back as tool_result message; loop continues
  }
}
```

Validate `toolBlock.input` with the same TypeBox schema you'd use for an HTTP route. The model can hallucinate tool args; the schema is the safety net.

---

## Streaming

```ts
// In an Elysia route
.get('/ai/chat', async function* ({ query }) {
  const stream = await ai.messages.create({
    model,
    max_tokens: 2048,
    messages: [{ role: 'user', content: query.prompt }],
    stream: true,
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
})
```

Elysia generators stream as `text/event-stream` automatically. The Eden Treaty client receives the stream and feeds it to UI as `createResource` or similar.

---

## Cost ceilings

Set a per-user, per-feature, and per-tenant cost ceiling. Cheap to add; saves you from a runaway loop:

```ts
const used = await aiUsageThisHour(user.id)
if (used > USER_HOURLY_CAP_TOKENS) {
  throw new AppError('RATE_LIMITED', 'AI quota exceeded for this hour.')
}
```

Track usage in a `ai_usage` table or via OTel + a periodic aggregator. Pick the lighter-weight option for the volume.

---

## Common mistakes

| Mistake                                              | Why wrong                               | Fix                                            |
| ---------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| Calling Anthropic SDK directly from a feature module | Vendor lock; can't swap providers       | Go through `packages/adapters/ai.ts`           |
| Putting the API key in `import.meta.env`             | Leaks to the browser bundle             | Server-side only; via `packages/config/env.ts` |
| Skipping `max_tokens`                                | Runaway cost, latency                   | Always set a ceiling                           |
| Trusting tool-call args without validation           | LLM hallucinates schema                 | Validate with TypeBox before executing         |
| Using a long static system prompt without caching    | Pays full price every request           | `cache_control: 'ephemeral'`                   |
| Streaming text via `Response` without SSE            | Browser buffers until done — feels slow | Elysia generator → text/event-stream           |
| No telemetry on AI calls                             | Can't debug latency, can't audit cost   | OTel span with tokens / model / cache tags     |
| One model per call hardcoded across many files       | Bumping model = many files to change    | Default in adapter; override per-call only     |

---

## Cross-references

- Adapter: `packages/adapters/ai.ts`
- Error model: `errors.md`
- Backend patterns: `backend.md`
- Observability tags: `observability.md`
- Anthropic SDK docs: https://docs.anthropic.com/en/api
- Prompt caching guide: https://docs.anthropic.com/en/docs/prompt-caching

---

## Decisions log

| Date       | Decision                                       | Rationale                                                                                          |
| ---------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Anthropic as default AI provider               | Best Claude / tool-use / caching ergonomics. Replaceable via adapter — not a permanent commitment. |
| 2026-04-28 | Vendor isolation via `packages/adapters/ai.ts` | Same rule as Polar / Resend / S3. Vendor SDKs change shape; the adapter holds the contract steady. |
| 2026-04-28 | Server-side only for AI calls                  | API keys can't leak to the browser; rate limiting / cost capping happens at the boundary.          |
| 2026-04-28 | Tool args validated by TypeBox                 | Same schema language as HTTP routes; LLM can't escape the schema by being clever.                  |

_Add to log when changing default model, swapping providers, or changing the streaming / caching defaults._
