import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
// 引入初始化样式文件
import './styles/common.scss'
// 测试接口函数
import { getCategoty } from '@/apis/testAPI'
// 调用测试接口函数
getCategoty().then(res => {
    console.log(res)
})
// 引入懒加载插件
import { lazyPlugin } from '@/directives'

const app = createApp(App)
app.use(createPinia())
app.use(router)
// 安装懒加载插件
app.use(lazyPlugin)

app.mount('#app')

