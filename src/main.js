import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './app/styles/app.css';
import './app/styles/theme-it-desk.css';

createApp(App).use(router).mount('#app');
