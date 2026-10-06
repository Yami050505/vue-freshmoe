# 鲜萌电商项目 Vue3 面试复习笔记

## 1. 项目简介

- **项目背景**：基于黑马「小兔鲜儿」电商教程实战改造的 B2C 生鲜电商项目，前端独立开发，后端使用课程提供的 RESTful 接口，品牌二次定制为「鲜萌 FreshMoe」（自定义主题色、Logo、登录页）。
- **技术栈**：Vue 3（Composition API）+ Vite + Pinia + Vue Router + Element Plus + ECharts 6 + axios + SCSS + dayjs。
- **实现功能**：
  - 首页：轮播图、分类导航、人气推荐、新鲜好物、产品区块
  - 商品：一级/二级分类、商品详情、SKU 规格选择、购物车
  - 交易：购物车增删改选、结算下单、支付与回调、我的订单
  - 会员：个人中心、收货地址新增/删除、**ECharts 订单数据统计页**
- **项目定位**：个人练手项目。亮点是完整走通了电商核心交易链路，并自主扩展了大数据量下的订单统计可视化。

## 2. 项目模块拆解【重点】

### 1）首页模块

**实现功能**：轮播图、一级分类导航、人气推荐、新鲜好物、热门商品等多个数据区块。

**技术知识点**：

- 组件化拆分：`HomeBanner`、`HomeCategory`、`HomeHot`、`HomeNew`、`HomeProduct`、`GoodsItem`
- 容器组件 `HomePanel` 用**插槽**做通用标题+内容骨架，业务组件只负责填数据，提高复用
- 接口按模块统一封装在 `src/apis`，组件只调函数不写 url
- props 父传子、列表 `v-for + :key` 渲染商品卡片

**口述版**：首页按区块拆成多个组件，公共标题抽成带插槽的 Panel 组件，数据通过封装好的 API 函数获取后用 props 传给子组件渲染。

### 2）商品分类模块

**实现功能**：顶部导航展示一级分类；分类页展示某分类下的商品；二级分类页支持面包屑、筛选排序、商品列表；详情页支持 SKU 规格选择和图片放大镜。

**技术知识点**：

- **动态路由**：`/category/:id`、`/detail/:id`，用 `useRoute().params.id` 取参数请求数据
- **同组件路由复用问题**：同一个 Category 组件切换不同分类 id 时页面不刷新，用 `onBeforeRouteUpdate` 监听路由变化重新请求
- **composables 逻辑复用**：`useCategory`、`useBanner` 把数据请求逻辑抽成组合式函数
- SKU 选择：用幂集算法（`power-set.js`）计算可选规格组合，禁用无库存组合
- 详情页路由跳转携带 id，组件挂载时请求详情

**口述版**：分类页是同一个组件复用，靠路由参数 id 区分数据；踩过切换分类数据不变的坑，用 onBeforeRouteUpdate 在路由更新时重新请求；公共逻辑抽成了 useXxx 组合式函数。

### 3）购物车模块（Pinia、本地持久化）

**实现功能**：加入购物车、数量增减、删除、单选/全选、总价合计、登录前后两套数据逻辑、登录后合并本地购物车。

**技术知识点**：

- **Pinia setup 写法**（`defineStore('cart', () => {...})`）：ref 当 state、函数当 action、computed 当 getter
- **双端购物车**：未登录操作本地数组（按 skuId 判断累加或新增），登录后调接口并重新拉取服务端列表
- **持久化**：`pinia-plugin-persistedstate` 配置 `persist: true`，购物车和用户信息自动存 localStorage，刷新不丢
- **登录合并**：登录成功把本地购物车调 `mergeCartAPI` 同步到服务端，再拉最新列表
- computed 派生：总数量、总价、已选数量、已选金额、是否全选
- **axios 拦截器**：请求拦截器统一加 `Authorization: Bearer token`；响应拦截器统一错误提示，401 清空用户信息跳登录

**口述版**：购物车用 Pinia 管理，未登录存本地、登录走接口，用持久化插件保证刷新不丢数据，登录时把本地购物车合并到服务端；合计金额全部用 computed 派生。

**结算与收货地址（本模块延伸）**：

