/**
 * markdown-it plugin for wikilinks: [[path]] and [[path|display text]]
 *
 * Converts [[some/page]] to <a href="/some/page" class="is-internal-link is-wiki-link">page</a>
 * Converts [[some/page|My Label]] to <a href="/some/page" class="is-internal-link is-wiki-link">My Label</a>
 *
 * The is-internal-link class hooks into the existing core renderer for
 * link validation (is-valid-page / is-invalid-page) and pageLinks sync.
 */

function wikilinkRule (state, silent) {
  const src = state.src
  const pos = state.pos
  const max = state.posMax

  // Quick check: must start with [[
  if (pos + 3 >= max) return false
  if (src.charCodeAt(pos) !== 0x5B /* [ */ || src.charCodeAt(pos + 1) !== 0x5B /* [ */) return false

  // Scan for closing ]]
  let end = pos + 2
  let found = false
  while (end < max - 1) {
    if (src.charCodeAt(end) === 0x5D /* ] */ && src.charCodeAt(end + 1) === 0x5D /* ] */) {
      found = true
      break
    }
    // No newlines inside wikilinks
    if (src.charCodeAt(end) === 0x0A /* \n */) break
    end++
  }

  // Closing ]] not found — emit first [ as text to advance past it
  if (!found) {
    if (!silent) {
      const token = state.push('text', '', 0)
      token.content = '['
      state.pos = pos + 1
    }
    return !silent
  }

  const content = src.slice(pos + 2, end).trim()
  if (content.length === 0) return false

  if (silent) return true

  // Split on first | for display text
  const pipeIdx = content.indexOf('|')
  let path, text
  if (pipeIdx >= 0) {
    path = content.slice(0, pipeIdx).trim()
    text = content.slice(pipeIdx + 1).trim()
  } else {
    path = content
    // Default display: last segment of path, replace hyphens with spaces, title case
    const lastSegment = path.split('/').pop()
    text = lastSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  if (path.length === 0) return false

  const token = state.push('wikilink', '', 0)
  token.meta = { path, text }
  token.markup = '[['

  state.pos = end + 2
  return true
}

export default function wikilinkPlugin (md) {
  md.inline.ruler.after('escape', 'wikilink', wikilinkRule)

  md.renderer.rules.wikilink = (tokens, idx) => {
    const { path, text } = tokens[idx].meta
    const href = '/' + path.replace(/^\//, '')
    const safeText = md.utils.escapeHtml(text)
    const safePath = md.utils.escapeHtml(href)
    return `<a href="${safePath}" class="is-internal-link is-wiki-link">${safeText}</a>`
  }
}
