import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
// 引入初始化样式文件
import './styles/common.scss'
import { useIntersectionObserver } from '@vueuse/core'
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
// 定义全局指令
app.directive('img-lazy', {
    mounted(el, binding) {
        // el:指令绑定的那个元素 img
        // binding:binding.value 指令等于号后面绑定的表达式的值
        console.log(el, binding.value)
        // 监听图片是否进入视口
        useIntersectionObserver(
            el,
            ([{isIntersecting}])=>{
              if(isIntersecting){
                // 图片进入视口
                el.src= binding.value
              }
            }
        )
    }
})
