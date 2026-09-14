// 定义懒加载插件
import { useIntersectionObserver } from '@vueuse/core'

export const lazyPlugin = {
    install(app){
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

    }
}