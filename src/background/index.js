import browser from 'webextension-polyfill'
import { getSettings } from '../utils/storage.js'
import { getRandomCard, pingAnki } from '../utils/anki.js'
import { sendCardToTab } from '../utils/messaging.js'

let timerTimeout = null

function randomInterval(min, max) {
  return (Math.random() * (max - min) + min) * 60 * 1000
}

async function scheduleNext(settings) {
  clearTimeout(timerTimeout)
  if (!settings.enabled || !settings.decks.length) return

  const delay = randomInterval(settings.intervalMin, settings.intervalMax)
  timerTimeout = setTimeout(() => triggerReview(), delay)
}

async function triggerReview() {
  const settings = await getSettings()
  if (!settings.enabled || !settings.decks.length) return

  const ankiAlive = await pingAnki(settings.ankiUrl)
  if (!ankiAlive) {
    scheduleNext(settings)
    return
  }

  const deck = settings.decks[Math.floor(Math.random() * settings.decks.length)]
  try {
    const card = await getRandomCard(deck, settings.ankiUrl)
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      scheduleNext(settings)
      return
    }

    await sendCardToTab(tab.id, card)
  } catch (err) {
    console.error('[spaced-review] erro ao buscar card:', err)
  }

  scheduleNext(settings)
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'SETTINGS_UPDATED') {
    const settings = await getSettings()
    scheduleNext(settings)
  }
})

browser.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings()
  scheduleNext(settings)
})

;(async () => {
  const settings = await getSettings()
  scheduleNext(settings)
})()
