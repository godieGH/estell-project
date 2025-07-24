// src/boot/event-bus.js
import { boot } from 'quasar/wrappers'
import mitt from 'mitt'
const emitter = mitt()

export default boot(({ app }) => {
  app.config.globalProperties.$bus = emitter
})
export const EventBus = emitter
