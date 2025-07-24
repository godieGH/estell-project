// src/boot/global-components.js
import { boot } from 'quasar/wrappers'
import NoItemPlaceholder from 'src/components/NoItemPlaceholder.vue'

export default boot(({ app }) => {
  app.component('NoItemPlaceholder', NoItemPlaceholder)
  app.component('no-item-placeholder', NoItemPlaceholder)
})
