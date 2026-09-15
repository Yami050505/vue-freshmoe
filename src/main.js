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
// 引入全局组件
import { componentPlugin } from '@/components'

const app = createApp(App)
app.use(createPinia())
app.use(router)
// 安装懒加载插件
app.use(lazyPlugin)
// 安装全局组件插件
app.use(componentPlugin)
app.mount('#app')

