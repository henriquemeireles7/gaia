import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface FileInfo {
  name: string
  exports: string[]
}

export interface DirectoryAnalysis {
  files: FileInfo[]
  deps: string[]
  generatedAt: string
}

const EXPORT_RE = /export\s+(?:const|function|class|type|interface|enum|async function)\s+(\w+)/g
const EXPORT_DEFAULT_RE = /export\s+default\s/
const IMPORT_RE = /from\s+['"]@\/(.*?)['"]/g
const MD_HEADING_RE = /^#\s+(.+)$/m

export function analyzeDirectory(dirPath: string): DirectoryAnalysis {
  if (!existsSync(dirPath)) {
    return { files: [], deps: [], generatedAt: new Date().toISOString() }
  }

  const entries = readdirSync(dirPath, { withFileTypes: true })
  const files: FileInfo[] = []
  const depsSet = new Set<string>()

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (entry.name === 'CLAUDE.md') continue

    const ext = entry.name.split('.').pop() ?? ''
    const isCode = ['ts', 'tsx', 'js', 'jsx'].includes(ext)
    const isTest = /\.test\.(ts|tsx|js|jsx)$/.test(entry.name)
    const isMd = ext === 'md'
    const isMdx = ext === 'mdx'

    if (!isCode && !isMd && !isMdx) continue
    if (isTest) continue

    const filePath = join(dirPath, entry.name)
    const content = readFileSync(filePath, 'utf-8')
    const exports: string[] = []

    if (isCode) {
      // Scan exports
      for (const match of content.matchAll(EXPORT_RE)) {
        if (match[1]) exports.push(match[1])
      }
      if (EXPORT_DEFAULT_RE.test(content)) {
        exports.push('default')
      }

      // Scan internal dependencies
      for (const match of content.matchAll(IMPORT_RE)) {
        if (match[1]) {
          const depPath = match[1].split('/').slice(0, 2).join('/')
          depsSet.add(depPath)
        }
      }
    } else if (isMd || isMdx) {
      // For markdown, extract first heading as description
      const headingMatch = content.match(MD_HEADING_RE)
      if (headingMatch?.[1]) {
        exports.push(headingMatch[1])
      }
    }

    files.push({ name: entry.name, exports })
  }

  // Sort files alphabetically
  files.sort((a, b) => a.name.localeCompare(b.name))

  return {
    files,
    deps: [...depsSet].sort(),
    generatedAt: new Date().toISOString(),
  }
}
