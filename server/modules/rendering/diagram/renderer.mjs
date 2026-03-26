export async function render ($, config) {
  $(`pre.diagram`).each((idx, elm) => {
    $(elm).children('svg').each((sidx, svg) => {
      $(svg).removeAttr('content')
    })
    $(elm).replaceWith($(`<div class="diagram">${$(elm).html()}</div>`))
  })
}
