// createRouter 创建路由实例
// createWebHistory 创建历史模式的路由
import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/views/Layout/index.vue'
import Login from '@/views/Login/index.vue'
import Home from '@/views/Home/index.vue'
import Category from '@/views/Category/index.vue'
import SubCategory from '@/views/SubCategory/index.vue'

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

export default router
