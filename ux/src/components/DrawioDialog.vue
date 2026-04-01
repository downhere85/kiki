<template lang="pug">
q-dialog(ref='dialogRef', @hide='onDialogHide', maximized, persistent)
  q-card.column
    q-bar.bg-primary.text-white
      q-icon(name='mdi-drawing')
      span.q-ml-sm Draw.io Diagram Editor
      q-space
      q-btn(
        flat
        dense
        icon='ph ph-check'
        label='Insert'
        @click='insertDiagram'
        :disable='!state.diagramData'
        )
      q-btn(
        flat
        dense
        icon='ph ph-x'
        @click='onDialogCancel'
        )
    q-card-section.col.q-pa-none
      iframe.drawio-frame(
        ref='drawioFrame'
        :src='drawioUrl'
        frameborder='0'
        style='width: 100%; height: 100%;'
        )
</template>

<script setup>
import { useDialogPluginComponent } from 'quasar'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

// DIALOG

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

// PROPS

const props = defineProps({
  existingData: {
    type: String,
    default: ''
  }
})

// EMITS

defineEmits([...useDialogPluginComponent.emits])

// DATA

const drawioFrame = ref(null)
const state = reactive({
  diagramData: '',
  diagramSvg: ''
})

// COMPUTED

const drawioUrl = computed(() => {
  const params = new URLSearchParams({
    embed: 1,
    ui: 'min',
    spin: 1,
    proto: 'json',
    configure: 1
  })
  return `https://embed.diagrams.net/?${params.toString()}`
})

// METHODS

function handleMessage (evt) {
  if (!evt.data || typeof evt.data !== 'string') return
  try {
    const msg = JSON.parse(evt.data)
    if (msg.event === 'configure') {
      // Send configuration to draw.io
      drawioFrame.value?.contentWindow?.postMessage(JSON.stringify({
        action: 'configure',
        config: { defaultFonts: ['Helvetica', 'Verdana', 'Times New Roman', 'Garamond', 'Courier New'] }
      }), '*')
    } else if (msg.event === 'init') {
      // Editor is ready, load existing data if any
      if (props.existingData) {
        drawioFrame.value?.contentWindow?.postMessage(JSON.stringify({
          action: 'load',
          xml: props.existingData
        }), '*')
      }
    } else if (msg.event === 'save') {
      // User clicked save in draw.io
      state.diagramData = msg.xml
      // Request SVG export
      drawioFrame.value?.contentWindow?.postMessage(JSON.stringify({
        action: 'export',
        format: 'svg'
      }), '*')
    } else if (msg.event === 'export') {
      // Received exported SVG
      state.diagramSvg = msg.data
    } else if (msg.event === 'exit') {
      // User clicked exit
      onDialogCancel()
    }
  } catch {
    // Not a draw.io message, ignore
  }
}

function insertDiagram () {
  // Request final SVG export before inserting
  drawioFrame.value?.contentWindow?.postMessage(JSON.stringify({
    action: 'export',
    format: 'svg',
    spinKey: 'insert'
  }), '*')

  // Wait briefly for the export, then return whatever we have
  setTimeout(() => {
    onDialogOK({
      xml: state.diagramData,
      svg: state.diagramSvg
    })
  }, 500)
}

// LIFECYCLE

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<style lang="scss">
.drawio-frame {
  border: none;
}
</style>
