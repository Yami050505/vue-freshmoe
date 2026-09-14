// 封装分类数据业务相关代码
import { getCategoryAPI } from '@/apis/category'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {onBeforeRouteUpdate} from 'vue-router'
export function useCategory(){
  // 获取数据
const categoryData = ref({})
const route = useRoute()
// 给id一个默认值，避免路由参数为空时，接口调用失败的问题
const getCategory = async (id=route.params.id)=>{
  const res = await getCategoryAPI(id)
  categoryData.value = res.result
}
onMounted(() => {
  getCategory()
})
onBeforeRouteUpdate((to)=>{
  // 存在问题:路由参数变化了，但是分类数据没有变化
  // 解决方案:在路由参数变化的时候，重新发送分类数据接口
  getCategory(to.params.id)
})
return {
  categoryData
}
}