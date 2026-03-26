/**
 * Mermaid diagram post-processor.
 * Converts mermaid code blocks into <pre class="mermaid"> elements
 * that the mermaid.js frontend library will render as SVG diagrams.
 *
 * @param {CheerioAPI} $ - Cheerio instance with page HTML loaded
 * @param {Object} config - Renderer configuration
 */
export async function render ($, config) {
  // Match the output format from the markdown renderer:
  // <pre class="codeblock-mermaid"><code>...</code></pre>
  $('pre.codeblock-mermaid').each((i, elm) => {
    const codeElm = $(elm).children('code').first()
    const mermaidContent = codeElm.length ? codeElm.html() : $(elm).html()
    $(elm).replaceWith(`<pre class="mermaid">${mermaidContent}</pre>`)
  })

  // Also handle legacy format from older versions:
  // <pre class="prismjs"><code class="language-mermaid">...</code></pre>
  $('pre.prismjs > code.language-mermaid').each((i, elm) => {
    const mermaidContent = $(elm).html()
    $(elm).parent().replaceWith(`<pre class="mermaid">${mermaidContent}</pre>`)
  })
}
