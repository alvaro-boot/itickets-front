import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { initNexusUi } from './shared/composables/useNexusUi';
import './app/styles/app.css';
import './app/styles/theme-jira.css';
import './nexus/styles/nexus-ui.css';

initNexusUi();

createApp(App).use(router).mount('#app');
