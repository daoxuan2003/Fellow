<template>
    <div class="profile-page" v-if="user.id">
        <header class="header">
            <div class="back-btn" @click="$router.push('/home')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </div>
            <h1>个人资料</h1>
            <button class="edit-btn" @click="toggleEdit">
                {{ isEditing ? '取消' : '编辑' }}
            </button>
        </header>
        
        <main class="main">
            <!-- 头像区域 -->
            <div class="avatar-section">
                <div class="avatar-wrapper">
                    <div class="avatar-large" @click="selectAvatar">
                        <img v-if="form.avatar" :src="form.avatar" alt="头像">
                        <span v-else>{{ form.nickname?.[0]?.toUpperCase() || '?' }}</span>
                    </div>
                    <div class="avatar-edit" @click="selectAvatar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </div>
                </div>
                <div class="profile-name">{{ user.nickname }}</div>
                <div class="profile-id">配对码: {{ user.pairCode }}</div>
            </div>
            
            <!-- 基本信息 -->
            <div class="card">
                <div class="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    基本信息
                </div>
                
                <div class="form-item">
                    <label>昵称</label>
                    <input type="text" v-model="form.nickname" placeholder="输入昵称" :readonly="!isEditing">
                </div>
                
                <div class="form-item">
                    <label>个人简介</label>
                    <input type="text" v-model="form.bio" placeholder="一句话介绍自己" :readonly="!isEditing">
                </div>
                
                <div class="form-item">
                    <label>性别</label>
                    <div class="gender-select">
                        <div 
                            class="gender-option" 
                            :class="{ active: form.gender === 'male', disabled: !isEditing }" 
                            @click="isEditing && (form.gender = 'male')"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4M12 8h.01"/>
                            </svg>
                            男生
                        </div>
                        <div 
                            class="gender-option" 
                            :class="{ active: form.gender === 'female', disabled: !isEditing }" 
                            @click="isEditing && (form.gender = 'female')"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v8M9 11h6"/>
                            </svg>
                            女生
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 账号信息 -->
            <div class="card">
                <div class="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    账号信息
                </div>
                
                <div class="form-item">
                    <label>账号</label>
                    <input type="text" v-model="form.account" readonly>
                </div>
                
                <div class="form-item" v-if="isEditing">
                    <label>新密码（留空不修改）</label>
                    <input type="password" v-model="form.newPassword" placeholder="输入新密码">
                </div>
            </div>
            
            <!-- 情侣信息 -->
            <div class="card" v-if="user.inviteStatus === 'bound'">
                <div class="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    情侣信息
                </div>
                
                <div class="form-item">
                    <label>相爱日期</label>
                    <input 
                        type="date" 
                        v-model="form.loveDate" 
                        :readonly="!isEditing"
                        :max="today"
                    >
                </div>
                
                <div class="form-item">
                    <label>对TA的备注</label>
                    <input type="text" v-model="form.partnerNote" placeholder="给TA起个专属称呼" :readonly="!isEditing">
                </div>
            </div>
            
            <!-- 保存按钮 -->
            <button v-if="isEditing" class="save-btn" @click="saveProfile" :disabled="saving">
                {{ saving ? '保存中...' : '保存修改' }}
            </button>
        </main>
        
        <!-- 头像裁剪弹窗 -->
        <div class="crop-modal" v-if="cropShow" @click.self="cancelCrop">
            <div class="crop-container">
                <div class="crop-header">
                    <button @click="cancelCrop">取消</button>
                    <span>裁剪头像</span>
                    <button class="confirm" @click="confirmCrop">确定</button>
                </div>
                <div class="crop-body">
                    <img ref="cropImage" :src="cropImageSrc" style="max-width: 100%; display: block;">
                </div>
                <div class="crop-footer">拖动调整，双指捏合缩放</div>
            </div>
        </div>
        
        <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleFileChange">
        
        <BottomNav />
    </div>
    
    <div v-else class="loading-screen">
        <div class="loading-spinner"></div>
    </div>
</template>

