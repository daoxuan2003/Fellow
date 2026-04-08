<template>
  <div class="cropper-overlay" @click.self="$emit('cancel')">
    <div class="cropper-container">
      <div class="cropper-header">
        <h3>调整照片</h3>
        <button class="btn-close" @click="$emit('cancel')">×</button>
      </div>
      
      <div class="cropper-body">
        <div class="cropper-wrapper">
          <img ref="imageRef" :src="imageSrc" alt="待裁剪图片" />
        </div>
        
        <div class="cropper-tips">
          <p>🎯 拖动调整位置，滚轮缩放大小</p>
          <p>让化妆品主体居中显示</p>
        </div>
      </div>
      
      <div class="cropper-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">取消</button>
        <button class="btn btn-primary" @click="confirmCrop">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const props = defineProps({
  imageSrc: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const imageRef = ref(null)
let cropper = null

onMounted(async () => {
  await nextTick()
  
  cropper = new Cropper(imageRef.value, {
    aspectRatio: 1,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 0.9,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
    ready() {
      // 自动缩放以适应容器
      this.cropper.zoomTo(0.5)
    }
  })
})

function confirmCrop() {
  if (!cropper) return
  
  // 获取裁剪后的图片（正方形，高质量）
  const canvas = cropper.getCroppedCanvas({
    width: 800,
    height: 800,
    fillColor: '#fff',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  })
  
  // 转换为 blob
  canvas.toBlob((blob) => {
    emit('confirm', blob)
  }, 'image/jpeg', 0.9)
}

// 清理
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
})
</script>

<style scoped>
.cropper-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.cropper-container {
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cropper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.cropper-header h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.btn-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f5f5f5;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #eeeeee;
  transform: scale(1.1);
}

.cropper-body {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cropper-wrapper {
  flex: 1;
  min-height: 300px;
  background: #f5f5f5;
  border-radius: 16px;
  overflow: hidden;
}

.cropper-wrapper img {
  max-width: 100%;
  display: block;
}

/* 覆盖 cropperjs 默认样式 */
:deep(.cropper-container) {
  border-radius: 16px;
}

:deep(.cropper-view-box) {
  border-radius: 12px;
  outline: 2px solid var(--color-primary);
  outline-color: var(--color-primary);
}

:deep(.cropper-face) {
  background-color: transparent;
}

:deep(.cropper-line) {
  background-color: var(--color-primary);
}

:deep(.cropper-point) {
  background-color: var(--color-primary);
}

.cropper-tips {
  text-align: center;
  padding: 16px 0 0;
}

.cropper-tips p {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.cropper-tips p:first-child {
  color: var(--color-primary);
  font-weight: 500;
}

.cropper-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f5f5f5;
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: #eeeeee;
}

.btn-primary {
  background: linear-gradient(135deg, #E91E63 0%, #F48FB1 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(233, 30, 99, 0.4);
}
</style>
