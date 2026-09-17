// 封装倒计时函数
import { ref,computed,onUnmounted } from 'vue'
import dayjs from 'dayjs'
export const useCountDown = () => {
    // 响应式数据
    let timer = null
    const time = ref(0)
    // 格式化时间函数
    const formatTime = computed(()=>dayjs.unix(time.value).format('mm分ss秒'))
    // 开启倒计时函数
    const start=(currentTime)=>{
        // 开始倒计时的逻辑
        // 核心逻辑的编写:每隔一秒减少1秒
        time.value = currentTime
        // 每隔一秒减少1秒
        setInterval(()=>{
            time.value--
        },1000)
    }
    // 组件销毁时清除定时器
    // 遲止内存泄漏
    onUnmounted(()=>{
        timer && clearInterval(timer)
    })
    return {
        formatTime,
        start
    }
}