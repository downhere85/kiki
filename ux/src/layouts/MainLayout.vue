<template lang='pug'>
q-layout(view='hHh Lpr lff')
  header-nav
  q-drawer.bg-sidebar(
    :model-value='isSidebarShown'
    :show-if-above='siteStore.theme.sidebarPosition !== `off`'
    :width='isSidebarMini ? 44 : 240'
    :side='siteStore.theme.sidebarPosition === `right` ? `right` : `left`'
    )
    .sidebar-mini.column.items-stretch(v-if='isSidebarMini')
      q-btn.q-py-sm(
        flat
        icon='ph ph-globe'
        color='white'
        aria-label='Switch Locale'
        )
        locale-selector-menu(anchor='top right' self='top left')
        q-tooltip(anchor='center right' self='center left') Switch Locale
      q-btn.q-py-sm(
        flat
        icon='ph ph-tree-structure'
        color='white'
        aria-label='Browse'
        @click='browsePages'
        )
        q-tooltip(anchor='center right' self='center left') Browse
      q-separator.q-my-sm(inset, dark)
      q-btn.q-py-sm(
        flat
        icon='ph ph-bookmark'
        color='white'
        aria-label='Bookmarks'
        @click='openBookmarks'
        )
        q-tooltip(anchor='center right' self='center left') Bookmarks
      q-space
      q-btn.q-py-xs(
        v-if='userStore.can(`manage:navigation`) || userStore.can(`manage:system`)'
        flat
        icon='ph ph-gear-six'
        color='white'
        aria-label='Edit Nav'
        size='sm'
        )
        q-menu(
          ref='navEditMenuMini'
          anchor='top right'
          self='bottom left'
          )
          nav-edit-menu(
            :menu-hide-handler='navEditMenuMini.hide'
            :update-position-handler='navEditMenuMini.updatePosition'
            )
        q-tooltip(anchor='center right' self='center left') Edit Nav
    template(v-else)
      .sidebar-expanded.column.full-height
        .sidebar-actions.flex.no-wrap.items-stretch
          q-btn.q-px-sm.col(
            flat
            dense
            icon='ph ph-tree-structure'
            color='blue-7'
            text-color='custom-color'
            label='Browse'
            aria-label='Browse'
            size='sm'
            @click='browsePages'
            )
          q-separator(vertical)
          q-btn.q-px-sm.col(
            flat
            dense
            icon='ph ph-globe'
            color='blue-7'
            text-color='custom-color'
            :label='commonStore.locale'
            :aria-label='commonStore.locale'
            size='sm'
            )
            locale-selector-menu(:offset='[-5, 5]')
        .col.relative-position
          nav-sidebar.absolute.fit
        .sidebar-recent.flex-none(v-if='pageStore.recentPages.length > 0 && !editorStore.isActive')
          .sidebar-recent-header Recent
          q-list(dense)
            q-item.sidebar-recent-item(
              v-for='page of pageStore.recentPages'
              :key='page.id'
              clickable
              dense
              :to='`/${page.path}`'
              )
              q-item-section(side)
                q-icon(:name='page.icon || `ph ph-file-text`', size='xs', color='grey-5')
              q-item-section
                q-item-label.text-caption.text-white(lines='1', style='opacity: 0.8') {{ page.title }}
      q-bar.sidebar-footerbtns.text-white(
        v-if='userStore.can(`manage:navigation`) || userStore.can(`manage:system`)'
        dense
        )
        q-btn.col(
          icon='ph ph-gear-six'
          label='Edit Nav'
          flat
          )
          q-menu(
            ref='navEditMenu'
            anchor='top left'
            self='bottom left'
            :offset='[0, 10]'
            )
            nav-edit-menu(
              :menu-hide-handler='navEditMenu.hide'
              :update-position-handler='navEditMenu.updatePosition'
              )
        q-separator(vertical)
        q-btn.col(
          icon='ph ph-bookmark'
          label='Bookmarks'
          flat
          @click='openBookmarks'
        )
  q-page-container
    router-view
    q-page-scroller(
      position='bottom-right'
      :scroll-offset='150'
      :offset='[15, 15]'
      )
      q-btn(
        icon='ph ph-arrow-up'
        color='primary'
        round
        size='md'
      )
  main-overlay-dialog
  command-palette(v-model='state.showCommandPalette')
  footer-nav(v-if='!editorStore.isActive')
</template>

<script setup>
import { useMeta, useQuasar } from 'quasar'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useCommonStore } from '@/stores/common'
import { useEditorStore } from '@/stores/editor'
import { useFlagsStore } from '@/stores/flags'
import { usePageStore } from '@/stores/page'
import { useSiteStore } from '@/stores/site'
import { useUserStore } from '@/stores/user'

