export default {
  init ($, config) {
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
}
