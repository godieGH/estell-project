import { boot } from 'quasar/wrappers'
import twemoji from 'twemoji'

export default boot(({ app }) => {
  // Register a global Vue directive
  app.directive('twemoji', {
    mounted(el) {
      // Parse the content of the element when it's first mounted
      twemoji.parse(el)
    },
    updated(el) {
      // Re-parse the content if it changes
      twemoji.parse(el)
    },
  })
})
