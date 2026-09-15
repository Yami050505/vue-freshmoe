// 封装所有用户相关接口
import request from '@/utils/http'
export const loginAPI=({account,password})=>{
    return request({
    url:'/login',
    method:'POST',
    data:{
        account,
        password
    }
 })
}