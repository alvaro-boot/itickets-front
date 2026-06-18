<template>
  <div class="jira-field-row">
    <span class="jira-field-row__label">{{ label }}</span>
    <div class="jira-field-row__value">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
});
</script>
