import request from '@/utils/http'

// 收货地址相关接口
// 地址对象字段：id / receiver(收货人) / contact(手机号) /
// provinceCode / cityCode / countyCode(省市区编码) / address(详细地址) /
// isDefault(0默认地址 1普通地址) / fullLocation(省市区文字) / postalCode / addressTags

// 新增收货地址
export const addAddressAPI = (data) => {
  return request({
    url: '/member/address',
    method: 'POST',
    data
  })
}

// 删除收货地址（后端使用路径参数：DELETE /member/address/:id）
export const deleteAddressAPI = (id) => {
  return request({
    url: `/member/address/${id}`,
    method: 'DELETE'
  })
}
