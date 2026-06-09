<template>
  <div class="deck-item">
    <div class="deck-header">
      <span class="deck-name">{{ deck.deckName }}</span>
      <button class="btn-remove" @click="emit('remove')">✕</button>
    </div>

    <div v-if="loadingFields" class="loading">Carregando campos...</div>

    <template v-else-if="fields.length">
      <div class="field-row">
        <FieldSelect
          label="Pergunta"
          :fields="fields"
          :value="local.questionField"
          @update="onField('questionField', $event)"
        />
        <FieldSelect
          label="Resposta"
          :fields="fields"
          :value="local.answerField"
          @update="onField('answerField', $event)"
        />
      </div>
      <FieldSelect
        label="Frase (opcional)"
        :fields="[{ value: '', label: '— nenhum —' }, ...fields]"
        :value="local.sentenceField"
        @update="onField('sentenceField', $event)"
      />
    </template>

    <div v-else class="field-error">
      Não foi possível carregar os campos. O Anki está aberto?
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getFieldsForDeck } from '../../utils/anki.js'
import FieldSelect from './FieldSelect.vue'

const props = defineProps({
  deck: { type: Object, required: true },
  ankiUrl: { type: String, default: 'http://localhost:8765' },
  retryTrigger: { type: Number, default: 0 },
})

const emit = defineEmits(['update', 'remove'])

const local = ref({ ...props.deck })
const fields = ref([])
const loadingFields = ref(true)

async function fetchFields() {
  loadingFields.value = true
  try {
    const raw = await getFieldsForDeck(props.deck.deckName, props.ankiUrl)
    fields.value = raw.map(f => ({ value: f, label: f }))
  } catch {
    fields.value = []
  } finally {
    loadingFields.value = false
  }
}

onMounted(fetchFields)

watch(() => props.deck, (val) => {
  local.value = { ...val }
}, { deep: true })

watch(() => props.retryTrigger, async (val) => {
  if (val === 0 || fields.value.length > 0) return
  await fetchFields()
})

function onField(key, value) {
  local.value[key] = value
  emit('update', { ...local.value })
}
</script>

<style scoped>
.deck-item {
  background: #1a1a2e;
  border: 1px solid #2d2d4e;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.deck-name {
  font-size: 15px;
  font-weight: 600;
  color: #c8c8e8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-remove {
  background: none;
  border: none;
  color: #4a4a6a;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  flex-shrink: 0;
}

.btn-remove:hover { color: #ff6584; }

.field-row {
  display: flex;
  gap: 8px;
}

.loading, .field-error {
  font-size: 13px;
  color: #7c7ca0;
  text-align: center;
  padding: 4px 0;
}

.field-error { color: #ff8080; }
</style>
