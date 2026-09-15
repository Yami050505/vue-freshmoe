// 将components中所有组件都进行全局化注册
// 通过插件的方式
import ImageView from './imageView/index.vue'
import Sku from './XtxSku/index.vue'
export const componentPlugin = {
    install(app){
        // 注册所有组件
        // app.component('组件名字', 组件配置对象)
        app.component('XtxImageView', ImageView)
        app.component('XtxSku', Sku)

    }
}