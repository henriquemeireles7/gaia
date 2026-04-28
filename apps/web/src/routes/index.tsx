import { A } from '@solidjs/router'

export default function Home() {
  return (
    <main>
      <h1>Gaia</h1>
      <p>Open-source SaaS template for the agent-native era.</p>
      <p>Idea to deployment in minutes — not weeks.</p>

      <nav>
        <A href="/login">Log in</A> · <A href="/signup">Sign up</A> ·{' '}
        <A href="/dashboard">Dashboard</A>
      </nav>
    </main>
  )
}
