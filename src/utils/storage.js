import browser from 'webextension-polyfill'

export const DEFAULT_SETTINGS = {
  enabled: false,
  intervalMin: 10,
  intervalMax: 20,
  decks: [],
}

export async function getSettings() {
  const result = await browser.storage.sync.get('settings')
  return { ...DEFAULT_SETTINGS, ...(result.settings || {}) }
}

export async function saveSettings(settings) {
  await browser.storage.sync.set({ settings })
}

export async function updateSettings(partial) {
  const current = await getSettings()
  await saveSettings({ ...current, ...partial })
  return { ...current, ...partial }
}
