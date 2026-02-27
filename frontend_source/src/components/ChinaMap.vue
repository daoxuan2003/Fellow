<template>
  <div ref="chartRef" class="w-full h-full" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  visitedProvinces: {
    type: Array,
    default: () => []
  }
})

const chartRef = ref(null)
let chart = null

// 中国地图 GeoJSON URL（阿里 DataV）
const MAP_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'

// 省份名称映射（echarts 使用的名称）
const provinceNameMap = {
  '北京': '北京市',
  '上海': '上海市',
  '天津': '天津市',
  '重庆': '重庆市',
  '河北': '河北省',
  '山西': '山西省',
  '辽宁': '辽宁省',
  '吉林': '吉林省',
  '黑龙江': '黑龙江省',
  '江苏': '江苏省',
  '浙江': '浙江省',
  '安徽': '安徽省',
  '福建': '福建省',
  '江西': '江西省',
  '山东': '山东省',
  '河南': '河南省',
  '湖北': '湖北省',
  '湖南': '湖南省',
  '广东': '广东省',
  '海南': '海南省',
  '四川': '四川省',
  '贵州': '贵州省',
  '云南': '云南省',
  '陕西': '陕西省',
  '甘肃': '甘肃省',
  '青海': '青海省',
  '台湾': '台湾省',
  '内蒙古': '内蒙古自治区',
  '广西': '广西壮族自治区',
  '西藏': '西藏自治区',
  '宁夏': '宁夏回族自治区',
  '新疆': '新疆维吾尔自治区',
  '香港': '香港特别行政区',
  '澳门': '澳门特别行政区'
}

// 城市到省份的映射
const cityToProvinceName = {
  '北京': '北京市', '上海': '上海市', '天津': '天津市', '重庆': '重庆市',
  '石家庄': '河北省', '太原': '山西省', '呼和浩特': '内蒙古自治区',
  '沈阳': '辽宁省', '大连': '辽宁省', '长春': '吉林省', '哈尔滨': '黑龙江省',
  '南京': '江苏省', '苏州': '江苏省', '无锡': '江苏省', '常州': '江苏省', '徐州': '江苏省', '扬州': '江苏省', '镇江': '江苏省',
  '杭州': '浙江省', '宁波': '浙江省', '温州': '浙江省', '绍兴': '浙江省', '嘉兴': '浙江省', '台州': '浙江省', '金华': '浙江省', '湖州': '浙江省', '衢州': '浙江省', '丽水': '浙江省', '舟山': '浙江省',
  '合肥': '安徽省', '芜湖': '安徽省', '蚌埠': '安徽省',
  '福州': '福建省', '厦门': '福建省', '泉州': '福建省',
  '南昌': '江西省', '赣州': '江西省',
  '济南': '山东省', '青岛': '山东省', '烟台': '山东省', '威海': '山东省', '淄博': '山东省', '枣庄': '山东省', '东营': '山东省', '潍坊': '山东省', '济宁': '山东省', '泰安': '山东省', '日照': '山东省', '临沂': '山东省', '德州': '山东省', '聊城': '山东省', '滨州': '山东省', '菏泽': '山东省',
  '郑州': '河南省', '洛阳': '河南省', '开封': '河南省',
  '武汉': '湖北省', '宜昌': '湖北省', '襄阳': '湖北省',
  '长沙': '湖南省', '张家界': '湖南省', '岳阳': '湖南省',
  '广州': '广东省', '深圳': '广东省', '珠海': '广东省', '佛山': '广东省', '东莞': '广东省', '中山': '广东省', '惠州': '广东省', '汕头': '广东省', '湛江': '广东省', '江门': '广东省', '肇庆': '广东省', '茂名': '广东省',
  '南宁': '广西壮族自治区', '桂林': '广西壮族自治区', '北海': '广西壮族自治区',
  '海口': '海南省', '三亚': '海南省',
  '成都': '四川省', '绵阳': '四川省', '乐山': '四川省', '峨眉山': '四川省', '九寨沟': '四川省', '都江堰': '四川省',
  '贵阳': '贵州省', '遵义': '贵州省',
  '昆明': '云南省', '大理': '云南省', '丽江': '云南省', '西双版纳': '云南省', '香格里拉': '云南省',
  '拉萨': '西藏自治区',
  '西安': '陕西省', '咸阳': '陕西省',
  '兰州': '甘肃省', '嘉峪关': '甘肃省', '敦煌': '甘肃省',
  '西宁': '青海省',
  '银川': '宁夏回族自治区',
  '乌鲁木齐': '新疆维吾尔自治区',
  '台北': '台湾省', '高雄': '台湾省', '台中': '台湾省',
  '香港': '香港特别行政区', '澳门': '澳门特别行政区'
}

async function initMap() {
  if (!chartRef.value) return
  
  try {
    // 加载中国地图 GeoJSON
    const response = await fetch(MAP_URL)
    const chinaJson = await response.json()
    
    // 注册地图
    echarts.registerMap('china', chinaJson)
    
    // 初始化图表
    chart = echarts.init(chartRef.value)
    
    updateMap()
    
    // 响应式
    const resizeObserver = new ResizeObserver(() => {
      chart?.resize()
    })
    resizeObserver.observe(chartRef.value)
    
    // 点击事件
    chart.on('click', (params) => {
      console.log('点击省份:', params.name)
    })
    
  } catch (e) {
    console.error('加载地图失败:', e)
  }
}

function updateMap() {
  if (!chart) return
  
  // 将访问过的城市转换为省份
  const visitedProvinceNames = new Set()
  props.visitedProvinces.forEach(city => {
    const province = cityToProvinceName[city]
    if (province) {
      visitedProvinceNames.add(province)
    }
  })
  
  // 构建地图数据
  const mapData = Object.values(provinceNameMap).map(name => ({
    name,
    value: visitedProvinceNames.has(name) ? 1 : 0,
    itemStyle: {
      areaColor: visitedProvinceNames.has(name) ? '#3B82F6' : '#E5E7EB',
      borderColor: '#fff',
      borderWidth: 1
    },
    emphasis: {
      itemStyle: {
        areaColor: visitedProvinceNames.has(name) ? '#2563EB' : '#D1D5DB'
      },
      label: {
        show: true,
        color: '#fff'
      }
    },
    label: {
      show: visitedProvinceNames.has(name),
      color: '#fff',
      fontSize: 10
    }
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const isVisited = params.value === 1
        return `<div style="padding: 8px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
          <div style="color: ${isVisited ? '#3B82F6' : '#9CA3AF'};">
            ${isVisited ? '✓ 已打卡' : '○ 未打卡'}
          </div>
        </div>`
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: '#374151'
      }
    },
    series: [{
      name: '中国地图',
      type: 'map',
      map: 'china',
      roam: true, // 允许缩放和平移
      zoom: 1.5, // 初始放大，填满容器
      center: [105, 36], // 地图中心点微调
      scaleLimit: {
        min: 1,
        max: 5
      },
      data: mapData,
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 1
      },
      select: {
        disabled: true
      }
    }]
  }
  
  chart.setOption(option)
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
})

// 监听数据变化
watch(() => props.visitedProvinces, () => {
  updateMap()
}, { deep: true })
</script>
