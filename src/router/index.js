// createRouter 创建路由实例
// createWebHistory 创建历史模式的路由
import { createRouter, createWebHistory } from 'vue-router'
// import { useUserStore } from '@/stores/userStore'
import Layout from '@/views/Layout/index.vue'
import Login from '@/views/Login/index.vue'
import Home from '@/views/Home/index.vue'
import Category from '@/views/Category/index.vue'
import SubCategory from '@/views/SubCategory/index.vue'
import Detail from '@/views/Detail/index.vue'
import CartList from '@/views/CartList/index.vue'
import Checkout from '@/views/Checkout/index.vue'
import Pay from '@/views/Pay/index.vue'
import PayBack from '@/views/Pay/PayBack.vue'
import Member from '@/views/Member/index.vue'
import UserOrder from '@/views/Member/components/UserOrder.vue'
import UserInfo from '@/views/Member/components/UserInfo.vue'



const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 配置path和component对应关系的位置
  routes: [
    {
      path:'/',
      component:Layout,
      children:[
        {
          //默认路由
          path:'',
          component:Home
        },
        {
          // :id 路由参数 占位符
          path:'/category/:id',
          component:Category
        },
        {
          // :id 路由参数 占位符
          path:'/category/sub/:id',
          component:SubCategory
        },
        {
          // :id 路由参数 占位符
          path:'/detail/:id',
          component:Detail
        },
        {
          // 购物车路由
          path:'/cartlist',
          component:CartList
        },
        {
          // 结算路由
          path:'/checkout',
          component:Checkout
        },
        {
          // 支付路由
          path:'/pay',
          component:Pay
        },
        {
          // 支付回调路由
          path:'/paycallback',
          component:PayBack
        },
        {
          // 会员中心路由
          path:'/member',
          component:Member,
          // 访问 /member 时默认跳转到个人中心
          redirect:'/member/user',
          children:[
            {
              // 用户
              path:'user',
              component:UserInfo
            },
            {
              // 订单路由
              path:'order',
              component:UserOrder
            }
          ]
        }
      ]

    },
    {
      path:'/login',
      component:Login
    }
  ],
  // 路由滚动行为定制-使每次切换页面都从页面顶部开始
  scrollBehavior(){
    return {
      top:0
    }
  }
})

// // 全局前置守卫：会员中心相关路由需要登录
// router.beforeEach((to) => {
//   const userStore = useUserStore()
//   // 如果目标路由属于 /member 且没有 token，跳转到登录页
//   if (to.path.startsWith('/member') && !userStore.userInfo.token) {
//     return '/login'
//   }
// })

export default router