- 结算页筛选已选商品计算金额，提交订单跳支付页
- 新增地址：`el-dialog + el-form` 表单校验（手机号正则、必填），`el-cascader` 省市区三级联动
- 删除地址：自定义居中确认弹窗，删除后刷新列表并自动改选默认地址

### 4）订单统计模块（ECharts 图表）

**实现功能**：会员中心新增 `/member/statistics` 页面，4 张统计卡片 + 3 张图表。

**技术知识点**：

- 4 张卡片：总订单数、总消费金额、商品件数、客单价（computed 聚合）
- **柱+折线双 Y 轴混合图**：近 6 个月订单数（柱）与消费金额（折线）
- **环形饼图**：6 种订单状态占比，tooltip 显示「状态: N 单 (百分比)」
- **横向条形图**：已付款订单按商品件数聚合 Top5
- 数据处理：用 dayjs 把订单按月份分组，已付款状态才计入金额
- ECharts 生命周期：`init` → `setOption`，监听 window resize 调 `resize`，组件卸载 `dispose` 防内存泄漏
- **大数据量方案**：分页拉取 + 统计窗口化（最多最近 100 单）+ 并发限流 + 单页超时重试
- loading / 失败重试 / 空数据三种状态 UI

**口述版**：统计页把订单接口分页拉回来后用 computed 做分组聚合，喂给三个 ECharts 图表；难点是公共测试账号有 3 万多单，做了只统计最近 100 单、限制并发和失败重试，既保证可用又在页面标注统计口径。

## 3. 开发踩坑与解决方案【面试加分重点】

### 坑 1：图表报 `Cannot read properties of null (reading 'getAttribute')`

- **现象**：数据请求成功，但 ECharts 图表不渲染。
- **排查**：在 `loading=true` 时就执行了 `echarts.init`，而图表容器在 `v-if` 加载分支里，DOM 还不存在，拿到 null。
- **解决**：先在 finally 里把 loading 置 false，`await nextTick()` 等容器挂载后再 init。

### 坑 2：`dayjs.max is not a function`

- **现象**：求最新订单时间时报错。
- **排查**：dayjs 的 max 需要单独注册 minMax 插件。
- **解决**：改用原生 `dayjs(Math.max(...orders.map(o => dayjs(o.createTime).valueOf())))`，零额外依赖。

### 坑 3：大账号页面永久卡在「加载中」

- **现象**：课程公共账号有 **30784 笔订单（1540 页）**，旧逻辑 Promise.all 一次性发 1539 个请求，全部 `ERR_ABORTED`；后端单页响应偶发 38 秒，超过超时时间。
- **排查**：用 curl 实测接口耗时和总页数，定位是并发量+慢响应问题，而非 token 失效。
- **解决**：最多拉最近 5 页（100 单）；每批只并发 2 个请求；单页超时放宽到 60s 并失败重试 1 次；显示页码进度；总订单数仍显示后端真实总数，页面用提示条标明金额/图表的统计范围。

### 坑 4：超时后 axios 拦截器二次报错

- **现象**：请求超时后控制台出现 TypeError。
- **排查**：超时错误没有 `response` 字段，原代码直接读 `e.response.data.message`。
- **解决**：加可选链 `e.response?.data?.message`，401 判断同样保护。

### 坑 5：切换分类，数据不更新

- **现象**：从「居家」切到「美食」，URL 变了但页面数据不变。
- **排查**：相同组件复用时不会重新 mounted。
- **解决**：用 `onBeforeRouteUpdate((to) => getCategory(to.params.id))` 在路由更新时重新请求。

### 坑 6：省市区编码提交后只存住「区」

- **现象**：新增地址成功，但 fullLocation 只剩「惠城区」。
- **排查**：`element-china-area-data` v6 省市用短码（44、4413），后端要国标 6 位码（440000、441300）。
- **解决**：提交前 `code.padEnd(6,'0')` 补齐；另外该版本导出名是小写 `codeToText`，不是 `CodeToText`。

### 坑 7：删除确认框跑到左上角且被弹窗遮挡

- **现象**：`ElMessageBox.confirm` 叠在已打开的 el-dialog 后面，定位错乱。
- **解决**：弃用 MessageBox，改用独立 `el-dialog` + `align-center` 自定义简洁确认框，层级和居中都正常。

