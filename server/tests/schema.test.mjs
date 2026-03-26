import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildSchema, parse } from 'graphql'

const SCHEMAS_DIR = join(import.meta.dirname, '..', 'graph', 'schemas')

describe('GraphQL Schemas', () => {
  const schemaFiles = readdirSync(SCHEMAS_DIR).filter(f => f.endsWith('.graphql'))

  it('should have schema files', () => {
    expect(schemaFiles.length).toBeGreaterThan(0)
  })

  for (const file of schemaFiles) {
    it(`${file} should parse without errors`, () => {
      const content = readFileSync(join(SCHEMAS_DIR, file), 'utf-8')
      expect(() => parse(content)).not.toThrow()
    })
  }

  it('should not contain any Int type for ID fields', () => {
    const idFieldPattern = /\b(id|pageId|userId|authorId|creatorId|ownerId|siteId|groupId|versionId|replyTo)\s*:\s*Int/g
    for (const file of schemaFiles) {
      const content = readFileSync(join(SCHEMAS_DIR, file), 'utf-8')
      const matches = content.match(idFieldPattern)
      expect(matches, `${file} has Int type for ID fields: ${matches}`).toBeNull()
    }
  })

  it('should not reference isPublished or isPrivate columns', () => {
    const v2Pattern = /\bisPublished\b|\bisPrivate\b|\bprivateNS\b/g
    for (const file of schemaFiles) {
      const content = readFileSync(join(SCHEMAS_DIR, file), 'utf-8')
      const matches = content.match(v2Pattern)
      expect(matches, `${file} has v2 column references: ${matches}`).toBeNull()
    }
  })
})
