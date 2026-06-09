<template>
  <div class="overlay">
    <div class="card">
      <div class="deck-label">{{ card.deckName }}</div>

      <div class="question" v-html="card.question" />

      <div v-if="card.sentence" class="sentence" v-html="card.sentence" />

      <div v-if="!revealed" class="input-area">
        <p class="attempts-hint">
          <template v-if="cooldown > 0">
            Aguarde {{ cooldown }}s para tentar novamente
          </template>
          <template v-else>
            {{ attemptsLeft }} tentativa{{ attemptsLeft !== 1 ? 's' : '' }} restante{{ attemptsLeft !== 1 ? 's' : '' }}
          </template>
        </p>
        <input
          ref="inputRef"
          v-model="userAnswer"
          class="answer-input"
          :class="{ shake: shaking, disabled: cooldown > 0 }"
          :disabled="cooldown > 0"
          placeholder="Digite a resposta..."
          @keydown.enter="checkAnswer"
          autofocus
        />
        <div class="buttons">
          <button class="btn btn-primary" :disabled="cooldown > 0" @click="checkAnswer">Confirmar</button>
          <button v-if="showClose" class="btn btn-ghost" @click="dismiss">Fechar</button>
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  onDismiss: { type: Function, required: true },
})

const MAX_ATTEMPTS = 3
const COOLDOWN_SECS = 10

const userAnswer = ref('')
const attemptsLeft = ref(MAX_ATTEMPTS)
const shaking = ref(false)
const revealed = ref(false)
const failed = ref(false)
const cooldown = ref(0)
const inputRef = ref(null)

let cooldownTimer = null

const showClose = computed(() => props.card.isTest || failed.value)

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

onUnmounted(() => {
  clearInterval(cooldownTimer)
})

function normalize(str) {
  return str.replace(/<[^>]+>/g, '').trim().toLowerCase()
}

function checkAnswer() {
  if (!userAnswer.value.trim() || cooldown.value > 0) return

  const correct = normalize(props.card.answer)
  const given = normalize(userAnswer.value)

  if (given === correct) {
    revealed.value = true
    return
  }

  attemptsLeft.value--
  userAnswer.value = ''

  if (attemptsLeft.value <= 0) {
    failed.value = true
    return
  }

  triggerShake()
  startCooldown()
}

function startCooldown() {
  cooldown.value = COOLDOWN_SECS
  cooldownTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) {
      clearInterval(cooldownTimer)
      nextTick(() => inputRef.value?.focus())
    }
  }, 1000)
}

function triggerShake() {
  shaking.value = true
  setTimeout(() => (shaking.value = false), 500)
}

function dismiss() {
  props.onDismiss()
}
</script>
