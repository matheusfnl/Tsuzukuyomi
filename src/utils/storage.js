import browser from 'webextension-polyfill'

export const DEFAULT_SETTINGS = {
  enabled: false,
  intervalMin: 10,
  intervalMax: 20,
  ankiUrl: 'http://localhost:8765',
  decks: [],
}

export async function getSettings() {
  const result = await browser.storage.local.get('settings')
  const saved = result.settings || {}
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    decks: Array.isArray(saved.decks) ? saved.decks : [],
  }
}

export async function saveSettings(settings) {
  await browser.storage.local.set({ settings })
}

export async function updateSettings(partial) {
  const current = await getSettings()
  await saveSettings({ ...current, ...partial })
  return { ...current, ...partial }
}