// COMPONENTS

import FooterNav from '@/components/FooterNav.vue'
import HeaderNav from '@/components/HeaderNav.vue'
import LocaleSelectorMenu from '@/components/LocaleSelectorMenu.vue'
import NavSidebar from '@/components/NavSidebar.vue'
import NavEditMenu from '@/components/NavEditMenu.vue'
import MainOverlayDialog from '@/components/MainOverlayDialog.vue'
import CommandPalette from '@/components/CommandPalette.vue'

// QUASAR

const $q = useQuasar()

// STORES

const commonStore = useCommonStore()
const editorStore = useEditorStore()
const flagsStore = useFlagsStore()
const pageStore = usePageStore()
const siteStore = useSiteStore()
const userStore = useUserStore()

// ROUTER

const router = useRouter()
const route = useRoute()

// I18N

const { t } = useI18n()

// META

useMeta({
  titleTemplate: title => `${title} - ${siteStore.title}`
})

// DATA

const state = reactive({
  showCommandPalette: false
})

// REFS

const navEditMenu = ref(null)
const navEditMenuMini = ref(null)

// COMPUTED

const isSidebarShown = computed(() => {
  return siteStore.showSideNav && !siteStore.sideNavIsDisabled && !(editorStore.isActive && editorStore.hideSideNav)
})

const isSidebarMini = computed(() => {
  return ['hide', 'hideExact'].includes(pageStore.navigationMode) || !pageStore.navigationId
})

// METHODS

function openBookmarks () {
  siteStore.$patch({ overlay: 'Bookmarks' })
}

function browsePages () {
  siteStore.$patch({ overlay: 'BrowsePages' })
}

function handleGlobalKeyDown (ev) {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'k') {
    ev.preventDefault()
    state.showCommandPalette = true
  }
}

onMounted(() => {
  if (!import.meta.env.SSR) {
    window.addEventListener('keydown', handleGlobalKeyDown)
  }
})

onBeforeUnmount(() => {
  if (!import.meta.env.SSR) {
    window.removeEventListener('keydown', handleGlobalKeyDown)
  }
})

</script>

<style lang="scss">
// Prevent native scrollbar on drawer content — only q-scroll-area should scroll
.q-drawer__content {
  overflow: hidden !important;
}

.sidebar-actions {
  background: linear-gradient(to bottom, rgba(255,255,255,.1) 0%, rgba(0,0,0, .05) 100%);
  border-bottom: 1px solid rgba(0,0,0,.2);
  height: 38px;
  flex-shrink: 0;
  overflow: hidden;

  .q-btn {
    color: rgba(255,255,255,.8);
    min-width: 0;
    overflow: hidden;
    flex-basis: 0;
  }
}

.sidebar-mini {
  height: 100%;
}

.sidebar-expanded {
  overflow: hidden;
}

.sidebar-footerbtns {
  background-color: rgba(255,255,255,.1);
  flex-shrink: 0;
}

.sidebar-recent {
  padding: 8px 0 4px;
  border-top: 1px solid rgba(255,255,255,.1);
  flex-shrink: 0;
  overflow: hidden;

  &-header {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: rgba(255,255,255,.4);
    padding: 0 12px 4px;
  }

  &-item {
    padding: 2px 8px;
    min-height: 28px;
    border-radius: 4px;
    margin: 0 4px;

    &:hover {
      background-color: rgba(255,255,255,.1);
    }
  }
}

body.body--dark {
  background-color: $dark-6;
}

.main-overlay {
  > .q-dialog__backdrop {
    background-color: rgba(0,0,0,.6);
    backdrop-filter: blur(5px) saturate(180%);
  }
  > .q-dialog__inner {
    padding: 24px 64px;

    @media (max-width: $breakpoint-sm-max) {
      padding: 0;
    }

    > .q-layout-container {
      border-radius: 6px;
      box-shadow: 0 0 30px 0 rgba(0,0,0,.3);

      @at-root .body--light & {
        background-image: linear-gradient(to bottom, $dark-5 10px, $grey-3 11px, $grey-4);
      }
      @at-root .body--dark & {
        background-image: linear-gradient(to bottom, $dark-4 10px, $dark-4 11px, $dark-3);
      }
    }
  }
}

.q-footer {
  .q-bar {
    @at-root .body--light & {
      background-color: $grey-3;
      color: $grey-7;
    }
    @at-root .body--dark & {
      background-color: $dark-4;
      color: rgba(255,255,255,.3);
    }
  }
}

.syncing-enter-active {
  animation: syncing-anim .1s;
}
.syncing-leave-active {
  animation: syncing-anim 1s reverse;
}
@keyframes syncing-anim {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
