<script setup>
import { getCheckInfoAPI,createOrderAPI } from '@/apis/checkout'
import { addAddressAPI, deleteAddressAPI } from '@/apis/address'
// 省市区三级联动数据（后端 /region/tree 接口不可用，使用前端数据包，编码为国标6位行政区划码）
import { regionData, codeToText } from 'element-china-area-data'
import { ref,reactive,onMounted,computed } from 'vue'
import {useRouter} from 'vue-router'
import { ElMessage } from 'element-plus'
import {useCartStore} from '@/stores/cartStore'
import { useUserStore } from '@/stores/userStore'
const cartStore = useCartStore()
const userStore = useUserStore()
const router = useRouter()

const checkInfo = ref({})  // 订单对象
const curAddress = ref({})  // 默认地址对象
// 从购物车中筛选已选中的商品，渲染到结算页
const selectedGoods = computed(() => cartStore.cartList.filter(item => item.selected))
// 金额明细（从已选商品计算）
const goodsCount = computed(() => selectedGoods.value.reduce((s, i) => s + i.count, 0))
const totalPrice = computed(() => selectedGoods.value.reduce((s, i) => s + i.price * i.count, 0))
const postFee = computed(() => checkInfo.value.summary?.postFee ?? 0)
const totalPayPrice = computed(() => totalPrice.value + postFee.value)
const getCheckInfo=async()=>{
    const res=await getCheckInfoAPI()
    checkInfo.value=res.result
    // 设配默认地址
    // 从地址列表中筛选出来 isDefault ===0 那一项
    const item=checkInfo.value.userAddresses.find(item=>item.isDefault === 0)
    curAddress.value=item
   }
onMounted(async ()=>{
    // 已登录则从服务端同步最新购物车，避免本地持久化数据与服务端不一致导致"无有效商品"
    if (userStore.userInfo.token) {
      await cartStore.updateNewList()
    }
    getCheckInfo()
})
// 控制弹框打开
const showDialog = ref(false)
// 配送时间：1不限 2工作日 3双休日
const deliveryTimeType = ref(1)
// 支付方式：1在线支付 2货到付款
const payType = ref(1)
// 切换地址
const activeAddress = ref({})
const switchAddress=(item)=>{
    activeAddress.value=item
}
const confirm=()=>{
  curAddress.value=activeAddress.value
  showDialog.value=false
  activeAddress.value={}
}

// 删除地址：自定义简洁确认弹窗（避免 ElMessageBox 与切换地址弹窗的层级/定位冲突）
const delTarget = ref(null) // 待删除的地址对象
const deleteConfirmVisible = ref(false)
const deleting = ref(false)
const deleteAddress=(item)=>{
  delTarget.value=item
  deleteConfirmVisible.value=true
}
// 确认删除
const confirmDelete=async()=>{
  if(!delTarget.value)return
  deleting.value=true
  try{
    await deleteAddressAPI(delTarget.value.id)
    ElMessage.success('地址已删除')
    deleteConfirmVisible.value=false
    // 刷新地址列表数据
    const res = await getCheckInfoAPI()
    checkInfo.value = res.result
    // 若删除的正是页面当前使用的地址：改选默认地址，没有默认则取第一条，都没有则置空
    if (curAddress.value.id === delTarget.value.id) {
      curAddress.value =
        checkInfo.value.userAddresses.find((a) => a.isDefault === 0) ||
        checkInfo.value.userAddresses[0]
    }
    // 弹窗内待确认的选中项若被删，一并清空
    if (activeAddress.value.id === delTarget.value.id) activeAddress.value = {}
    delTarget.value=null
  }catch{
    // 删除失败（网络异常等，拦截器已有错误提示）：弹窗保留，可重试
  }finally{
    deleting.value=false
  }
}

