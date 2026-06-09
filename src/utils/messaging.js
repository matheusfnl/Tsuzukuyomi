import browser from 'webextension-polyfill'

export async function sendCardToTab(tabId, card) {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'SHOW_REVIEW', card })
  } catch {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['src/content/index.js'],
    })
    await new Promise(r => setTimeout(r, 150))
    await browser.tabs.sendMessage(tabId, { type: 'SHOW_REVIEW', card })
  }
}
