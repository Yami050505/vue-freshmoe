// axios 封装
import axios from 'axios'
import { ElMessage } from 'element-plus'
import 'element-plus/theme-chalk/el-message.css'
import { useUserStore } from '@/stores/userStore'
import router from '@/router'

const httpInstance = axios.create({
    // 存在跨域问题，需要配置代理
    baseURL:'/api',
    timeout:50000,
})


// 拦截器

// axios请求拦截器
httpInstance.interceptors.request.use(config => {
  // 1.从pinia获取token数据
  const userStore = useUserStore()
  // 2.按照后端的要求拼接token数据
  const token=userStore.userInfo.token
  if(token){
    config.headers.Authorization=`Bearer ${token}`
  }
  return config
}, e => Promise.reject(e))

// axios响应式拦截器
httpInstance.interceptors.response.use(res => res.data, e => {
   const userStore = useUserStore()
  // 错误提示统一错误提示
  ElMessage({type:'warning',message:e.response.data.message})
   //401token失效处理
    // 清空用户数据
    if(e.response.status===401){
      userStore.clearUserInfo()
       // 跳转登录页
    router.push('/login')
    }
  return Promise.reject(e)
})

export default httpInstance