// ===== 添加地址 =====
const addFlag = ref(false) // 新增地址弹层显隐
const submitting = ref(false) // 保存按钮 loading
const addressFormRef = ref()
const addressForm = reactive({
  receiver: '', // 收货人
  contact: '', // 手机号
  region: [], // 省市区三级联动选中的编码 [provinceCode, cityCode, countyCode]
  address: '', // 详细地址
  isDefault: 1 // 是否默认地址：0是 1否（与后端约定一致），默认不勾选
})
// 表单校验规则
const addressRules = {
  receiver: [
    { required: true, message: '请输入收货人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为 2-20 个字符', trigger: 'blur' }
  ],
  contact: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的 11 位手机号', trigger: 'blur' }
  ],
  region: [
    {
      required: true,
      validator: (rule, value, callback) =>
        value && value.length === 3
          ? callback()
          : callback(new Error('请选择省 / 市 / 区')),
      trigger: 'change'
    }
  ],
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' },
    { min: 5, max: 50, message: '详细地址长度为 5-50 个字符', trigger: 'blur' }
  ]
}
// 打开弹层时先重置表单，避免残留上次输入
const openAddDialog = () => {
  addressForm.receiver = ''
  addressForm.contact = ''
  addressForm.region = []
  addressForm.address = ''
  addressForm.isDefault = 1
  addFlag.value = true
}
// 校验通过后提交新地址
const submitAddress = async () => {
  try {
    await addressFormRef.value.validate()
  } catch {
    return // 校验未通过，保留弹层让用户修改
  }
  submitting.value = true
  try {
    // 数据包省/市用短码（如 44、4413），后端要求国标 6 位码，右侧补 0：44→440000、4413→441300；区县已是 6 位
    const [pCode, cCode, dCode] = addressForm.region
    const provinceCode = pCode.padEnd(6, '0')
    const cityCode = cCode.padEnd(6, '0')
    const countyCode = dCode.padEnd(6, '0')
    const res = await addAddressAPI({
      receiver: addressForm.receiver.trim(),
      contact: addressForm.contact.trim(),
      provinceCode,
      cityCode,
      countyCode,
      // 省市区文字，例如 "广东省 惠州市 惠城区"（短码可直接在 codeToText 中查到文字）
      fullLocation: [pCode, cCode, dCode]
        .map((code) => codeToText[code])
        .join(' '),
      address: addressForm.address.trim(),
      isDefault: addressForm.isDefault
    })
    ElMessage.success('地址添加成功')
    addFlag.value = false
    // 重新拉取结算信息，刷新地址列表与运费
    await getCheckInfo()
    // 自动选中刚创建的地址，直接用于下单
    const created = checkInfo.value.userAddresses.find(
      (item) => item.id === res.result.id
    )
    if (created) curAddress.value = created
  } finally {
    submitting.value = false
  }
}

// 创建订单
const createOrder=async()=>{
      // 兜底：没有选中商品时不发请求
      if (selectedGoods.value.length === 0) {
        ElMessage({ type: 'warning', message: '请先选择要结算的商品' })
        return
      }
      const res = await createOrderAPI({
      deliveryTimeType: deliveryTimeType.value,
      payType: payType.value,
      payChannel:1,
      buyerMessage: ' ',
      goods: selectedGoods.value.map(item=>{
        return {
          skuId:item.skuId,
          count:item.count
        }
      }),
      addressId:curAddress.value.id
     })
     const orderId=res.result.id
     router.push({
        path:'/pay',
        query:{
            id:orderId
        }
     })
    //  更新购物车
    cartStore.updateNewList()
}
</script>

