<template>
  <div class="overlay">
    <div class="card">
      <div class="deck-label">{{ card.deckName }}</div>

      <div class="question" v-html="card.question" />

      <div v-if="card.sentence" class="sentence" v-html="card.sentence" />

      <div v-if="!revealed" class="input-area">
        <p class="attempts-hint">
          {{ attemptsLeft }} tentativa{{ attemptsLeft !== 1 ? 's' : '' }} restante{{ attemptsLeft !== 1 ? 's' : '' }}
        </p>
        <input
          ref="inputRef"
          v-model="userAnswer"
          class="answer-input"
          :class="{ shake: shaking }"
          placeholder="Digite a resposta..."
          @keydown.enter="checkAnswer"
          autofocus
        />
        <div class="buttons">
          <button class="btn btn-primary" @click="checkAnswer">Confirmar</button>
          <button class="btn btn-ghost" @click="dismiss">Fechar</button>
        </div>
      </div>

      <div v-else class="revealed-area">
        <div class="answer-reveal" v-html="card.answer" />
        <button class="btn btn-primary" @click="dismiss">Continuar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  onDismiss: { type: Function, required: true },
})

const MAX_ATTEMPTS = 3

const userAnswer = ref('')
const attemptsLeft = ref(MAX_ATTEMPTS)
const shaking = ref(false)
const revealed = ref(false)
const inputRef = ref(null)

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

function normalize(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase()
}

function checkAnswer() {
  if (!userAnswer.value.trim()) return

  const correct = normalize(props.card.answer)
  const given = normalize(userAnswer.value)

  if (given === correct) {
    revealed.value = true
    return
  }

  attemptsLeft.value--
  userAnswer.value = ''

  if (attemptsLeft.value <= 0) {
    props.onDismiss()
    return
  }

  triggerShake()
}

function triggerShake() {
  shaking.value = true
  setTimeout(() => (shaking.value = false), 500)
}

function dismiss() {
  props.onDismiss()
}
</script>

