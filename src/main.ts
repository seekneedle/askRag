import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import 'highlight.js/styles/github-dark.css'

console.log('Starting app initialization...')

const app = createApp(App)
app.mount('#app')

console.log('App mounted successfully')