<template>
  <div class="xtx-pay-checkout-page">
    <div class="container">
      <div class="wrapper">
        <!-- 收货地址 -->
        <h3 class="box-title">收货地址</h3>
        <div class="box-body">
          <div class="address">
            <div class="text">
              <div class="none" v-if="!curAddress">您需要先添加收货地址才可提交订单。</div>
              <ul v-else>
                <li><span>收<i />货<i />人：</span>{{ curAddress.receiver }}</li>
                <li><span>联系方式：</span>{{ curAddress.contact }}</li>
                <li><span>收货地址：</span>{{ curAddress.fullLocation }} {{ curAddress.address }}</li>
              </ul>
            </div>
            <div class="action">
              <el-button size="large" @click="showDialog = true">切换地址</el-button>
              <el-button size="large" type="primary" @click="openAddDialog">添加地址</el-button>
            </div>
          </div>
        </div>
        <!-- 商品信息 -->
        <h3 class="box-title">商品信息</h3>
        <div class="box-body">
          <table class="goods">
            <thead>
              <tr>
                <th width="520">商品信息</th>
                <th width="170">单价</th>
                <th width="170">数量</th>
                <th width="170">小计</th>
                <th width="170">实付</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in selectedGoods" :key="i.id">
                <td>
                  <a href="javascript:;" class="info">
                    <img :src="i.picture" alt="">
                    <div class="right">
                      <p>{{ i.name }}</p>
                      <p>{{ i.attrsText }}</p>
                    </div>
                  </a>
                </td>
                <td>&yen;{{ i.price }}</td>
                <td>{{ i.count }}</td>
                <td>&yen;{{ (i.price * i.count).toFixed(2) }}</td>
                <td>&yen;{{ (i.price * i.count).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 配送时间 -->
        <h3 class="box-title">配送时间</h3>
        <div class="box-body">
          <a class="my-btn" :class="{active: deliveryTimeType === 1}" @click="deliveryTimeType = 1" href="javascript:;">不限送货时间：周一至周日</a>
          <a class="my-btn" :class="{active: deliveryTimeType === 2}" @click="deliveryTimeType = 2" href="javascript:;">工作日送货：周一至周五</a>
          <a class="my-btn" :class="{active: deliveryTimeType === 3}" @click="deliveryTimeType = 3" href="javascript:;">双休日、假日送货：周六至周日</a>
        </div>
        <!-- 支付方式 -->
        <h3 class="box-title">支付方式</h3>
        <div class="box-body">
          <a class="my-btn" :class="{active: payType === 1}" @click="payType = 1" href="javascript:;">在线支付</a>
          <a class="my-btn" :class="{active: payType === 2}" @click="payType = 2" href="javascript:;">货到付款</a>
          <span style="color:#999">货到付款需付5元手续费</span>
        </div>
        <!-- 金额明细 -->
        <h3 class="box-title">金额明细</h3>
        <div class="box-body">
          <div class="total">
            <dl>
              <dt>商品件数：</dt>
              <dd>{{ goodsCount }}件</dd>
            </dl>
            <dl>
              <dt>商品总价：</dt>
              <dd>¥{{ totalPrice.toFixed(2) }}</dd>
            </dl>
            <dl>
              <dt>运<i></i>费：</dt>
              <dd>¥{{ postFee.toFixed(2) }}</dd>
            </dl>
            <dl>
              <dt>应付总额：</dt>
              <dd class="price">{{ totalPayPrice.toFixed(2) }}</dd>
            </dl>
          </div>
        </div>
        <!-- 提交订单 -->
        <div class="submit">
          <el-button @click="createOrder" type="primary" size="large" >提交订单</el-button>
        </div>
      </div>
    </div>
  </div>
  <!-- 切换地址 -->
   <el-dialog v-model="showDialog" title="切换收货地址" width="30%" center>
  <div class="addressWrapper">
    <div class="text item" :class="{'active':activeAddress.id === item.id}"  @click="switchAddress(item)"  v-for="item in checkInfo.userAddresses"  :key="item.id">
      <ul>
      <li><span>收<i />货<i />人：</span>{{ item.receiver }} </li>
      <li><span>联系方式：</span>{{ item.contact }}</li>
      <li><span>收货地址：</span>{{ item.fullLocation + item.address }}</li>
      </ul>
      <!-- 删除按钮：stop 阻止冒泡，避免点删除时同时选中该地址 -->
      <el-button
        class="del-btn"
        link
        type="danger"
        size="small"
        @click.stop="deleteAddress(item)"
      >删除</el-button>
    </div>
    <el-empty v-if="!checkInfo.userAddresses?.length" description="暂无收货地址，请点击页面上的“添加地址”新建" :image-size="80" />
  </div>
  <template #footer>
    <span class="dialog-footer">
      <el-button @click="showDialog = false">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </span>
  </template>
</el-dialog>
  <!-- 添加地址 -->
  <el-dialog v-model="addFlag" title="新增收货地址" width="34%" center>
    <el-form
      ref="addressFormRef"
      :model="addressForm"
      :rules="addressRules"
      label-width="92px"
      class="address-form"
    >
      <el-form-item label="收货人" prop="receiver">
        <el-input v-model="addressForm.receiver" placeholder="请输入收货人姓名" maxlength="20" />
      </el-form-item>
      <el-form-item label="手机号" prop="contact">
        <el-input v-model="addressForm.contact" placeholder="请输入 11 位手机号" maxlength="11" />
      </el-form-item>
      <el-form-item label="所在地区" prop="region">
        <el-cascader
          v-model="addressForm.region"
          :options="regionData"
          placeholder="请选择省 / 市 / 区"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="详细地址" prop="address">
        <el-input
          v-model="addressForm.address"
          type="textarea"
          :rows="2"
          placeholder="街道、楼牌号等详细信息"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="设为默认">
        <el-switch v-model="addressForm.isDefault" :active-value="0" :inactive-value="1" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="addFlag = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitAddress">
        保存并使用
      </el-button>
    </template>
  </el-dialog>

  <!-- 删除地址确认弹窗：简洁居中样式，独立 dialog 避免与切换弹窗层级冲突 -->
  <el-dialog
    v-model="deleteConfirmVisible"
    width="380px"
    align-center
    :show-close="false"
    class="del-confirm"
  >
    <div class="del-confirm__body">
      <span class="del-confirm__icon">?</span>
      <p class="del-confirm__title">确认删除该收货地址吗？</p>
      <p v-if="delTarget" class="del-confirm__desc">
        {{ delTarget.receiver }} {{ delTarget.contact }}
      </p>
    </div>
    <template #footer>
      <div class="del-confirm__footer">
        <el-button size="large" class="del-confirm__btn" @click="deleteConfirmVisible = false">
          取消
        </el-button>
        <el-button
          size="large"
          type="primary"
          class="del-confirm__btn del-confirm__btn--danger"
          :loading="deleting"
          @click="confirmDelete"
        >
          确认删除
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.xtx-pay-checkout-page {
  margin-top: 20px;

  .wrapper {
    background: #fff;
    padding: 0 20px;

    .box-title {
      font-size: 16px;
      font-weight: normal;
      padding-left: 10px;
      line-height: 70px;
      border-bottom: 1px solid #f5f5f5;
    }

    .box-body {
      padding: 20px 0;
    }
  }
}

.address {
  border: 1px solid #f5f5f5;
  display: flex;
  align-items: center;

  .text {
    flex: 1;
    min-height: 90px;
    display: flex;
    align-items: center;

    .none {
      line-height: 90px;
      color: #999;
      text-align: center;
      width: 100%;
    }

    >ul {
      flex: 1;
      padding: 20px;

      li {
        line-height: 30px;

        span {
          color: #999;
          margin-right: 5px;

          >i {
            width: 0.5em;
            display: inline-block;
          }
        }
      }
    }

    >a {
      color: $xtxColor;
      width: 160px;
      text-align: center;
      height: 90px;
      line-height: 90px;
      border-right: 1px solid #f5f5f5;
    }
  }

  .action {
    width: 420px;
    text-align: center;

    .btn {
      width: 140px;
      height: 46px;
      line-height: 44px;
      font-size: 14px;

      &:first-child {
        margin-right: 10px;
      }
    }
  }
}

.goods {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;

  .info {
    display: flex;
    text-align: left;

    img {
      width: 70px;
      height: 70px;
      margin-right: 20px;
    }

    .right {
      line-height: 24px;

      p {
        &:last-child {
          color: #999;
        }
      }
    }
  }

  tr {
    th {
      background: #f5f5f5;
      font-weight: normal;
    }

    td,
    th {
      text-align: center;
      padding: 20px;
      border-bottom: 1px solid #f5f5f5;

      &:first-child {
        border-left: 1px solid #f5f5f5;
      }

      &:last-child {
        border-right: 1px solid #f5f5f5;
      }
    }
  }
}

.my-btn {
  width: 228px;
  height: 50px;
  border: 1px solid #e4e4e4;
  text-align: center;
  line-height: 48px;
  margin-right: 25px;
  color: #666666;
  display: inline-block;

  &.active,
  &:hover {
    border-color: $xtxColor;
  }
}

.total {
  dl {
    display: flex;
    justify-content: flex-end;
    line-height: 50px;

    dt {
      i {
        display: inline-block;
        width: 2em;
      }
    }

    dd {
      width: 240px;
      text-align: right;
      padding-right: 70px;

      &.price {
        font-size: 20px;
        color: $priceColor;
      }
    }
  }
}

.submit {
  text-align: right;
  padding: 60px;
  border-top: 1px solid #f5f5f5;
}

.addressWrapper {
  max-height: 500px;
  overflow-y: auto;
}

.text {
  flex: 1;
  min-height: 90px;
  display: flex;
  align-items: center;

  &.item {
    position: relative;
    border: 1px solid #f5f5f5;
    margin-bottom: 10px;
    cursor: pointer;

    &.active,
    &:hover {
      border-color: $xtxColor;
      background: lighten($xtxColor, 50%);
    }

    // 右上角删除按钮：常态半透明，悬停卡片时全显
    .del-btn {
      position: absolute;
      top: 8px;
      right: 10px;
      opacity: 0.55;
    }

    &:hover .del-btn {
      opacity: 1;
    }

    >ul {
      padding: 10px;
      font-size: 14px;
      line-height: 30px;
    }
  }
}
</style>

<!-- 删除确认弹窗样式：弹窗 teleport 到 body，需用非 scoped 样式命中 -->
<style lang="scss">
.del-confirm.el-dialog {
  border-radius: 12px;
  padding: 8px 10px;
  overflow: hidden;

  // 无标题，隐藏自带 header 占位
  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 30px 24px 10px;
  }

  .el-dialog__footer {
    padding: 10px 24px 26px;
  }

  .del-confirm__body {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  // 橙色圆形问号图标
  .del-confirm__icon {
    width: 52px;
    height: 52px;
    margin-bottom: 18px;
    border-radius: 50%;
    background: $xtxColor;
    color: #fff;
    font-size: 30px;
    font-weight: 700;
    line-height: 52px;

    // 问号视觉居中微调
    padding-left: 2px;
    box-sizing: border-box;
  }

  .del-confirm__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: $darkColor;
  }

  .del-confirm__desc {
    margin: 10px 0 0;
    font-size: 13px;
    color: #999;
  }

  .del-confirm__footer {
    display: flex;
    gap: 14px;
  }

  .del-confirm__btn {
    flex: 1;
    height: 44px;
    margin: 0;
    font-size: 15px;
  }

  // 取消：白底灰边
  .del-confirm__btn {
    border-color: #ddd;
    color: #666;
  }

  // 确认：主题橙实心
  .del-confirm__btn--danger {
    border-color: $xtxColor;
    background: $xtxColor;

    &:hover,
    &:focus {
      border-color: lighten($xtxColor, 8%);
      background: lighten($xtxColor, 8%);
    }
  }
}
</style>