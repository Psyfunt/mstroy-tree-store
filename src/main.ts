import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/600.css'
import { createApp } from 'vue'

import App from './App.vue'
import { registerAgGrid } from './grid/registerAgGrid'

registerAgGrid()
createApp(App).mount('#app')
