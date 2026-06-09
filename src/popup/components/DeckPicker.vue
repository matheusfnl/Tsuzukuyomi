<template>
  <div class="picker-backdrop" @click.self="$emit('close')">
    <div class="picker">
      <div class="picker-header">
        <span>Select deck</span>
        <button @click="$emit('close')">✕</button>
      </div>
      <div class="picker-list">
        <button
          v-for="deck in availableDecks"
          :key="deck"
          class="deck-option"
          :class="{ selected: selectedDecks.includes(deck) }"
          :disabled="selectedDecks.includes(deck)"
          @click="$emit('select', deck)"
        >
          <span class="deck-option-name">{{ deck }}</span>
          <span v-if="selectedDecks.includes(deck)" class="added-badge">Added</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  availableDecks: { type: Array, required: true },
  selectedDecks: { type: Array, required: true },
})

defineEmits(['select', 'close'])
</script>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.picker {
  background: var(--bg-section, #1a1a2e);
  border: 1px solid var(--border, #2d2d4e);
  border-radius: 12px 12px 0 0;
  width: 100%;
  max-height: 280px;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #2d2d4e);
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #c8c8e8);
}

.picker-header button {
  background: none;
  border: none;
  color: var(--text-muted, #7c7ca0);
  cursor: pointer;
  font-size: 14px;
}

.picker-list {
  overflow-y: auto;
  flex: 1;
}

.deck-option {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border-soft, #1e1e32);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}

.deck-option:hover:not(:disabled) {
  background: rgba(0,0,0,0.04);
}

.deck-option:disabled {
  opacity: 0.5;
  cursor: default;
}

.deck-option-name {
  font-size: 15px;
  color: var(--text, #e8e8f0);
}

.added-badge {
  font-size: 12px;
  color: #6c63ff;
  font-weight: 600;
}
</style>
