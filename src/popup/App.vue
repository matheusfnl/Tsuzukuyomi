<template>
  <div class="popup" :class="settings.theme === 'light' ? 'theme-light' : 'theme-dark'">
    <header class="header">
      <span class="logo">
        <img :src="iconUrl" class="logo-icon" alt="" />
        Tsuzukuyomi
      </span>
      <div class="header-actions">
        <button class="btn-theme" @click="toggleTheme" :title="settings.theme === 'light' ? 'Dark theme' : 'Light theme'">
          {{ settings.theme === 'light' ? '🌙' : '☀️' }}
        </button>
        <label class="toggle">
          <input type="checkbox" v-model="settings.enabled" @change="save" />
          <span class="slider" />
        </label>
      </div>
    </header>

    <div v-if="!ankiChecking && !ankiConnected" class="banner-error">
      AnkiConnect not found. Open Anki with the addon installed.
    </div>

    <div class="section">
      <label class="section-title">AnkiConnect URL</label>
      <div class="url-row">
        <div class="input-group url-input-group">
          <input
            type="text"
            v-model="settings.ankiUrl"
            placeholder="http://localhost:8765"
            @blur="onUrlChange"
          />
        </div>
        <button class="btn-ping" :class="{ checking: ankiChecking, ok: ankiConnected && !ankiChecking, fail: !ankiConnected && !ankiChecking }" @click="recheckAnki">
          ●
        </button>
      </div>
    </div>

    <div class="section">
      <label class="section-title">Review interval</label>
      <div class="interval-row">
        <div class="interval-field">
          <span class="field-label">Minimum</span>
          <div class="input-group">
            <input type="number" v-model.number="settings.intervalMin" min="1" max="120" @change="save" />
            <span class="unit">min</span>
          </div>
        </div>
        <div class="interval-sep">–</div>
        <div class="interval-field">
          <span class="field-label">Maximum</span>
          <div class="input-group">
            <input type="number" v-model.number="settings.intervalMax" min="1" max="120" @change="save" />
            <span class="unit">min</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <label class="section-title">Decks</label>
        <div class="deck-header-actions">
          <button class="btn-add" :disabled="!ankiConnected || loadingDecks" @click="showDeckPicker = true">
            + Add
          </button>
          <button class="btn-test" :disabled="!canTest" :class="{ loading: testing }" @click="testCard">
            {{ testing ? '...' : 'Test' }}
          </button>
        </div>
      </div>

      <div v-if="testError" class="banner-error banner-test-error">{{ testError }}</div>

      <div v-if="settings.decks.length === 0" class="empty-decks">
        No decks selected
      </div>

      <DeckConfig
        v-for="(deck, i) in settings.decks"
        :key="deck.deckName"
        :deck="deck"
        :anki-url="settings.ankiUrl"
        :retry-trigger="deckConfigKey"
        @update="updateDeck(i, $event)"
        @remove="removeDeck(i)"
      />
    </div>

    <DeckPicker
      v-if="showDeckPicker"
      :available-decks="availableDecks"
      :selected-decks="(settings.decks || []).map(d => d.deckName)"
      @select="addDeck"
      @close="showDeckPicker = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import browser from 'webextension-polyfill'

const iconUrl = browser.runtime.getURL('icons/icon48.png')
import { getSettings, saveSettings } from '../utils/storage.js'
import { getDeckNames, pingAnki, getRandomCard } from '../utils/anki.js'
import { sendCardToTab } from '../utils/messaging.js'
import DeckConfig from './components/DeckConfig.vue'
import DeckPicker from './components/DeckPicker.vue'

const settings = ref({
  enabled: false,
  intervalMin: 10,
  intervalMax: 20,
  decks: [],
})

const ankiConnected = ref(false)
const ankiChecking = ref(true)
const deckConfigKey = ref(0)
const availableDecks = ref([])
const loadingDecks = ref(false)
const showDeckPicker = ref(false)
const testing = ref(false)
const testError = ref('')

const canTest = computed(() =>
  ankiConnected.value &&
  settings.value.decks.length > 0 &&
  settings.value.decks.every(d => d.questionField && d.answerField) &&
  !testing.value
)

onMounted(async () => {
  settings.value = await getSettings()
  await recheckAnki()
})

async function recheckAnki() {
  ankiChecking.value = true
  ankiConnected.value = await pingAnki(settings.value.ankiUrl)
  ankiChecking.value = false
  if (ankiConnected.value) {
    loadingDecks.value = true
    try {
      availableDecks.value = await getDeckNames(settings.value.ankiUrl)
    } finally {
      loadingDecks.value = false
    }
    deckConfigKey.value++
  }
}

async function onUrlChange() {
  await save()
  await recheckAnki()
}

async function save() {
  if (settings.value.intervalMin > settings.value.intervalMax) {
    settings.value.intervalMax = settings.value.intervalMin
  }
  await saveSettings(settings.value)
  browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {})
}

function addDeck(deckName) {
  if (settings.value.decks.find(d => d.deckName === deckName)) return
  settings.value.decks.push({
    deckName,
    questionField: '',
    answerField: '',
    sentenceField: '',
  })
  showDeckPicker.value = false
  save()
}

function updateDeck(index, updated) {
  settings.value.decks[index] = updated
  save()
}

function toggleTheme() {
  settings.value.theme = settings.value.theme === 'dark' ? 'light' : 'dark'
  save()
}

