<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { getUserOrder } from '@/apis/order'

// ===== 常量定义 =====
// 已付款（计入消费统计）的订单状态：2待发货 3待收货 4待评价 5已完成
const PAID_STATES = [2, 3, 4, 5]
// 全部订单状态映射（与 UserOrder 页面保持一致）
const STATE_MAP = {
  1: '待付款',
  2: '待发货',
  3: '待收货',
  4: '待评价',
  5: '已完成',
  6: '已取消'
}
// 主题色板：活力橙 + 藏青
const PALETTE = ['#ff5a1f', '#001f54', '#ffb302', '#1dc779', '#8e7dff', '#cf4444']
// 分页拉取参数：后端单页响应较慢，页大小取 20；
// 公共演示账号可能有数万笔订单（上千页），全量拉取不现实，
// 因此统计窗口限定为"最近 MAX_PAGES 页"，并发也限制为 2 防止请求被服务端中止
const PAGE_SIZE = 20
const MAX_PAGES = 5
const CONCURRENCY = 2

// ===== 数据状态 =====
const loading = ref(true)
const loadError = ref(false)
const orders = ref([]) // 统计窗口内的订单
const totalCountAll = ref(0) // 账号全部订单总数（取自后端 counts，不受窗口限制）
const truncated = ref(false) // 是否只统计了最近部分订单
const loadProgress = ref('') // 加载进度提示
// 图表实例
let trendChart = null
let stateChart = null
let goodsChart = null

// 卡片 2/3/4 的范围标签：全量时用"总"，截断时标明统计窗口
const scopeLabel = computed(() =>
  truncated.value ? `近 ${orders.value.length} 单` : '总'
)

// 顶部四张统计卡片
const cards = reactive({
  totalCount: 0, // 总订单数
  totalAmount: 0, // 总消费金额（已付款订单）
  totalSkuCount: 0, // 购买商品件数
  avgAmount: 0 // 客单价
})

// ===== 步骤一：拉取订单记录（大账号限定最近窗口） =====
// 单页拉取：超时放宽到 60s，失败自动重试 1 次（后端偶发慢响应/中止）
const fetchPage = async (page) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await getUserOrder(
        { orderState: 0, page, pageSize: PAGE_SIZE },
        { timeout: 60000 }
      )
    } catch (e) {
      if (attempt === 1) throw e
      await new Promise((r) => setTimeout(r, 800))
    }
  }
}

const loadAllOrders = async () => {
  loadProgress.value = '正在请求订单数据…'
  const first = await fetchPage(1)
  let items = [...first.result.items]
  const counts = first.result.counts
  totalCountAll.value = counts
  // 需要拉取的剩余页数（最多到 MAX_PAGES 页，即最近 100 单）
  const totalPages = Math.ceil(counts / PAGE_SIZE)
  const fetchPages = Math.min(totalPages, MAX_PAGES)
  truncated.value = totalPages > MAX_PAGES
  // 分批拉取，每批 CONCURRENCY 页，避免高并发被服务端中止
  for (let start = 2; start <= fetchPages; start += CONCURRENCY) {
    const batch = []
    for (let p = start; p < start + CONCURRENCY && p <= fetchPages; p++) {
      batch.push(p)
    }
    loadProgress.value = `正在加载订单数据（第 ${batch.join('、')} / ${fetchPages} 页）…`
    const res = await Promise.all(batch.map((p) => fetchPage(p)))
    res.forEach((r) => items.push(...r.result.items))
  }
  orders.value = items
}

// ===== 步骤二：把订单记录聚合为图表数据 =====
// 1) 近 6 个月消费趋势（月份锚定到最新一单所在月，避免老测试数据落在图表外）
const trendData = computed(() => {
  const months = []
  const countMap = new Map()
  const amountMap = new Map()
  if (orders.value.length) {
    // 用原生 Math.max 求最新订单时间（避免引入 dayjs 的 minMax 插件）
    const latest = dayjs(
      Math.max(...orders.value.map((o) => dayjs(o.createTime).valueOf()))
    )
    for (let i = 5; i >= 0; i--) {
      const key = latest.subtract(i, 'month').format('YYYY-MM')
      months.push(key)
      countMap.set(key, 0)
      amountMap.set(key, 0)
    }
    orders.value.forEach((o) => {
      const key = dayjs(o.createTime).format('YYYY-MM')
      if (countMap.has(key)) {
        countMap.set(key, countMap.get(key) + 1)
        if (PAID_STATES.includes(o.orderState)) {
          amountMap.set(key, amountMap.get(key) + (o.payMoney || 0))
        }
      }
    })
  }
  return {
    months: months.map((m) => m.slice(5) + '月'), // 仅展示 月-月
    counts: months.map((m) => countMap.get(m)),
    amounts: months.map((m) => Number(amountMap.get(m).toFixed(2)))
  }
})

