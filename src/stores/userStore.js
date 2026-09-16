// 管理用户相关数据
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { loginAPI } from '@/apis/user'

export const useUserStore=defineStore('user',()=>{
// 1定义管理用户数据的state
const userInfo=ref({})
// 2定义获取接口数据的action
const getUserInfo=async({account,password})=>{
    const res =await loginAPI({account,password})
    userInfo.value=res.result
}

// 退出时清除用户信息
const clearUserInfo=()=>{
    userInfo.value={}
}

// 3以对象的格式把state和action返回
return{
    userInfo,
    getUserInfo,
    clearUserInfo
}
},{
    persist:true
}
)
