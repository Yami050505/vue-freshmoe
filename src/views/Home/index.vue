<script setup>
import HomeCategory from './components/HomeCategory.vue'
import HomeBanner from './components/HomeBanner.vue'
import HomeNew from './components/HomeNew.vue'
import HomeHot from './components/HomeHot.vue'
import HomeProduct from './components/HomeProduct.vue'
import HomePanel from './components/HomePanel.vue'

</script>

<template>
  <div class="container">
    <HomeCategory />
    <HomeBanner />
  </div>
  <HomeNew />
  <HomeHot />
  <HomeProduct />
  <HomePanel />
  <!-- 测试面板组件 -->
  <!-- <HomePanel title="新鲜好物" subTitle="新鲜出炉 品质靠谱">
    <div> 主体内容 </div>
  </HomePanel> -->
  <!-- 测试面板组件 -->
  <!-- <HomePanel title="热门推荐" subTitle="热门推荐 品质保障">
    <div> 主体内容 </div>
  </HomePanel> -->
</template>