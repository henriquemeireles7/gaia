const input = await Bun.stdin.json()
const file: string = input.tool_input?.file_path ?? input.tool_input?.path ?? ''

// CUSTOMIZE: Add your config files here
const configFiles = ['biome.json', 'tsconfig.json']

const basename = file.split('/').pop() ?? ''

if (configFiles.includes(basename)) {
  console.error(
    `Blocked: '${basename}' is a config file. Fix the code to match the config, not the other way around. If you must change the config, explain why.`,
  )
  process.exit(2)
}

process.exit(0)
