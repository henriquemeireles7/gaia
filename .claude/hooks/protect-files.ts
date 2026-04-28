const input = await Bun.stdin.json()
const file: string = input.tool_input?.file_path ?? input.tool_input?.path ?? ''

const protectedPatterns = [
  { pattern: /\.env(?!\.example)/, name: '.env files' },
  { pattern: /\.git\//, name: '.git directory' },
  { pattern: /bun\.lock/, name: 'bun.lock' },
  { pattern: /\.pem$/, name: 'PEM certificates' },
  { pattern: /\.key$/, name: 'private keys' },
  { pattern: /secrets\//, name: 'secrets directory' },
]

for (const { pattern, name } of protectedPatterns) {
  if (pattern.test(file)) {
    console.error(`Blocked: '${file}' is protected (${name}). Explain why this edit is necessary.`)
    process.exit(2)
  }
}

process.exit(0)
