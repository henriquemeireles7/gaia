# Voice — Brand Voice, Writing, & AI Humanization

> Status: Reference
> Last verified: April 2026
> Scope: Every word a human will read — microcopy, errors, docs, marketing, AI-generated content
> Quality gates: The Indy Test + The AI Slop Test

---

## What this file is

Gaia's writing voice made explicit and testable. Covers:

- Universal voice principles (apply everywhere)
- Voice by channel (microcopy, errors, docs, marketing, AI-generated content)
- Gaia's brand voice specifically
- Stakes-based register (calm for high-stakes, lighter for low)
- Anti-manipulation rules (no dark patterns, no black-hat copy)
- Quality gates (Indy Test, AI Slop Test, review rubric)

This file is the counterpart to `design.md`. Warm visuals (Ethereal Warmth) + honest direct words = trust. One without the other fails.

Read `code.md` first (principle #1: legibility outranks cleverness). Then this file for how every piece of human-readable text should sound.

---

## The voice in one sentence

**Write like someone who's done the thing, for someone who's about to try it. Warm, direct, specific. Never hedged. Never hyped.**

If that sentence doesn't describe the copy you're reviewing, it needs a rewrite.

---

## The 12 universal voice principles

### Honesty & humanity

**1. Write like you're thinking, not like you've finished thinking.**
Incomplete certainty. Personal observation. Hedged claims when unsure, direct claims when sure.

- ❌ "The decision-making process involves several key steps that lead to improved outcomes."
- ✅ "Here's what I've noticed. People who get unstuck don't have better information. They decide faster."

The second one has hesitation, observation, incomplete certainty. That's how humans think. AI writes every paragraph as if it's a concluded argument.

**2. Specificity is the signal of humanity.**
Names. Numbers. Dates. Places. Times. Concrete details make everything around them feel real.

- ❌ "Many users spend significant amounts on development tools."
- ✅ "You've burned $240/mo on five SaaS tools that do 30% of what Gaia ships with."

"$240" hits harder than "significant amounts." "Five" hits harder than "many." Name the number.

**3. Rhythm breaks are the human signature.**
Short sentence. Then a longer one that builds, turns, and lands somewhere you didn't expect. Then short again.

One word. Sometimes.

Then a paragraph that breathes, takes its time, lets the reader sit with the idea instead of rushing to the next one.

Vary sentence length from 2 words to 30. Mix one-sentence paragraphs with 4-sentence runs. Read it out loud. If it sounds like a metronome, rewrite.

**4. Show the feeling, don't name it.**

- ❌ "Users experience frustration when tools don't work together."
- ✅ "You know that moment when `npm install` fails and you realize it's midnight? That's the moment Gaia was built for."

Don't say "frustrated." Show the 11pm debugging. Don't say "delighted." Show the green checkmark and the pull request going up.

**5. Opinions without hedges.**
If you believe it, say it. Hedging is AI's tell.

- ❌ "While some teams find React valuable, others may find Solid more aligned with their performance requirements."
- ✅ "Solid beats React for agent-native SaaS. Fine-grained reactivity, no virtual DOM overhead, better per-request throughput. React won the 2015-2023 era. Solid is built for what comes next."

Gaia has opinions. State them. Disagree, sure — but don't pre-disagree with yourself.

### Craft

**6. Kill the announcements.**

- ❌ "In this section, we'll explore the folder structure..."
- ❌ "Now that we've covered auth, let's move to billing."
- ❌ "Let's dive into..."

Just start. The reader doesn't need a table of contents narrated aloud.

**7. The hard parts are where voice lives.**
Errors, refusals, uncertainty, declines, system failures. Most teams write happy-path tone and abandon everything else to default robot-speak. That's backwards. Your voice matters *most* when something's gone wrong.

**Example — error message that carries voice:**

- ❌ Default: "Error: Request failed with status 500."
- ✅ Voice: "Something broke on our end — not yours. Your changes are safe. We've logged it; retry in a minute, or email us at support@gaia.dev if it persists."

Reassurance (not your fault), honest state (your data is safe), clear next action (retry), escape (email). All in three sentences. Voice intact.

**8. Voice matches stakes — consistent personality, adjusted register.**

Same person, different room:

| Stakes | Register | Example |
|---|---|---|
| Low (welcome, success) | Light, warm, brief | "Welcome back. Your deploy succeeded." |
| Medium (config, settings) | Neutral, direct | "Environment variables set. Restart to apply." |
| High (billing, security) | Calm, precise, explicit | "This action will cancel your subscription at the end of the current period. You'll retain access until May 14, 2026." |
| Critical (data loss, irreversible) | Sober, no humor, clear path back | "This will permanently delete 1,247 records. Type the workspace name to confirm. This cannot be undone." |

One voice. Four rooms. Humor at critical stakes feels flippant; solemnity at welcome feels cold. Match the moment.

### Context

**9. STOP before writing.**

Every piece of microcopy runs through the STOP framework:

- **S — Situation.** Where is the user? What screen, what task, what just happened?
- **T — Tone.** What emotional state? Excited (just signed up)? Frustrated (error)? Neutral (routine task)?
- **O — Objective.** What do you want them to do next? If you can't articulate it, cut the copy.
- **P — Plain language.** Can a non-expert understand this? If not, simplify.

Copy written without STOP is generic by definition — even if the words are good.

**10. Persuasion without manipulation.**

Ethical persuasion respects autonomy. Manipulation exploits cognitive biases to make users do things they wouldn't choose with full information.

**Banned across all Gaia surfaces** (regardless of what competitors do):

| Pattern | Why banned |
|---|---|
| Fake urgency ("Only 2 left!" when infinite) | Lie |
| Fabricated scarcity ("Others are looking at this") | Lie |
| Forced social proof ("Join 10,000 founders!" when untrue) | Lie |
| Guilt-trip declines ("No thanks, I don't care about my code quality") | Coercive |
| Pre-checked consent ("☑ Sign me up for marketing") | Unfair default |
| Hidden costs revealed at checkout | Bait-and-switch |
| Roach motels (easy signup, impossible unsubscribe) | Coercion |
| Confirmshaming | Emotional manipulation |
| Countdown timers for "limited-time offers" that reset | Lie |
| "Are you sure you want to leave?" with guilt | Coercion |

**Allowed and encouraged:**

- Real urgency ("This deploy fails in 30 seconds" when true)
- Real scarcity ("Beta cohort is 50 people; 12 seats remain" when true)
- Real social proof (testimonials with real names and companies, with consent)
- Direct decline paths ("Not now" neutral-toned, same visual weight as accept)
- One-click unsubscribe
- Transparent pricing, all-in, before checkout
- Clear next action, clear escape, always

If you'd feel embarrassed explaining the copy aloud to the person it targets, it's manipulation. Cut it.

### Testing

**11. Voice is tested, not assumed.**

Three gates every piece of copy passes:

1. **The Indy Test** (see below) — would someone real say this naturally?
2. **The AI Slop Test** (see `design.md`) — does this read like AI wrote it?
3. **The Rubric** — below, 5 criteria scored 1-5

Voice drift is invisible until measured. Run the rubric monthly on a sample of shipped copy. Track the trend.

**12. Imperfection is the proof.**

Leave the rough edge. The "wait, actually..." The unfinished thought. The mid-paragraph tonal shift. These make the reader trust you more, not less.

AI writing is too clean. Humans contradict themselves, circle back, say "I'm not sure about this, but..." before a strong claim. That's not a flaw — it's the signal of a real person.

---

## Voice by channel

Same principles, different application. Register adjusts; voice stays constant.

### Microcopy (UI surfaces)

Buttons, labels, tooltips, form placeholders. The highest-leverage writing in the product.

**Rules:**

- Buttons are verb-first, concrete: "Deploy to production" not "Submit"
- Labels are nouns, no gerunds: "Email" not "Email Address" (unless ambiguous)
- Placeholders guide, don't replace labels
- Tooltip text is one sentence, max
- Error messages inline, next to the field
- Success confirmations disappear after 5-10s; never require a click to dismiss

**Examples:**

| Context | ❌ Generic | ✅ Gaia voice |
|---|---|---|
| Signup button | "Get Started" | "Clone Gaia" |
| Save action | "Submit" | "Save changes" |
| Delete confirmation | "Are you sure?" | "Delete workspace and 1,247 records?" |
| Empty search | "No results" | "Nothing matches 'foo' — check the spelling or widen your filter" |
| Loading | "Loading..." | "Fetching your projects — hang on" (or a skeleton) |
| 404 | "Page not found" | "We couldn't find that page. It may have been renamed or moved — here's how to find what you're looking for: [search] [sitemap] [home]" |

### Error messages

The three-part framework (matches `design.md`):

1. **What happened** — plain language, no codes as primary message
2. **Why** — cause in one line (no stack traces in user-facing UI)
3. **How to fix** — one specific action, or one escape path

**Error tone ladder:**

- **User error** (validation): neutral, helpful. "Password must be 12+ characters."
- **System transient** (network, timeout): reassuring, suggest retry. "Couldn't reach the server — check your connection and try again."
- **System permanent** (bug, outage): honest, escape path. "This feature is broken right now. We've logged it. Email us if urgent."
- **Permission denied**: clear about what's missing. "You need admin access to do this — ask your workspace owner."
- **Unrecoverable**: sober, preserve user data. "Something went wrong saving your changes. Your last successful save was at 2:41 PM. Copy the text below before you refresh."

**Never:**

- Humor for errors ("Oops! 🙈")
- Shame ("You did something wrong")
- Blame ambiguity ("An error occurred")
- Cryptic codes without explanation ("ERR_CONN_REFUSED_47")

### Empty states (coordinate with `ux.md`)

Empty is an onboarding moment, not a dead end.

**Pattern:**
- Short title, positively framed
- One-line explanation of what goes here
- Primary action

**Examples:**

- ❌ "No projects yet."
- ✅ "Your first project starts here. [Create project]"

- ❌ "No results found."
- ✅ "No matches for 'foo'. Try a different spelling or [clear filters]."

### Loading states

Loading copy honors feedback-loop principles from `design.md`:

- <100ms: no copy needed; UI just responds
- 100ms-1s: skeleton or subtle loading indicator, no text
- 1-3s: indeterminate spinner with brief label ("Saving...")
- 3-10s: progress indicator where possible, contextual message ("Running 47 tests — 12 done")
- 10s+: explicit progress + cancel option if possible

**Never:** fake progress bars. If you can't measure real progress, use an indeterminate spinner.

### Success messages

Confirmation without celebration bloat:

- ❌ "Congratulations! 🎉 You've successfully completed the action!"
- ✅ "Deployed. [View]"

One word of confirmation, one next action. Disappear after 5s unless the user interacts. Never require a click to dismiss a success toast.

### Onboarding copy

Onboarding is the first voice impression. Highest stakes.

**Rules:**

- One question up front (intent-based onboarding): "What are you here to do?"
- Each step has one objective, visible progress, ability to skip
- Never more than 5 steps before first value
- First success visible within 5 minutes

**Example first-run copy:**

```
Welcome. Before we scaffold your project — one question.

What are you building?
  [ ] A SaaS (auth + billing + dashboard)
  [ ] An internal tool (auth + data + minimal UI)
  [ ] Agent backend (API + skills + no UI yet)
  [ ] Just exploring

Based on this, Gaia will generate the right starter.
```

Direct. Specific. Respects time. Lists the real options. Ends with a clear next.

### Documentation

Voice applies to docs, not just marketing. Docs are conversations with future developers.

**Rules:**

- Second person ("you") not third ("the user")
- Present tense ("Gaia runs" not "Gaia will run")
- Active voice ("Deploy the app" not "The app can be deployed")
- Examples before explanations; rule after example
- Every code block runnable (or clearly marked "pseudocode")
- Headings state claims, not topics ("Why we chose Bun" beats "Bun")
- Decisions logged with date + rationale

**Example — good docs voice:**

> Gaia uses Bun instead of Node. You'll notice this immediately: `bun install` is roughly 20x faster than `npm install`. The tradeoff is ecosystem maturity — a handful of npm packages don't work with Bun yet, and you'll occasionally hit one. When you do, either (a) find an alternative, (b) report it to the package author, or (c) fall back to Node for that one workspace. We made this call in April 2026 (see ADR-0001). The 20x speed improvement compounds across every install, test, and CI run. That math wins.

Direct. Honest about tradeoffs. Opinionated. Dates the decision. Offers recovery paths.

### Marketing copy

Marketing is where voice is most tested — and where temptation to slip into hype is highest.

**Banned in marketing:**

- "Revolutionize" / "revolutionary"
- "Transformative" / "game-changing"
- "Cutting-edge" / "state-of-the-art" (unless literally true and proven)
- "Leverage" (as verb)
- "Synergy"
- "Streamline" (use the specific word)
- "Holistic approach"
- "Seamless" (it's almost never seamless)
- "Solution" as a stand-in for "product"
- "Unlock" (overused; use concrete action)
- "Reimagine"
- "Disrupt"

**Preferred:**

- Specific claims with numbers
- Concrete comparisons ("20x faster than npm install")
- Before/after framing with real examples
- What it does, what it doesn't do, who it's for, who it's not for
- Price up front

**Example landing page section:**

> **Ship in a weekend. Deploy in one command.**
>
> Gaia is an opinionated TypeScript template for solo founders who want to ship production SaaS without a team. Auth, billing, email, dashboard, API — wired and working the first time you run `bun install`.
>
> Built for Claude Code. The agent harness — skills, hooks, rules — ships with the template.
>
> Not for you if you're building a React Native app, a blog, or something that needs a 20-person team.
>
> MIT-licensed. Clone it. Use it. Ship it.

Specific. Honest about fit. Ends with a clear action.

### AI-generated content

The most sensitive channel. When Claude writes marketing, docs, or blog posts for Gaia:

**Rules:**

1. **Indy Test passes before publish.** Every time.
2. **AI Slop Test passes.** Check against the banned patterns in `design.md`.
3. **Human edits before ship.** Minimum: a human reads it end to end and makes at least three changes. If nothing's worth changing, the copy is too clean — add imperfection.
4. **Include the brand voice file in Claude's context.** Generic prompt → generic output.
5. **Iterate with feedback.** Save the edits; next generation uses them as examples.
6. **Never publish AI content that hasn't gone through a human filter.**

**When to use AI for content:**

- First drafts of docs, emails, blog posts
- Variations and A/B tests
- Summarization of longer content
- Translations (with native-speaker review)

**When not:**

- Sensitive announcements (bug disclosures, pricing changes, shutdowns)
- Anything with legal implications
- Messages to individual users (support replies, escalations)
- Final published versions without review

---

## Gaia's brand voice

Specific to this product — the voice that shows up in README, landing page, docs, and AI-generated content.

### Who Gaia talks to

Primary audience: **solo founders who've shipped before**, targeting one-person-unicorn ambitions. They:

- Know what they're doing but don't want to rebuild plumbing
- Value speed over perfection
- Have opinions and respect products with opinions
- Don't want to be sold to
- Can smell hype from a mile away

Secondary: **small teams (2-5) adopting agent-native workflows** who want conventions rather than invention.

### How Gaia sounds

**Four tone axes:**

| Axis | Gaia's position |
|---|---|
| Formal ←→ Casual | **Casual, but precise.** "Bun's 20x faster" not "Bun demonstrates significant performance improvements." |
| Serious ←→ Playful | **Serious, with occasional dry wit.** Not jokes-as-content. A one-line observation that's true and funny. |
| Matter-of-fact ←→ Enthusiastic | **Matter-of-fact.** The product speaks; no cheerleader needed. |
| Respectful ←→ Irreverent | **Respectful of the reader, irreverent toward incumbents.** "Another create-react-app clone" is fair game. "Our users" is not. |

### Voice patterns

**The "Ship it" pattern** — bias toward action, specific next step:

- "Clone Gaia. Run `bun install`. Deploy to Railway in 5 minutes."
- "Stop reading about agent-native stacks. Ship one this weekend."

**The "Not for you" pattern** — explicit anti-audience:

- "Not for you if you want a no-code tool."
- "Skip this if you love wrestling with webpack."

Anti-audience sentences build trust. They prove the product isn't trying to be everything.

**The "We chose this because" pattern** — every opinion has a reason:

- "We chose Elysia because TypeBox ends the validation-schema-drift problem."
- "We chose Neon over self-hosted Postgres because PR preview branches are worth more than provider control at your stage."

**The "Here's what we got wrong" pattern** — humility earns trust:

- "We shipped v0.5 with Prisma. That was a mistake. Here's what we learned and why we moved to Drizzle."

### Words we use

**The working vocabulary** — these show up naturally, not as buzzwords:

- *Ship, deploy, run, install, scaffold*
- *Agent, harness, skill, hook, token*
- *Opinionated, default, escape hatch*
- *Boundary, layer, surface*
- *Honest, specific, deliberate, restrained*
- *The one thing, the boring part, the hard part*

**Words we never use** (agents writing Gaia copy check against this list):

- *Revolutionize / revolutionary*
- *Transformative / game-changing*
- *Leverage* (as verb)
- *Synergy*
- *Holistic approach*
- *Seamless*
- *Solution* (as stand-in for "product")
- *Unlock* (use concrete action)
- *Reimagine / disrupt*
- *Mindful, intentional* (overused in tech)
- *Journey* (as euphemism for "process")
- *Empower, enable* (weak verbs)
- *Best-in-class, world-class* (without evidence)
- *Boss babe, slay, queen, level up* (wrong register)
- *Vibrations, manifestation, sacred* (wrong domain)

---

## The Indy Test (quality gate)

Before any copy ships — marketing, docs, microcopy, AI-generated, all of it — apply the Indy Test:

> *Would a real person say this to a friend at the kitchen table?*

Three failure modes:

- Sounds like a coach on Instagram → rewrite
- Sounds like a textbook or a consultant → rewrite
- Sounds like an AI hedging politely → rewrite

One success mode:

- Sounds like someone who just told you the truth and went back to what they were doing → ship

Named for the pattern from Indy's voice in the `human.md` source material, which has the rare quality of being simultaneously casual and honest without being performative.

---

## The AI Slop Test (verbal side)

Parallel to the visual AI Slop Test in `design.md`. Copy fails if it contains:

1. **Uniform paragraph length** throughout
2. **Hedged opinions** ("While X can be beneficial, Y may offer advantages in certain contexts")
3. **Announced transitions** ("Now let's explore...")
4. **Lists of 5+ identically-formatted items**
5. **Rhetorical questions with no sting** ("Have you ever wondered why...")
6. **Abstract claims without specifics** ("many users find value")
7. **Stock phrases** (see banned list above)
8. **Perfect structural symmetry** (intro → 3 points → conclusion, repeated)
9. **Both-sides-ing** everything to avoid taking a position
10. **Explaining the metaphor** after using it ("It's like X — that is, it functions similarly to X")
11. **Sentences over 30 words that could be two sentences**
12. **Passive voice as default** ("The feature is provided by the system")

Rejecting the test = at least three of these present. Rewrite.

---

## The voice rubric (measurement)

For tracking voice consistency over time. Score each dimension 1-5:

| Dimension | 1 (fail) | 3 (passes) | 5 (exemplary) |
|---|---|---|---|
| **Specificity** | Abstract, vague | Some concrete detail | Named numbers, real examples throughout |
| **Rhythm variation** | Uniform sentences | Some variation | Short + long mix, deliberate cadence |
| **Position-taking** | Hedged throughout | Takes some positions | Clear opinions with rationale |
| **Register match** | Wrong tone for stakes | Appropriate | Precisely calibrated to the moment |
| **Anti-manipulation** | Uses dark patterns | Clean | Actively transparent, offers real escape |

**Target:** average score ≥ 4 across sampled copy. Score < 3 triggers a rewrite. Monthly review of shipped copy.

---

## The Brunson Flow (for long-form content)

For blog posts, long docs, and marketing narratives — not microcopy.

**STORY → CONCEPT → EXAMPLES → BRIDGE**

1. **Story** — open with a real person in a real situation. Concept embedded, not named.
2. **Concept** — now name what the story demonstrated. "What happened here is called X."
3. **Examples** — 2-3 more applications of X, different contexts. Reader finds themselves in at least one.
4. **Bridge** — end with something unresolved. Open loop into the next piece.

The reader never processes a "lesson" — they process a story that happened to teach something. Concept sticks because it has an emotional address in memory, not just an intellectual one.

**When to use it:** long-form content (>500 words) where retention matters.

**When not:** microcopy, error messages, reference docs. Different jobs.

---

## Anti-patterns (never write these)

Summarized from all the above. Copy fails if it:

| Anti-pattern | Why | Fix |
|---|---|---|
| "It's important to understand that..." | Nobody talks like this | State the thing |
| "In this section..." | Announcement, not content | Start with content |
| "There are several key factors..." | Vague hedge | Name them, or tell a story that shows them |
| "This is a crucial/fundamental concept" | Telling, not showing | If crucial, the reader feels it |
| Uniform paragraph length | AI tell | Vary rhythm |
| Perfect intro→3-points→conclusion | Too clean | Surprise the reader |
| Both-sidesing every claim | AI safety bias | Take a position |
| Rhetorical questions with no sting | Filler | Real questions or delete |
| "Click here" links | Meaningless | Describe the destination |
| "Journey" as euphemism | Tech cliché | "Process", "path", or the specific word |
| Explaining metaphors | Insults reader | Trust them |
| Emoji in button labels | AI slop | 🚀 No |

---

## Writing with Claude (AI-assist patterns)

When you generate copy through Claude (or any LLM), patterns that work:

### Setup

Include in context:

1. This file (`voice.md`)
2. The relevant design file (`design.md` for microcopy, `ux.md` for flow copy)
3. 3-5 examples of already-shipped copy you're happy with
4. The specific audience (solo founder? SRE? CTO?)
5. The STOP context (situation, tone, objective, plain-language target)

### Prompt structure

- "Here's the voice: [attach voice.md]"
- "Here are examples of our voice in action: [3-5 examples]"
- "Write copy for [specific situation]. The user just [did X]. They're feeling [Y]. The next action we want is [Z]."
- "Check the output against these tests: Indy Test, AI Slop Test, the rubric."

### Iteration

- First generation is never final
- Ask Claude to self-critique against the Indy Test + AI Slop Test
- Edit manually; feed edits back as examples for next generation
- Track patterns — if Claude repeatedly makes the same mistake, update this file

### What not to prompt

- ❌ "Write a catchy headline" (generic, will produce slop)
- ❌ "Write marketing copy for our SaaS" (no context)
- ❌ "Make it more engaging" (vague)
- ✅ "Write a landing page hero for solo founders who've shipped before, in Gaia's voice (attached). The goal is they clone the repo. They're already considering — we don't need to convince them the category exists."

---

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-02 | Adopt the voice framework from `human.md` (Right Decision course) as Gaia's voice foundation | Proven voice system; Henry/Indy patterns already tested across long-form content. Adapts well to Gaia's solo-founder audience. |
| 2026-04-19 | Add "hard parts are where voice lives" as core principle | Most teams write happy-path tone and default everything else. Gaia differentiates on error messages, refusals, and uncertainty specifically. |
| 2026-04-19 | Explicit ban on dark patterns (fake urgency, guilt-trips, roach motels) | Legal risk (GDPR, FTC, EU DSA enforcement accelerating 2026). Long-term trust. Not just ethics — regulatory. |
| 2026-04-19 | Stakes-based register (4 levels) | Single "tone" fails across contexts. Calibrated register keeps voice consistent while serving different moments. |
| 2026-04-19 | The voice rubric (measured monthly) | Voice drift is invisible until quantified. Rubric makes drift visible and the response actionable. |
| 2026-04-19 | Banned word list | Specific enough to lint-check. Agents writing Gaia copy use the list; lint rule flags violations. |

---

## Cross-references

- Visual counterpart: `docs/reference/design.md` (Ethereal Warmth aesthetic)
- UX flows using this voice: `docs/reference/ux.md`
- Error message patterns: `docs/reference/errors.md` (technical), this file (human-facing)
- AI-assist patterns: `docs/reference/ax.md`
- Writing standards: Orwell's "Politics and the English Language", Strunk & White, Zinsser's *On Writing Well*

*Voice is code-reviewed. Changes that touch brand voice or banned-word list require an ADR.*
