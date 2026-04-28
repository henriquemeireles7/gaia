import { spawnSync } from 'node:child_process'

const input = await Bun.stdin.json()
const file: string = input.tool_input?.file_path ?? ''

if (!/\.(ts|tsx|js|jsx)$/.test(file)) {
  process.exit(0)
}

// Skip test files
if (/\.test\.(ts|tsx|js|jsx)$/.test(file)) {
  process.exit(0)
}

const result = spawnSync('rg', ['-n', 'console\\.(log|debug|info)', file], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

const output = result.stdout?.toString().trim()
if (output) {
  const count = output.split('\n').length
  console.log(
    `Warning: ${count} console.log statement(s) found in ${file.split('/').pop()}. Remove before shipping.`,
  )
}

process.exit(0)
