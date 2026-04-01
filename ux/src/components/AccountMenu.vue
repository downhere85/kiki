<template lang='pug'>
q-btn.account-avbtn.q-ml-md(flat, round, dense, color='custom-color')
  q-icon(
    v-if='!userStore.authenticated || !userStore.hasAvatar'
    name='ph ph-user-circle'
    )
  q-avatar(
    v-else
    size='32px'
    )
    img(:src='`/_user/` + userStore.id + `/avatar`')
  q-menu.translucent-menu(auto-close)
    q-card(flat, style='width: 300px;', :dark='false')
      q-card-section(align='center')
        .text-subtitle1.text-grey-7 {{userStore.name}}
        .text-caption.text-grey-8 {{userStore.email}}
      q-separator(:dark='false')
      q-card-actions(align='center')
        q-btn(
          flat
          :label='t(`common.header.profile`)'
          icon='ph ph-user'
          color='primary'
          to='/_profile'
          no-caps
          )
        q-btn(flat
          :label='t(`common.header.logout`)'
          icon='ph ph-sign-out'
          color='red'
          @click='userStore.logout()'
          no-caps
          )
  q-tooltip {{ t('common.header.account') }}
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { useUserStore } from '@/stores/user'

// STORES

const userStore = useUserStore()

// I18N

const { t } = useI18n()
</script>

<style lang="scss">
.account-avbtn {
  color: rgba(255,255,255,.6);
}
</style>
