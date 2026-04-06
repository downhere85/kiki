/**
 * markdown-it plugin for YouTube embeds.
 *
 * Detects bare YouTube URLs on their own line and renders them as
 * responsive embedded iframes.
 *
 * Supported URL formats:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://youtube.com/watch?v=VIDEO_ID
 *   (with optional timestamps, playlists, etc.)
 */

const YT_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)(?:[&?]t=(\d+))?(?:\S*)$/

function extractVideoId (url) {
  const match = url.trim().match(YT_REGEX)
  if (!match) return null
  return { id: match[1], start: match[2] || null }
}

export default function youtubePlugin (md) {
  // Override paragraph rendering to detect YouTube URLs
  const defaultParagraphOpen = md.renderer.rules.paragraph_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  const defaultParagraphClose = md.renderer.rules.paragraph_close || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }

  md.core.ruler.push('youtube_embed', (state) => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'inline') continue
      if (!tokens[i].children || tokens[i].children.length === 0) continue

      // Check if this inline token contains only a bare URL.
      // After inline parsing, try both the raw content and the children text.
      let content = tokens[i].content.trim()

      // If linkify has already processed the children, extract the URL from link tokens
      if (!extractVideoId(content) && tokens[i].children.length >= 1) {
        // Look for a single link or text child that is a YouTube URL
        const textParts = tokens[i].children
          .filter(t => t.type === 'text' || t.type === 'link_open')
          .map(t => t.type === 'link_open' ? (t.attrs?.find(a => a[0] === 'href')?.[1] || '') : t.content)
          .filter(Boolean)
        if (textParts.length === 1) {
          content = textParts[0].trim()
        }
      }

      const video = extractVideoId(content)
      if (!video) continue

      // Verify this is a paragraph with only this content (not mixed with other text)
      if (i < 1 || tokens[i - 1].type !== 'paragraph_open') continue
      if (i + 1 >= tokens.length || tokens[i + 1].type !== 'paragraph_close') continue

      // Replace the three tokens (p_open, inline, p_close) with a youtube_embed token
      const embedToken = new state.Token('youtube_embed', '', 0)
      embedToken.meta = video
      embedToken.content = content
      tokens.splice(i - 1, 3, embedToken)
      i-- // adjust index after splice
    }
  })

  md.renderer.rules.youtube_embed = (tokens, idx) => {
    const { id, start } = tokens[idx].meta
    const url = tokens[idx].content
    const startParam = start ? `?start=${start}` : ''
    return `<div class="youtube-embed"><iframe src="https://www.youtube-nocookie.com/embed/${md.utils.escapeHtml(id)}${startParam}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe><a class="youtube-embed-link" href="${md.utils.escapeHtml(url)}" target="_blank" rel="noopener">${md.utils.escapeHtml(url)}</a></div>`
  }
}
