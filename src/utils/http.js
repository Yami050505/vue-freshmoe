// axios 封装
import axios from 'axios'

const httpInstance = axios.create({
    // 存在跨域问题，需要配置代理
    baseURL:'/api',
    timeout:5000,
})


// 拦截器

// axios请求拦截器
httpInstance.interceptors.request.use(config => {
  return config
}, e => Promise.reject(e))

// axios响应式拦截器
httpInstance.interceptors.response.use(res => res.data, e => {
  return Promise.reject(e)
})

export default httpInstance