import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/main.scss'
// 测试接口函数
import { getCategoty } from '@/apis/testAPI'
// 调用测试接口函数
getCategoty().then(res => {
    console.log(res)
})
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