// 2) 订单状态分布（环形图）
const stateData = computed(() =>
  Object.keys(STATE_MAP).map((state, i) => ({
    name: STATE_MAP[state],
    value: orders.value.filter((o) => o.orderState === Number(state)).length,
    itemStyle: { color: PALETTE[i] }
  }))
)

// 3) 热销商品 Top5（按已付款订单中的购买件数聚合）
const goodsData = computed(() => {
  const map = new Map()
  orders.value.forEach((o) => {
    if (!PAID_STATES.includes(o.orderState)) return
    o.skus.forEach((sku) => {
      map.set(sku.name, (map.get(sku.name) || 0) + sku.quantity)
    })
  })
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reverse() // ECharts 类目轴自下而上，reverse 后第一名显示在最上方
})

// ===== 统计卡片汇总 =====
const buildCards = () => {
  const paidOrders = orders.value.filter((o) => PAID_STATES.includes(o.orderState))
  // 总订单数取后端返回的全部订单总数；金额/件数/客单价按统计窗口计算
  cards.totalCount = totalCountAll.value
  cards.totalAmount = paidOrders.reduce((sum, o) => sum + (o.payMoney || 0), 0)
  cards.totalSkuCount = paidOrders.reduce(
    (sum, o) => sum + o.skus.reduce((n, sku) => n + sku.quantity, 0),
    0
  )
  cards.avgAmount = paidOrders.length
    ? cards.totalAmount / paidOrders.length
    : 0
}

// ===== 步骤三：ECharts 渲染 =====
const renderTrend = () => {
  trendChart = echarts.init(document.getElementById('trend-chart'))
  trendChart.setOption({
    color: [PALETTE[0], PALETTE[1]],
    tooltip: { trigger: 'axis' },
    legend: { data: ['订单数', '消费金额(元)'], top: 0 },
    grid: { left: 50, right: 50, top: 45, bottom: 30 },
    xAxis: { type: 'category', data: trendData.value.months },
    yAxis: [
      { type: 'value', name: '订单数', minInterval: 1 },
      { type: 'value', name: '金额(元)' }
    ],
    series: [
      {
        name: '订单数',
        type: 'bar',
        barWidth: 22,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: trendData.value.counts
      },
      {
        name: '消费金额(元)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        data: trendData.value.amounts
      }
    ]
  })
}

const renderState = () => {
  stateChart = echarts.init(document.getElementById('state-chart'))
  stateChart.setOption({
    color: PALETTE,
    tooltip: { trigger: 'item', formatter: '{b}: {c} 单 ({d}%)' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
    series: [
      {
        name: '订单状态',
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '45%'],
        label: { formatter: '{b}\n{c} 单' },
        data: stateData.value
      }
    ]
  })
}

const renderGoods = () => {
  goodsChart = echarts.init(document.getElementById('goods-chart'))
  goodsChart.setOption({
    color: [PALETTE[0]],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 40, top: 20, bottom: 20, containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: {
      type: 'category',
      data: goodsData.value.map((g) => g[0]),
      axisLabel: {
        width: 110,
        overflow: 'truncate',
        formatter: (v) => (v.length > 12 ? v.slice(0, 12) + '…' : v)
      }
    },
    series: [
      {
        name: '购买件数',
        type: 'bar',
        barWidth: 16,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' },
        data: goodsData.value.map((g) => g[1])
      }
    ]
  })
}

const renderAll = () => {
  // 重试场景下先销毁旧实例，避免在同一 DOM 上重复 init
  trendChart?.dispose()
  stateChart?.dispose()
  goodsChart?.dispose()
  renderTrend()
  renderState()
  renderGoods()
}

// 窗口缩放时图表自适应
const resizeAll = () => {
  trendChart?.resize()
  stateChart?.resize()
  goodsChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', resizeAll)
})

