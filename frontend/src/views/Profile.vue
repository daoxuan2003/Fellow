<template>
    <div class="profile-page" v-if="user.id">
        <header class="header">
            <div class="back-btn" @click="$router.push('/home')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </div>
            <h1>个人资料</h1>
            <button class="edit-btn" @click="isEditing = !isEditing">
                {{ isEditing ? '取消' : '编辑' }}
            </button>
        </header>
        
        <main class="main">
            <div class="avatar-section">
                <div class="avatar-large" @click="selectAvatar">
                    <img v-if="form.avatar" :src="form.avatar">
                    <span v-else>{{ form.nickname?.[0] }}</span>
                </div>
                <input type="file" ref="fileInput" accept="image/*" @change="handleAvatar" style="display: none">
            </div>
            
            <div class="form-section">
                <div class="form-item">
                    <label>昵称</label>
                    <input v-model="form.nickname" :readonly="!isEditing">
                </div>
                <div class="form-item">
                    <label>账号</label>
                    <input v-model="form.account" readonly>
                </div>
                <div class="form-item">
                    <label>简介</label>
                    <input v-model="form.bio" :readonly="!isEditing" placeholder="一句话介绍自己">
                </div>
                
                <button v-if="isEditing" class="save-btn" @click="saveProfile" :disabled="saving">
                    {{ saving ? '保存中...' : '保存' }}
                </button>
            </div>
        </main>
        
        <BottomNav @toast="showToast" />
    </div>
</template>

<script>
import { ref, inject, onMounted } from 'vue'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'

export default {
    components: { BottomNav },
    setup() {
        const showToast = inject('showToast')
        const user = ref({})
        const form = ref({})
        const isEditing = ref(false)
        const saving = ref(false)
        const fileInput = ref(null)
        const token = localStorage.getItem('token')
        
        const fetchUser = async () => {
            const res = await fetch(CONFIG.API_URL + '/me', { headers: { 'Authorization': 'Bearer ' + token }})
            const data = await res.json()
            if (data.success) {
                user.value = data.data
                form.value = { ...data.data, avatar: data.data.avatarUrl }
            }
        }
        
        const selectAvatar = () => fileInput.value?.click()
        
        const handleAvatar = async (e) => {
            const file = e.target.files[0]
            if (!file) return
            if (file.size > 5 * 1024 * 1024) return showToast('图片不能超过5MB')
            
            const formData = new FormData()
            formData.append('avatar', file)
            const res = await fetch(CONFIG.API_URL + '/upload/avatar', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                form.value.avatar = data.data.avatarUrl
                showToast('头像上传成功')
            }
        }
        
        const saveProfile = async () => {
            saving.value = true
            const res = await fetch(CONFIG.API_URL + '/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({
                    nickname: form.value.nickname,
                    bio: form.value.bio
                })
            })
            const data = await res.json()
            if (data.success) {
                showToast('保存成功')
                isEditing.value = false
                user.value = data.data
            }
            saving.value = false
        }
        
        onMounted(fetchUser)
        
        return { user, form, isEditing, saving, fileInput, selectAvatar, handleAvatar, saveProfile, showToast }
    }
}
</script>

<style scoped>
.profile-page { padding-bottom: 100px; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(10,10,15,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100; }
.back-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); }
.header h1 { font-size: 18px; font-weight: 600; }
.edit-btn { padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); font-size: 14px; cursor: pointer; }

.main { padding: 32px 20px; max-width: 480px; margin: 0 auto; }

.avatar-section { text-align: center; margin-bottom: 32px; }
.avatar-large { width: 100px; height: 100px; border-radius: 50%; background: var(--bg-input); margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 36px; overflow: hidden; cursor: pointer; border: 2px solid var(--border-color); }
.avatar-large img { width: 100%; height: 100%; object-fit: cover; }

.form-section { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; }
.form-item { margin-bottom: 20px; }
.form-item label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.form-item input { width: 100%; padding: 14px 16px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); font-size: 15px; }
.form-item input:focus { outline: none; border-color: var(--color-primary); }

.save-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #FF6B6B, #FF8E8E); border: none; border-radius: var(--radius-md); color: white; font-size: 16px; font-weight: 600; cursor: pointer; }
.save-btn:disabled { opacity: 0.6; }
</style>
