// .claude/hooks/protect-config.ts
// Single-source policy: blocked paths come from .gaia/rules.ts
// (rule id `security/protect-config`). Vision §H9 — one policy, many
// surfaces. To change what's protected, edit rules.ts; this hook
// follows.

import { blockedFor } from '../../.gaia/rules'

const input = (await Bun.stdin.json()) as {
  tool_input?: { file_path?: string; path?: string }
}
const file: string = input.tool_input?.file_path ?? input.tool_input?.path ?? ''

const blocked = blockedFor('security/protect-config')
const basename = file.split('/').pop() ?? ''

if (blocked.includes(basename)) {
  console.error(
    `Blocked: '${basename}' is a config file (rule security/protect-config).`,
    `\nFix the code to match the config, not the other way around.`,
    `\nIf you must change the config, explain why and edit .gaia/rules.ts to remove the protection.`,
  )
  process.exit(2)
}

process.exit(0)
