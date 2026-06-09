<template>
  <div class="field-select">
    <label class="field-label">{{ label }}</label>
    <select :value="value" @change="$emit('update', $event.target.value)">
      <option v-if="!value" value="" disabled>Select...</option>
      <option v-for="f in fields" :key="f.value" :value="f.value">{{ f.label }}</option>
    </select>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  fields: { type: Array, required: true },
  value: { type: String, default: '' },
})

defineEmits(['update'])
</script>

<style scoped>
.field-select {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.field-label {
  font-size: 13px;
  color: var(--text-muted, #7c7ca0);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

select {
  width: 100%;
  background: var(--bg, #0f0f1a);
  border: 1px solid var(--border, #2d2d4e);
  border-radius: 6px;
  color: var(--text, #e8e8f0);
  font-size: 15px;
  padding: 7px 10px;
  outline: none;
  cursor: pointer;
}

select:focus {
  border-color: #4a3fc0;
}
</style>