// 拉取数据并渲染图表（首次加载与失败重试共用）
const loadData = async () => {
  loading.value = true
  loadError.value = false
  try {
    await loadAllOrders()
    buildCards()
  } catch (e) {
    // 请求失败（如登录过期、网络异常）显示重试，不误报“暂无数据”
    loadError.value = true
    console.error('[订单统计] 数据加载失败', e)
  } finally {
    // 必须先让 loading 置为 false，v-if 才会把图表容器渲染到 DOM
    loading.value = false
  }
  // 等待 DOM 更新完成后再初始化 ECharts
  await nextTick()
  if (!loadError.value && orders.value.length) renderAll()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  trendChart?.dispose()
  stateChart?.dispose()
  goodsChart?.dispose()
})
</script>

<template>
  <div class="statistics-container">
    <h3>订单统计</h3>

    <div v-if="loading" class="tip">
      <p>{{ loadProgress || '数据加载中…' }}</p>
      <p class="sub">后端响应较慢时可能需要等待 1 分钟左右，请不要离开本页</p>
    </div>

    <div v-else-if="loadError" class="tip">
      <p>数据加载失败，请稍后重试</p>
      <el-button type="primary" @click="loadData">重新加载</el-button>
    </div>

    <template v-else-if="orders.length">
      <!-- 大账号统计范围说明 -->
      <el-alert
        v-if="truncated"
        type="info"
        :closable="false"
        class="scope-alert"
        :title="`该账号共有 ${totalCountAll} 笔订单，数据量过大；以下金额、商品与图表基于最近 ${orders.length} 笔订单统计，趋势图展示近 6 个月情况。`"
      />

      <!-- 顶部统计卡片 -->
      <div class="cards" :class="{ 'with-alert': truncated }">
        <div class="card">
          <p class="num">{{ cards.totalCount }}</p>
          <p class="label">总订单数（单{{ truncated ? '，全部' : '' }}）</p>
        </div>
        <div class="card primary">
          <p class="num">¥{{ cards.totalAmount.toFixed(2) }}</p>
          <p class="label">{{ scopeLabel }}消费金额</p>
        </div>
        <div class="card">
          <p class="num">{{ cards.totalSkuCount }}</p>
          <p class="label">购买商品（件，{{ scopeLabel }}）</p>
        </div>
        <div class="card primary">
          <p class="num">¥{{ cards.avgAmount.toFixed(2) }}</p>
          <p class="label">{{ scopeLabel === '总' ? '客单价' : scopeLabel + '客单价' }}</p>
        </div>
      </div>

      <!-- 近6个月消费趋势 -->
      <div class="panel">
        <h4>近 6 个月消费趋势</h4>
        <div id="trend-chart" class="chart wide"></div>
      </div>

      <div class="panel-row">
        <!-- 订单状态分布 -->
        <div class="panel">
          <h4>订单状态分布{{ truncated ? `（近 ${orders.length} 单）` : '' }}</h4>
          <div id="state-chart" class="chart"></div>
        </div>
        <!-- 热销商品 Top5 -->
        <div class="panel">
          <h4>热销商品 Top5{{ truncated ? `（近 ${orders.length} 单）` : '' }}</h4>
          <div id="goods-chart" class="chart"></div>
        </div>
      </div>
    </template>

    <el-empty v-else description="暂无订单数据，下单后即可查看统计" />
  </div>
</template>

<style scoped lang="scss">
.statistics-container {
  padding: 10px 20px 30px;

  h3 {
    font-size: 22px;
    font-weight: 400;
    margin: 10px 0 20px;
  }

  .tip {
    padding: 120px 0;
    text-align: center;
    color: #999;

    p {
      margin: 0 0 16px;
    }

    .sub {
      margin-top: 8px;
      font-size: 12px;
      color: #bbb;
    }
  }

  .scope-alert {
    margin-bottom: 16px;
  }

  .cards {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;

    &.with-alert {
      margin-top: 0;
    }

    .card {
      flex: 1;
      padding: 22px 20px;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
      background: #fafafa;

      .num {
        font-size: 26px;
        font-weight: 600;
        color: $darkColor;
      }

      .label {
        margin-top: 8px;
        font-size: 13px;
        color: #999;
      }

      // 主题橙强调卡片
      &.primary {
        background: $xtxColor;
        border-color: $xtxColor;

        .num,
        .label {
          color: #fff;
        }
      }
    }
  }

  .panel-row {
    display: flex;
    gap: 16px;
  }

  .panel {
    flex: 1;
    margin-bottom: 20px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    padding: 16px;

    h4 {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      padding-left: 10px;
      border-left: 4px solid $xtxColor;
      line-height: 16px;
    }
  }

  .chart {
    width: 100%;
    height: 320px;

    &.wide {
      height: 340px;
    }
  }
}
</style>
