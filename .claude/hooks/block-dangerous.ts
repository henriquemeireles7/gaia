const input = await Bun.stdin.json()
const cmd: string = input.tool_input?.command ?? ''

const dangerousPatterns = [
  { pattern: /rm\s+-rf/i, name: 'rm -rf' },
  { pattern: /git\s+reset\s+--hard/i, name: 'git reset --hard' },
  { pattern: /git\s+push.*--force/i, name: 'git push --force' },
  { pattern: /git\s+clean\s+-f/i, name: 'git clean -f' },
  { pattern: /DROP\s+TABLE/i, name: 'DROP TABLE' },
  { pattern: /DROP\s+DATABASE/i, name: 'DROP DATABASE' },
  { pattern: /TRUNCATE/i, name: 'TRUNCATE' },
  { pattern: /curl.*\|.*sh/i, name: 'curl | sh' },
  { pattern: /wget.*\|.*bash/i, name: 'wget | bash' },
]

for (const { pattern, name } of dangerousPatterns) {
  if (pattern.test(cmd)) {
    console.error(
      `Blocked: '${cmd}' matches dangerous pattern '${name}'. Propose a safer alternative.`,
    )
    process.exit(2)
  }
}

process.exit(0)
