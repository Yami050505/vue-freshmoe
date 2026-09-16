// 封装购物车模块的接口
import request from '@/utils/http'

// 添加购物车操作
export const insertCartAPI=({skuId,count}) => {
    return request({
        url:'/member/cart',
        method:'POST',
        data:{
            skuId,
            count
        }
    })
}
// 获取最新的购物车商品列表
export const findNewCartListAPI=()=>{
    return request({
        url:'/member/cart',
    })
}
// 删除购物车
export const delCartAPI=(ids) => {
    return request({
        url:'/member/cart',
        method:'DELETE',
        data:{
            ids
        }
    })
}