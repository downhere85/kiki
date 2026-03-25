/**
 * Knex-backed store for express-rate-limit.
 * Replaces the deprecated express-brute + brute-knex setup.
 */

const TABLE_NAME = 'ratelimit'

export default class KnexRateLimitStore {
  constructor ({ knex, createTable = true }) {
    this.knex = knex
    this.windowMs = 60000

    if (createTable) {
      this.ready = this.knex.schema.hasTable(TABLE_NAME).then((exists) => {
        if (exists) return
        return this.knex.schema.createTable(TABLE_NAME, (table) => {
          table.string('key').primary()
          table.integer('hits').defaultTo(0)
          table.bigInteger('expires_at')
        })
      })
    } else {
      this.ready = Promise.resolve()
    }
  }

  /**
   * Called by express-rate-limit to pass configuration.
   */
  init (options) {
    this.windowMs = options.windowMs
  }

  /**
   * Increment the hit counter for a given key.
   * Returns { totalHits, resetTime }
   */
  async increment (key) {
    await this.ready
    const now = Date.now()
    const expiresAt = now + this.windowMs

    const result = await this.knex.transaction(async (trx) => {
      const row = await trx(TABLE_NAME)
        .select('*')
        .where('key', key)
        .forUpdate()
        .first()

      if (!row || row.expires_at < now) {
        // Expired or new — upsert with 1 hit
        if (row) {
          await trx(TABLE_NAME).where('key', key).update({
            hits: 1,
            expires_at: expiresAt
          })
        } else {
          await trx(TABLE_NAME).insert({
            key,
            hits: 1,
            expires_at: expiresAt
          })
        }
        return { totalHits: 1, resetTime: new Date(expiresAt) }
      }

      // Active window — increment
      await trx(TABLE_NAME).where('key', key).increment('hits', 1)
      return { totalHits: row.hits + 1, resetTime: new Date(row.expires_at) }
    })

    return result
  }

  /**
   * Decrement the hit counter for a given key.
   */
  async decrement (key) {
    await this.ready
    await this.knex(TABLE_NAME)
      .where('key', key)
      .where('hits', '>', 0)
      .decrement('hits', 1)
  }

  /**
   * Reset (delete) the counter for a given key.
   */
  async resetKey (key) {
    await this.ready
    await this.knex(TABLE_NAME).where('key', key).del()
  }
}
