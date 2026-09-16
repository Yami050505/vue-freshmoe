// 封装购物车模块
import { defineStore } from 'pinia'
import { ref,computed } from 'vue'
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
    // 删除购物车商品
    const delCart = (skuId) => {
        // 从cartList中删除对应的商品
        // const idx=cartList.value.findIndex((item)=>skuId===item.skuId)
        // cartList.value.splice(idx,1)
        // 使用filter方法删除对应的商品
        cartList.value=cartList.value.filter((item)=>item.skuId!==skuId)
    } 

     // 单选功能
     const singleCheck=(skuId,selected)=>{
        // 通过skuId找到对应的商品,然后把他的selected属性修改为selected参数的值
        const item=cartList.value.find((item)=>item.skuId===skuId)
        item.selected=selected
     }
    
    // 计算属性
    // 1总的数量 所有项的count之和
    const totalCount= computed(()=>
         cartList.value.reduce((pre,cur)=>pre+cur.count,0)
    )
    // 2总价 所有项的count*price之和
    const totalPrice= computed(()=>
         cartList.value.reduce((pre,cur)=>pre+cur.count*cur.price,0)
    )
    return{
        cartList,
        totalCount,
        totalPrice,
        addCart,
        delCart,
        singleCheck
    }
},{
    persist:true
})
