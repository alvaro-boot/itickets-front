<template>
  <div v-if="ui.state.loadingCount > 0" class="global-loader">
    <div class="global-loader__box">
      <span class="global-loader__spinner" aria-hidden="true"></span>
      <p class="global-loader__text">Cargando informacion, por favor espera...</p>
    </div>
  </div>
</template>

<script setup>
import { useUi } from '../composables/useUi';

const ui = useUi();
</script>
