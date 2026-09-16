<script setup>
import { onMounted } from 'vue'
import LayoutNav from './components/LayoutNav.vue'
import LayoutHeader from './components/LayoutHeader.vue'
import LayoutFooter from './components/LayoutFooter.vue'
import LayoutFixed from './components/LayoutFixed.vue'
 
//  触发获取导航列表action
import { useCategoryStore } from '@/stores/categoryStore'
const categoryStore= useCategoryStore()
onMounted(()=>{
  categoryStore.getCategory()
})
</script>

<template>
  <LayoutNav />
  <LayoutHeader />
  <!-- 添加key属性，解决路由切换时的动画问题 -->
   <!-- 破坏复用机制，强制销毁重建 -->
  <!-- <RouterView :key="$route.fullPath" /> -->
   <RouterView />
  <LayoutFooter />
  <LayoutFixed />
</template>