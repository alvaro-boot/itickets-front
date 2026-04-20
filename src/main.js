import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './app/styles/app.css';
import 'highlight.js/styles/github-dark.css';

createApp(App).use(router).mount('#app');
