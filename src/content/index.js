import { createApp } from 'vue'
import browser from 'webextension-polyfill'
import Overlay from './Overlay.vue'
import overlayCSS from './overlay.css?inline'

let overlayApp = null
let shadowHost = null

function mountOverlay(card) {
  if (overlayApp) return

  shadowHost = document.createElement('div')
  shadowHost.id = 'spaced-review-host'
  shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647'
  document.body.appendChild(shadowHost)

  const shadow = shadowHost.attachShadow({ mode: 'open' })

  const styleEl = document.createElement('style')
  styleEl.textContent = overlayCSS
  shadow.appendChild(styleEl)

  const mountPoint = document.createElement('div')
  shadow.appendChild(mountPoint)

  overlayApp = createApp(Overlay, {
    card,
    onDismiss: unmountOverlay,
  })
  overlayApp.mount(mountPoint)
}

function unmountOverlay() {
  if (overlayApp) {
    overlayApp.unmount()
    overlayApp = null
  }
  if (shadowHost) {
    shadowHost.remove()
    shadowHost = null
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_REVIEW') {
    mountOverlay(message.card)
  }
})