<script>
import { ref, inject, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'

export default {
    components: { BottomNav },
    setup() {
        const router = useRouter()
        const showToast = inject('showToast')
        
        const user = ref({})
        const form = ref({
            nickname: '',
            bio: '',
            gender: '',
            account: '',
            newPassword: '',
            avatar: '',
            loveDate: '',
            partnerNote: ''
        })
        
        const isEditing = ref(false)
        const saving = ref(false)
        const fileInput = ref(null)
        
        // 裁剪相关
        const cropShow = ref(false)
        const cropImageSrc = ref('')
        const cropImage = ref(null)
        let cropper = null
        
        const token = localStorage.getItem('token')
        
        const today = new Date().toISOString().split('T')[0]
        
        const fetchUser = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/me', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    user.value = data.data
                    form.value = {
                        nickname: data.data.nickname || '',
                        bio: data.data.bio || '',
                        gender: data.data.gender || '',
                        account: data.data.account || '',
                        newPassword: '',
                        avatar: data.data.avatarUrl || '',
                        loveDate: data.data.boundAt ? formatDateForInput(data.data.boundAt) : '',
                        partnerNote: data.data.partnerNote || ''
                    }
                }
            } catch (e) {
                showToast('获取用户信息失败')
            }
        }
        
        const formatDateForInput = (date) => {
            const d = new Date(date)
            return d.toISOString().split('T')[0]
        }
        
        const toggleEdit = () => {
            if (isEditing.value) {
                // 取消编辑，恢复原始值
                form.value.nickname = user.value.nickname || ''
                form.value.bio = user.value.bio || ''
                form.value.gender = user.value.gender || ''
                form.value.newPassword = ''
                form.value.loveDate = user.value.boundAt ? formatDateForInput(user.value.boundAt) : ''
                form.value.partnerNote = user.value.partnerNote || ''
            }
            isEditing.value = !isEditing.value
        }
        
        const selectAvatar = () => {
            fileInput.value?.click()
        }
        
        const handleFileChange = (e) => {
            const file = e.target.files[0]
            if (!file) return
            
            if (file.size > 5 * 1024 * 1024) {
                showToast('图片不能超过5MB')
                return
            }
            
            const reader = new FileReader()
            reader.onload = (event) => {
                cropImageSrc.value = event.target.result
                cropShow.value = true
                
                nextTick(() => {
                    initCropper()
                })
            }
            reader.readAsDataURL(file)
            
            e.target.value = ''
        }
        
        const initCropper = () => {
            if (cropper) {
                cropper.destroy()
            }
            
            // 动态加载 cropperjs
            import('cropperjs').then(({ default: Cropper }) => {
                cropper = new Cropper(cropImage.value, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 0.8,
                    restore: false,
                    guides: false,
                    center: false,
                    highlight: false,
                    cropBoxMovable: false,
                    cropBoxResizable: false,
                    toggleDragModeOnDblclick: false,
                    ready() {
                        // 设置为圆形
                        const cropBox = document.querySelector('.cropper-crop-box')
                        const viewBox = document.querySelector('.cropper-view-box')
                        if (cropBox) cropBox.style.borderRadius = '50%'
                        if (viewBox) viewBox.style.borderRadius = '50%'
                    }
                })
            })
        }
        
        const cancelCrop = () => {
            cropShow.value = false
            cropImageSrc.value = ''
            if (cropper) {
                cropper.destroy()
                cropper = null
            }
        }
        
        const confirmCrop = async () => {
            if (!cropper) return
            
            const canvas = cropper.getCroppedCanvas({
                width: 400,
                height: 400
            })
            
            // 转换为圆形
            const circularCanvas = document.createElement('canvas')
            circularCanvas.width = 400
            circularCanvas.height = 400
            const ctx = circularCanvas.getContext('2d')
            
            ctx.beginPath()
            ctx.arc(200, 200, 200, 0, 2 * Math.PI)
            ctx.closePath()
            ctx.clip()
            ctx.drawImage(canvas, 0, 0)
            
            circularCanvas.toBlob(async (blob) => {
                const formData = new FormData()
                formData.append('avatar', blob, 'avatar.jpg')
                
                try {
                    const res = await fetch(CONFIG.API_URL + '/upload/avatar', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token },
                        body: formData
                    })
                    const data = await res.json()
                    
                    if (data.success) {
                        form.value.avatar = data.data.avatarUrl
                        user.value.avatarUrl = data.data.avatarUrl
                        showToast('头像上传成功')
                        cancelCrop()
                    } else {
                        showToast(data.message)
                    }
                } catch (e) {
                    showToast('上传失败')
                }
            }, 'image/jpeg', 0.9)
        }
        
        const saveProfile = async () => {
            if (!form.value.nickname.trim()) {
                showToast('昵称不能为空')
                return
            }
            
            saving.value = true
            
            try {
                const updateData = {
                    nickname: form.value.nickname,
                    bio: form.value.bio,
                    gender: form.value.gender,
                    partnerNote: form.value.partnerNote
                }
                
                if (form.value.newPassword) {
                    updateData.password = form.value.newPassword
                }
                
                if (form.value.loveDate) {
                    updateData.boundAt = new Date(form.value.loveDate).toISOString()
                }
                
                const res = await fetch(CONFIG.API_URL + '/user/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(updateData)
                })
                
                const data = await res.json()
                
                if (data.success) {
                    showToast('保存成功')
                    user.value = { ...user.value, ...data.data }
                    isEditing.value = false
                    form.value.newPassword = ''
                } else {
                    showToast(data.message)
                }
            } catch (e) {
                showToast('保存失败')
            } finally {
                saving.value = false
            }
        }
        
        onMounted(fetchUser)
        
        return {
            user, form, isEditing, saving, fileInput,
            cropShow, cropImageSrc, cropImage, today,
            toggleEdit, selectAvatar, handleFileChange,
            cancelCrop, confirmCrop, saveProfile
        }
    }
}
</script>

