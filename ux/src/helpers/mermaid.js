/**
 * Mermaid diagram rendering helper.
 * Dynamically loads mermaid.js and renders all .mermaid elements on the page.
 */

let mermaidInstance = null
let initPromise = null

/**
 * Lazily load and initialize mermaid.
 * Only loads the library once, reuses across calls.
 */
async function ensureMermaid () {
  if (mermaidInstance) return mermaidInstance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      startOnLoad: false,
      theme: document.body.classList.contains('body--dark') ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    })
    mermaidInstance = mermaid
    return mermaid
  })()

  return initPromise
}

/**
 * Render all mermaid diagrams within a container element.
 * Call this after page content is rendered via v-html.
 *
 * @param {HTMLElement} container - The DOM element containing .mermaid elements
 */
export async function renderMermaidDiagrams (container) {
  if (!container) return

  const elements = container.querySelectorAll('pre.mermaid, div.mermaid')
  if (elements.length === 0) return

  try {
    const mermaid = await ensureMermaid()

    // Update theme based on current dark mode state
    const isDark = document.body.classList.contains('body--dark')
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    })

    await mermaid.run({
      nodes: elements,
      suppressErrors: true
    })
  } catch (err) {
    console.warn('Mermaid rendering failed:', err.message)
  }
}
