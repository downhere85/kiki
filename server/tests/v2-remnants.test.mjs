import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { globSync } from 'glob'

const SERVER_DIR = join(import.meta.dirname, '..')

describe('v2 Remnant Detection', () => {
  const serverFiles = globSync('**/*.{mjs,js}', {
    cwd: SERVER_DIR,
    ignore: ['node_modules/**', 'tests/**']
  })

  it('should not reference isPublished column in model/resolver code', () => {
    const violations = []
    for (const file of serverFiles) {
      const content = readFileSync(join(SERVER_DIR, file), 'utf-8')
      // Skip commented lines and strings
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('//') || line.startsWith('*')) continue
        if (/\bisPublished\b/.test(line) && !line.includes('TODO')) {
          violations.push(`${file}:${i + 1}: ${line.substring(0, 80)}`)
        }
      }
    }
    expect(violations, `Found isPublished references:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('should not reference editorKey (renamed to editor)', () => {
    const violations = []
    for (const file of serverFiles) {
      const content = readFileSync(join(SERVER_DIR, file), 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('//') || line.startsWith('*')) continue
        if (/\beditorKey\b/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.substring(0, 80)}`)
        }
      }
    }
    expect(violations, `Found editorKey references:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('should not reference localeCode (renamed to locale)', () => {
    const violations = []
    // Only check models, resolvers, and storage modules (not auth modules which may be v2)
    const checkFiles = serverFiles.filter(f =>
      f.startsWith('models/') || f.startsWith('graph/') || f.startsWith('modules/storage/')
    )
    for (const file of checkFiles) {
      const content = readFileSync(join(SERVER_DIR, file), 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('//') || line.startsWith('*')) continue
        if (/\blocaleCode\b/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.substring(0, 80)}`)
        }
      }
    }
    expect(violations, `Found localeCode references:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