<style>
/* Cropper.js 样式 */
@import 'cropperjs/dist/cropper.css';
</style>

<style scoped>
.profile-page { padding-bottom: 100px; }

.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(10,10,15,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100; }
.back-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); }
.header h1 { font-size: 18px; font-weight: 600; }
.edit-btn { padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); font-size: 14px; cursor: pointer; }

.main { padding: 32px 20px; max-width: 480px; margin: 0 auto; }

/* 头像区域 */
.avatar-section { text-align: center; margin-bottom: 32px; }
.avatar-wrapper { position: relative; display: inline-block; margin-bottom: 16px; }
.avatar-large { width: 100px; height: 100px; border-radius: 50%; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 36px; overflow: hidden; cursor: pointer; position: relative; }
.avatar-large img { width: 100%; height: 100%; object-fit: cover; }
.avatar-large::before { content: ''; position: absolute; inset: -3px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, #FF6B6B, #764BA2); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.avatar-edit { position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; background: var(--color-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; }
.profile-name { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.profile-id { font-size: 13px; color: var(--text-tertiary); }

/* 卡片 */
.card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 16px; }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; margin-bottom: 20px; color: var(--text-secondary); }

.form-item { margin-bottom: 20px; }
.form-item label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.form-item input { width: 100%; padding: 14px 16px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); font-size: 15px; outline: none; transition: all 0.3s; }
.form-item input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(255,107,107,0.1); }
.form-item input[readonly] { opacity: 0.6; cursor: not-allowed; }

.gender-select { display: flex; gap: 12px; }
.gender-option { flex: 1; padding: 14px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.3s; }
.gender-option.active { background: rgba(255,107,107,0.1); border-color: var(--color-primary); color: var(--color-primary); }
.gender-option.disabled { cursor: not-allowed; opacity: 0.6; }

.save-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #FF6B6B, #FF8E8E); border: none; border-radius: var(--radius-md); color: white; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.save-btn:disabled { opacity: 0.6; }

/* 裁剪弹窗 */
.crop-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.crop-container { width: 100%; max-width: 400px; background: var(--bg-dark); border-radius: var(--radius-lg); overflow: hidden; }
.crop-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--border-color); }
.crop-header button { padding: 8px 16px; background: transparent; border: none; color: var(--text-secondary); font-size: 14px; cursor: pointer; }
.crop-header button.confirm { color: var(--color-primary); font-weight: 600; }
.crop-body { padding: 20px; }
.crop-footer { padding: 16px; text-align: center; font-size: 13px; color: var(--text-tertiary); border-top: 1px solid var(--border-color); }

/* Cropper 样式覆盖 */
:deep(.cropper-container) { background: transparent; }
:deep(.cropper-view-box) { border-radius: 50%; outline: none; box-shadow: 0 0 0 2px var(--color-primary); }
:deep(.cropper-face) { border-radius: 50%; }
:deep(.cropper-dashed) { display: none; }

.loading-screen { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
.loading-spinner { width: 48px; height: 48px; border: 3px solid var(--border-color); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>