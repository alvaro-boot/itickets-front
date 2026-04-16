<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="route-fade-slide" mode="out-in" appear>
      <component :is="Component" :key="route.fullPath" />
    </Transition>
  </RouterView>
</template>

<script setup>
import { RouterView } from 'vue-router';
</script>
