import { spawnSync } from 'node:child_process'

const input = await Bun.stdin.json()

if (input.stop_hook_active) {
  process.exit(0)
}

spawnSync(
  'osascript',
  ['-e', 'display notification "Task completed" with title "Claude Code" sound name "Glass"'],
  {
    stdio: 'ignore',
  },
)

process.exit(0)
