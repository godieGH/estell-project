// src/boot/global-mixin.js
import { boot } from 'quasar/wrappers'

export default boot(({ app }) => {
  app.mixin({
    // 1. Add a data property that your components can bind to
    data() {
      return {
        routerLinkColor: '',
      }
    },

    // 2. After each component mounts, read Quasar's dark-mode status...
    mounted() {
      // `this.$q.dark.isActive` is `true` if dark mode is currently active
      // (regardless of whether it's "auto", user-forced, or set via config) 0
      this.routerLinkColor = this.$q.dark.isActive ? 'text-grey-7' : ''
    },
  })
})