function removeDeck(index) {
  settings.value.decks.splice(index, 1)
  save()
}

async function testCard() {
  if (!canTest.value) return
  testing.value = true
  testError.value = ''
  try {
    const deck = settings.value.decks[Math.floor(Math.random() * settings.value.decks.length)]
    const card = { ...await getRandomCard(deck, settings.value.ankiUrl), isTest: true }
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      testError.value = 'No active tab found.'
      return
    }
    try {
      await sendCardToTab(tab.id, card)
      window.close()
    } catch {
      testError.value = 'Could not inject into the active tab. Try on a regular web page.'
    }
  } catch (err) {
    testError.value = `Error: ${err.message}`
  } finally {
    testing.value = false
  }
}
</script>

<style>
/* propaga variáveis para componentes filhos (scoped não atravessa slots) */
.theme-dark { --bg:#0f0f1a;--bg-section:#1a1a2e;--bg-input:#1e1e32;--border:#2d2d4e;--border-soft:#1e1e32;--text:#e8e8f0;--text-muted:#7c7ca0;--text-faint:#4a4a6a;--deck-border:#2d2d4e; }
.theme-light { --bg:#f0f0f8;--bg-section:#e4e4f0;--bg-input:#d8d8ec;--border:#d0d0e8;--border-soft:#e4e4f0;--text:#1a1a2e;--text-muted:#6060a0;--text-faint:#a0a0c0;--deck-border:transparent; }
</style>

<style scoped>
/* ── Temas ───────────────────────────────────────────── */
.theme-dark {
  --bg:          #0f0f1a;
  --bg-section:  #1a1a2e;
  --bg-input:    #1e1e32;
  --border:      #2d2d4e;
  --border-soft: #1e1e32;
  --text:        #e8e8f0;
  --text-muted:  #7c7ca0;
  --text-faint:  #4a4a6a;
  --slider-off:  #2a2a42;
  --slider-dot:  #7c7ca0;
  --deck-border: #2d2d4e;
  --btn-test-bg: rgba(255,255,255,0.08);
  --btn-test-bg-hover: rgba(255,255,255,0.14);
  --btn-test-color: #c8c8e8;
}

.theme-light {
  --bg:          #f0f0f8;
  --bg-section:  #e4e4f0;
  --bg-input:    #d8d8ec;
  --border:      #d0d0e8;
  --border-soft: #e4e4f0;
  --text:        #1a1a2e;
  --text-muted:  #6060a0;
  --text-faint:  #a0a0c0;
  --slider-off:  #d0d0e8;
  --slider-dot:  #a0a0c0;
  --btn-test-bg: rgba(0,0,0,0.06);
  --btn-test-bg-hover: rgba(0,0,0,0.10);
  --btn-test-color: #4a4a7a;
  --deck-border: transparent;
}

/* ── Layout ──────────────────────────────────────────── */
.popup {
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-soft);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.02em;
}

.logo-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-theme {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 2px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.btn-theme:hover { opacity: 1; }

.toggle {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
}

.toggle input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  inset: 0;
  background: var(--slider-off);
  border-radius: 24px;
  transition: background 0.25s;
  cursor: pointer;
}

.slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--slider-dot);
  border-radius: 50%;
  transition: transform 0.25s, background 0.25s;
}

input:checked + .slider { background: #4a3fc0; }
input:checked + .slider::before { transform: translateX(18px); background: #fff; }

.banner-error {
  background: rgba(255, 80, 80, 0.12);
  color: #ff8080;
  font-size: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255,80,80,0.2);
}

.banner-test-error {
  border-bottom: none;
  border-radius: 6px;
  margin: 0 0 8px;
}

.section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-soft);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: block;
  margin-bottom: 10px;
}

.section-header .section-title { margin-bottom: 0; }

.interval-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.interval-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 13px;
  color: var(--text-muted);
}

.input-group {
  display: flex;
  align-items: center;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.input-group input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 15px;
  padding: 7px 10px;
  width: 0;
}

.input-group input[type=number]::-webkit-inner-spin-button,
.input-group input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.input-group input[type=number] { -moz-appearance: textfield; }

.unit {
  font-size: 14px;
  color: var(--text-muted);
  padding: 0 10px;
}

.interval-sep {
  color: var(--text-faint);
  padding-top: 18px;
}

.deck-header-actions {
  display: flex;
  gap: 6px;
}

.btn-add, .btn-test {
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-add {
  background: #4a3fc0;
  color: #fff;
}

.btn-test {
  background: var(--btn-test-bg);
  color: var(--btn-test-color);
}

.btn-test:hover:not(:disabled) { background: var(--btn-test-bg-hover); }

.btn-add:disabled, .btn-test:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-decks {
  font-size: 13px;
  color: var(--text-faint);
  text-align: center;
  padding: 12px 0;
}

.url-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.url-input-group { flex: 1; }

.url-input-group input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 13px;
  padding: 7px 10px;
  width: 0;
  min-width: 0;
  font-family: monospace;
}

.btn-ping {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
  color: var(--text-faint);
  transition: color 0.2s;
}

.btn-ping.ok   { color: #7ef08a; }
.btn-ping.fail { color: #ff6060; }
.btn-ping.checking { animation: ping-pulse 1s ease-in-out infinite; }

@keyframes ping-pulse {
  0%, 100% { color: var(--text-faint); }
  50%       { color: #f0c040; }
}
</style>
