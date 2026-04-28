import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeDirectory, type DirectoryAnalysis } from './analyze-directory'

const MARKER = '<!-- AUTO-GENERATED BELOW — do not edit manually -->'

function renderFooter(analysis: DirectoryAnalysis): string {
  const lines: string[] = []

  lines.push('')
  lines.push('## Files')

  if (analysis.files.length === 0) {
    lines.push('No source files.')
  } else {
    lines.push('| File | Exports |')
    lines.push('|------|---------|')
    for (const file of analysis.files) {
      const exports = file.exports.length > 0 ? file.exports.join(', ') : '—'
      lines.push(`| ${file.name} | ${exports} |`)
    }
  }

  if (analysis.deps.length > 0) {
    lines.push('')
    lines.push('## Internal Dependencies')
    for (const dep of analysis.deps) {
      lines.push(`- ${dep}`)
    }
  }

  lines.push('')
  lines.push(`<!-- Generated: ${analysis.generatedAt} -->`)

  return lines.join('\n')
}

export function updateClaudeMd(dirPath: string): boolean {
  const claudeMdPath = join(dirPath, 'CLAUDE.md')

  if (!existsSync(claudeMdPath)) {
    return false
  }

  const content = readFileSync(claudeMdPath, 'utf-8')
  const analysis = analyzeDirectory(dirPath)
  const footer = renderFooter(analysis)

  const markerIndex = content.indexOf(MARKER)

  let newContent: string
  if (markerIndex !== -1) {
    // Preserve everything above the marker
    const header = content.substring(0, markerIndex + MARKER.length)
    newContent = `${header}\n${footer}\n`
  } else {
    // No marker — append it
    const trimmed = content.trimEnd()
    newContent = `${trimmed}\n\n---\n${MARKER}\n${footer}\n`
  }

  writeFileSync(claudeMdPath, newContent)
  return true
}
