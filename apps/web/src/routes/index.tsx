import { A } from '@solidjs/router'
import { Button, Card } from '../components'
import '../styles/landing.css'

// First-run mock landing page. Every line is recognizably placeholder so
// you delete with confidence and replace with your real product story.
//
// Replace this file (`apps/web/src/routes/index.tsx`) once you know what
// your app actually does. /w-launch in Claude Code will rewrite it for
// you in a 5-minute interview.

export default function Home() {
  return (
    <main class="landing">
      <section class="landing-hero">
        <div class="landing-hero-text">
          <h1 class="landing-eyebrow">🎭 Mock mode</h1>
          <p class="landing-headline">
            This is a <em>promise</em>.
          </p>
          <p class="landing-sub">
            It says your visitor is going to do something they couldn't do before — and that you'll
            be the one who makes it happen. Replace this paragraph with your real promise once you
            know what it is. Until then, this app boots, the buttons work, and the agent harness is
            ready.
          </p>
          <div class="landing-cta">
            <A href="/signup">
              <Button variant="primary">Sign up — but actually, edit me first</Button>
            </A>
            <A href="/login">
              <Button variant="ghost">Log in</Button>
            </A>
          </div>
        </div>
      </section>

      <section class="landing-pillars">
        <Card header="This is an even bigger promise.">
          The first thing your app does for a user. Replace this card with your actual feature.
          Founders feel obligated to write three of these. So do you. Add real ones; remove mine.
        </Card>
        <Card header="And another one.">
          The second thing your app does. Maybe it's "we send the right email at the right time."
          Maybe it's "we charge for the part competitors give away." You decide.
        </Card>
        <Card header="The third one.">
          Three is the number of pillars founders ship. It's tradition. Replace me with the third
          thing your app actually does — or delete this card if your story is clearer with two.
        </Card>
      </section>

      <section class="landing-pillars">
        <Card header="Pricing — soon">
          $0 / month — everything you'd give away to learn what users want.
        </Card>
        <Card header="$wedge / month">
          The smallest amount someone would pay you to keep doing this. Wire it via Polar (already
          imported in <code>packages/adapters/payments.ts</code>) when you go live.
        </Card>
        <Card header="$serious / month">
          What real customers pay for the version that solves their hair-on-fire problem. Don't
          publish a price until you know it's real.
        </Card>
      </section>

      <footer class="landing-footer">
        <span>
          🎭 You're in mock mode. The DB, AI, payments, and email all run as in-process fakes. Your
          real app starts when you replace this file and run <code>bun gaia live</code>.
        </span>
        <a href="https://github.com/henriquemeireles7/gaia">github.com/henriquemeireles7/gaia</a>
      </footer>
    </main>
  )
}
