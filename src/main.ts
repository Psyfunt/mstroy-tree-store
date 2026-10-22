import { createApp } from 'vue'

import App from './App.vue'
import { registerAgGrid } from './grid/registerAgGrid'

registerAgGrid()
createApp(App).mount('#app')
