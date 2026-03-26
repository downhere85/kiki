/**
 * Mermaid diagram rendering helper.
 * Dynamically loads mermaid.js and renders all .mermaid elements on the page.
 * Wraps large diagrams in a collapsible container.
 */

let mermaidInstance = null
let initPromise = null

const COLLAPSED_HEIGHT = 350 // px — max height before collapsing

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
 * Wrap a diagram element in a collapsible container if it's tall.
 */
function wrapInCollapsible (el) {
  // Skip if already wrapped
  if (el.parentElement?.classList?.contains('mermaid-collapsible')) return

  // Wait a frame for the SVG to have dimensions
  requestAnimationFrame(() => {
    const svg = el.querySelector('svg')
    if (!svg) return

    const svgHeight = svg.getBoundingClientRect().height
    if (svgHeight <= COLLAPSED_HEIGHT) return // Small enough, no need to collapse

    // Create wrapper
    const wrapper = document.createElement('div')
    wrapper.className = 'mermaid-collapsible'
    wrapper.dataset.expanded = 'false'

    // Create inner container
    const inner = document.createElement('div')
    inner.className = 'mermaid-collapsible-inner'
    inner.style.maxHeight = COLLAPSED_HEIGHT + 'px'

    // Create expand button
    const btn = document.createElement('button')
    btn.className = 'mermaid-expand-btn'
    btn.innerHTML = '<span>Click to expand diagram</span>'
    btn.addEventListener('click', () => {
      const isExpanded = wrapper.dataset.expanded === 'true'
      if (isExpanded) {
        inner.style.maxHeight = COLLAPSED_HEIGHT + 'px'
        wrapper.dataset.expanded = 'false'
        btn.innerHTML = '<span>Click to expand diagram</span>'
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else {
        inner.style.maxHeight = svgHeight + 40 + 'px'
        wrapper.dataset.expanded = 'true'
        btn.innerHTML = '<span>Click to collapse diagram</span>'
      }
    })

    // Wrap the element
    el.parentNode.insertBefore(wrapper, el)
    wrapper.appendChild(inner)
    inner.appendChild(el)
    wrapper.appendChild(btn)
  })
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

    // After rendering, wrap large diagrams in collapsible containers
    elements.forEach(el => wrapInCollapsible(el))
  } catch (err) {
    console.warn('Mermaid rendering failed:', err.message)
  }
}
