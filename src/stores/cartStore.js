// 封装购物车模块
import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useCartStore=defineStore('cart',()=>{
    // 1定义管理购物车数据的state
    const cartList=ref([])
    // 2定义获取接口数据的action
    const addCart = (goods) => {
        // 添加购物车操作
        // 已添加过 - count+1
        // 未添加过 - push()
        // 通过匹配传递过来的商品对象中的skuId能不能在cartList中找到对应的商品,如果找到,则count+1,否则push()
        const item=cartList.value.find((item)=>goods.skuId===item.skuId)
        if(item){
            item.count++
        }else{
            cartList.value.push(goods)
        }
    }   
    return{
        cartList,
        addCart
    }
},{
    persist:true
})