## 4. 项目相关高频面试题（附简短答案）

**Pinia**

- **Pinia 和 Vuex 区别？** 没有 mutations，直接改 state；TS 友好；支持多 store，扁平化无嵌套模块；体积更小。
- **setup 写法里 state/getter/action 分别是什么？** ref/reactive 是 state，computed 是 getter，普通函数是 action，最后 return 出去。
- **持久化怎么做？** pinia-plugin-persistedstate 插件，store 配置 `persist: true`，自动同步 localStorage。
- **store 之间怎么互相调用？** 直接在一个 store 内 import 并调用另一个 `useXxxStore()`（本项目 cartStore 里用 userStore 判断登录）。

**Vue Router**

- **history 和 hash 模式区别？** hash 带 #，靠 hashchange，兼容性好不用后端配置；history 路径美观，刷新需要后端配置 fallback 到 index.html。
- **动态路由参数怎么取？** `useRoute().params.id`，对应路由配置 `:id`。
- **同组件路由切换不刷新怎么办？** onBeforeRouteUpdate 监听，或 watch route.params 重新请求。
- **路由守卫用过吗？** 全局 beforeEach 可做登录鉴权（项目 401 在 axios 拦截器里处理跳登录）；`scrollBehavior` 控制切页回到顶部。
- **路由懒加载？** `component: () => import('xxx.vue')`，按需打包减小首屏体积（本项目当前为静态 import，属于优化点）。

**ECharts**

- **基本使用步骤？** `echarts.init(dom)` → `setOption(option)` → `resize` 自适应 → 卸载 `dispose`。
- **柱状图和折线图共用怎么配？** 两个 series，折线图设 `yAxisIndex: 1` 走第二个 y 轴。
- **为什么要 dispose？** 组件卸载后实例和事件还占内存，反复进入会泄漏；窗口 resize 要手动监听调 resize。
- **数据量过大图表卡怎么办？** 后端聚合、TopN + 其他、`sampling: 'lttb'` 降采样、`large/progressive` 模式、dataZoom 缩放。

**Vue 3 响应式**

- **ref 和 reactive 区别？** ref 支持任意类型，模板自动解包，JS 里用 `.value`；reactive 只能用于对象，深层响应，直接改属性。
- **computed 和 watch 区别？** computed 有缓存、依赖不变不重算，侧重派生值；watch 侧重副作用（请求、操作 DOM），无返回值。
- **nextTick 原理和场景？** DOM 更新是异步批处理的，nextTick 在更新完成后执行；场景：改了 v-if 数据后要操作新 DOM（本项目图表 init 就靠它）。
- **v-if 和 v-show 区别？** v-if 真正增删 DOM，适合不频繁切换；v-show 只切 display，适合频繁切换。
- **v-for 中 key 的作用？** 帮 diff 算法识别节点，列表增删排序时复用更高效，不要用 index 做动态列表的 key。
- **组合式函数（composables）是什么？** 把响应式状态和逻辑封装成 useXxx 函数复用，等价于 Vue2 的 mixin 但无命名冲突、来源清晰。

**其他**

- **axios 拦截器作用？** 请求拦截统一加 token；响应拦截统一处理业务码、错误提示、401 跳登录。
- **token 存哪、怎么带？** 存 localStorage（随 Pinia 持久化），请求头 `Authorization: Bearer token`。
- **登录前后购物车如何一致？** 登录后调合并接口把本地购物车同步到服务端，再拉取服务端列表覆盖本地。

## 5. 项目可优化方向

1. **统计接口后端聚合**：当前前端拉明细再计算，大账号要等几十秒；可由后端提供按月/状态/热销商品的聚合接口 + Redis 缓存，加载可降到 1 秒内。
2. **路由懒加载 + ECharts 按需引入**：目前路由全量静态 import、ECharts 全量引入，首屏包偏大；改为动态 import 和只注册用到的图表模块。
3. **交互体验**：统计页增加时间范围/状态筛选和 dataZoom 下钻；商品列表加骨架屏、按钮防抖与请求取消（AbortController）。
4. **工程化**：引入 TypeScript 约束接口数据类型、ESLint 统一规范，以及地址编辑、订单取消等会员中心功能补全。
