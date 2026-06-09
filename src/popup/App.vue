<template>
  <div class="popup">
    <header class="header">
      <span class="logo">🈚 Spaced Review</span>
      <label class="toggle">
        <input type="checkbox" v-model="settings.enabled" @change="save" />
        <span class="slider" />
      </label>
    </header>

    <div v-if="!ankiConnected" class="banner-error">
      AnkiConnect não encontrado. Abra o Anki com o addon instalado.
    </div>

    <div class="section">
      <label class="section-title">Intervalo entre revisões</label>
      <div class="interval-row">
        <div class="interval-field">
          <span class="field-label">Mínimo</span>
          <div class="input-group">
            <input type="number" v-model.number="settings.intervalMin" min="1" max="120" @change="save" />
            <span class="unit">min</span>
          </div>
        </div>
        <div class="interval-sep">–</div>
        <div class="interval-field">
          <span class="field-label">Máximo</span>
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
            + Adicionar
          </button>
          <button class="btn-test" :disabled="!canTest" :class="{ loading: testing }" @click="testCard">
            {{ testing ? '...' : 'Testar' }}
          </button>
        </div>
      </div>

      <div v-if="settings.decks.length === 0" class="empty-decks">
        Nenhum deck selecionado
      </div>

      <DeckConfig
        v-for="(deck, i) in settings.decks"
        :key="deck.deckName"
        :deck="deck"
        @update="updateDeck(i, $event)"
        @remove="removeDeck(i)"
      />
    </div>

    <DeckPicker
      v-if="showDeckPicker"
      :available-decks="availableDecks"
      :selected-decks="settings.decks.map(d => d.deckName)"
      @select="addDeck"
      @close="showDeckPicker = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import browser from 'webextension-polyfill'
import { getSettings, saveSettings } from '../utils/storage.js'
import { getDeckNames, pingAnki, getRandomCard } from '../utils/anki.js'
import DeckConfig from './components/DeckConfig.vue'
import DeckPicker from './components/DeckPicker.vue'

const settings = ref({
  enabled: false,
  intervalMin: 10,
  intervalMax: 20,
  decks: [],
})

const ankiConnected = ref(false)
const availableDecks = ref([])
const loadingDecks = ref(false)
const showDeckPicker = ref(false)
const testing = ref(false)

const canTest = computed(() =>
  ankiConnected.value &&
  settings.value.decks.length > 0 &&
  settings.value.decks.every(d => d.questionField && d.answerField) &&
  !testing.value
)

onMounted(async () => {
  settings.value = await getSettings()
  ankiConnected.value = await pingAnki()
  if (ankiConnected.value) {
    loadingDecks.value = true
    try {
      availableDecks.value = await getDeckNames()
    } finally {
      loadingDecks.value = false
    }
  }
})

async function save() {
  if (settings.value.intervalMin > settings.value.intervalMax) {
    settings.value.intervalMax = settings.value.intervalMin
  }
  await saveSettings(settings.value)
  browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' })
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

function removeDeck(index) {
  settings.value.decks.splice(index, 1)
  save()
}

async function testCard() {
  if (!canTest.value) return
  testing.value = true
  try {
    const deck = settings.value.decks[Math.floor(Math.random() * settings.value.decks.length)]
    const card = await getRandomCard(deck)
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { type: 'SHOW_REVIEW', card })
      window.close()
    }
  } catch (err) {
    console.error('[spaced-review] erro ao testar card:', err)
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.popup {
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #1e1e32;
}

.logo {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.02em;
}

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
  background: #2a2a42;
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
  background: #7c7ca0;
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

.section {
  padding: 14px 16px;
  border-bottom: 1px solid #1e1e32;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7c7ca0;
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
  font-size: 11px;
  color: #7c7ca0;
}

.input-group {
  display: flex;
  align-items: center;
  background: #1e1e32;
  border: 1px solid #2d2d4e;
  border-radius: 6px;
  overflow: hidden;
}

.input-group input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e8e8f0;
  font-size: 14px;
  padding: 6px 8px;
  width: 0;
}

.unit {
  font-size: 12px;
  color: #7c7ca0;
  padding: 0 8px;
}

.interval-sep {
  color: #4a4a6a;
  padding-top: 18px;
}

.deck-header-actions {
  display: flex;
  gap: 6px;
}

.btn-add, .btn-test {
  border: none;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-add {
  background: #4a3fc0;
  color: #fff;
}

.btn-test {
  background: rgba(255, 255, 255, 0.08);
  color: #c8c8e8;
}

.btn-test:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.btn-add:disabled, .btn-test:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-decks {
  font-size: 12px;
  color: #4a4a6a;
  text-align: center;
  padding: 12px 0;
}
</style>
