// src/boot/eruda.js
import { defineBoot } from '#q-app/wrappers' // correct boot import 0
import eruda from 'eruda'

export default defineBoot(() => {
  // no unused params
  if (import.meta.env.DEV) {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    if (isMobile) {
      eruda.init()
    }
  }
})
