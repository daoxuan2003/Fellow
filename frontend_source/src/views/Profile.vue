<template>
  <div class="profile-page">
    <!-- 背景 -->
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
    </div>
    
    <!-- 主应用 -->
    <div class="app">
      <main class="profile-paper-app" :style="profileGenderStyle">
        <header class="profile-paper-header">
          <h1>我们</h1>
          <button type="button" class="profile-settings-btn" aria-label="关于共赴" @click="showAbout = true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05-2.88 2.88-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21h-4v-.05A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.86.34l-.05.05-2.88-2.88.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3v-4h.05A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.86l-.05-.05 2.88-2.88.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3h4v.05A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.86-.34l.05-.05 2.88 2.88-.05.05A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21v4h-.05A1.7 1.7 0 0 0 19.4 15Z"></path>
            </svg>
          </button>
        </header>

        <section class="profile-couple" aria-label="我们的关系">
          <button type="button" class="profile-person me" aria-label="修改我的头像" @click="selectAvatar">
            <span class="profile-avatar">
              <img v-if="editForm.avatar" :src="editForm.avatar" alt="我的头像" crossorigin="anonymous">
              <b v-else>{{ editForm.nickname ? editForm.nickname.charAt(0).toUpperCase() : '?' }}</b>
            </span>
            <small>{{ editForm.nickname || '我' }}</small>
          </button>

          <CoupleThread class="profile-heart-thread" />

          <div class="profile-person partner-person">
            <span class="profile-avatar">
              <img v-if="profilePartner.avatarUrl || profilePartner.avatar" :src="profilePartner.avatarUrl || profilePartner.avatar" alt="伴侣头像" crossorigin="anonymous">
              <b v-else>{{ profilePartner.nickname?.charAt(0)?.toUpperCase() || '?' }}</b>
            </span>
            <small>{{ profilePartner.nickname || partnerPronoun }}</small>
          </div>

          <div class="profile-bound-copy">
            <p v-if="user.partnerId">已绑定 · 一起生活 <strong>{{ profileTogetherDays }}</strong> 天</p>
            <p v-else>{{ user.inviteStatus === 'idle' ? `配对码 ${user.pairCode || '加载中'}` : '等待绑定确认' }}</p>
            <button v-if="!isEditing" type="button" @click="startEdit">编辑我们的资料</button>
            <span v-else class="profile-edit-actions">
              <button type="button" @click="cancelEdit">取消</button>
              <button type="button" class="save" :disabled="saving" @click="saveProfile">{{ saving ? '保存中' : '保存' }}</button>
            </span>
          </div>
          <input type="file" ref="avatarInput" accept="image/*" hidden @change="handleAvatarChange">
        </section>

        <section class="profile-paper-card profile-shared-card">
          <h2>我们的资料</h2>
          <div class="profile-paper-row">
            <span><i aria-hidden="true">♡</i> 相爱纪念日</span>
            <DatePickerField v-if="isEditing && user.partnerId" v-model="editForm.loveDate" :max="today" display-class="profile-paper-input" placeholder="请选择纪念日" />
            <strong v-else>{{ profileDateText(user.anniversary, user.partnerId ? '还未设置' : '绑定后设置') }}</strong>
          </div>
          <div class="profile-paper-row">
            <span><i aria-hidden="true">♢</i> 我的生日</span>
            <DatePickerField v-if="isEditing" v-model="editForm.birthday" display-class="profile-paper-input" placeholder="请选择生日" />
            <strong v-else>{{ profileDateText(user.birthday, '还未设置') }}</strong>
          </div>
          <div v-if="user.partnerId" class="profile-paper-row">
            <span><i aria-hidden="true">♢</i> {{ partnerPronoun }}的生日</span>
            <strong>{{ profileDateText(partnerBirthday, `${partnerPronoun}还未设置`) }}</strong>
          </div>
        </section>

        <section class="profile-paper-card profile-about-me">
          <h2>关于我</h2>
          <template v-if="isEditing">
            <label class="profile-edit-field">
              <span>昵称</span>
              <input v-model="editForm.nickname" maxlength="20" placeholder="输入昵称">
            </label>
            <label class="profile-edit-field">
              <span>个人简介</span>
              <input v-model="editForm.bio" maxlength="80" placeholder="一句话介绍自己">
            </label>
            <div class="profile-gender-edit">
              <span>性别</span>
              <button type="button" :class="{ active: editForm.gender === 'female' }" @click="editForm.gender = 'female'">女生</button>
              <button type="button" :class="{ active: editForm.gender === 'male' }" @click="editForm.gender = 'male'">男生</button>
            </div>
          </template>
          <p v-else>{{ user.bio || '还没有写下个人简介' }}</p>
        </section>

        <section v-if="isEditing" class="profile-paper-card profile-edit-details">
          <h2>更多资料</h2>
          <label class="profile-edit-field">
            <span>对{{ partnerPronoun }}的备注</span>
            <input v-model="editForm.partnerNote" maxlength="30" :placeholder="`给${partnerPronoun}起个专属昵称`">
          </label>
          <label class="profile-edit-field">
            <span>首页小留言</span>
            <input v-model="editForm.homeMessage" maxlength="32" :placeholder="`给${partnerPronoun}留一句话`">
          </label>
          <label class="profile-edit-field readonly">
            <span>登录账号</span>
            <input v-model="editForm.account" readonly>
          </label>
          <label class="profile-edit-field">
            <span>当前密码</span>
            <input v-model="editForm.currentPassword" type="password" autocomplete="current-password" placeholder="修改密码时填写">
          </label>
          <label class="profile-edit-field">
            <span>新密码</span>
            <input v-model="editForm.newPassword" type="password" minlength="8" autocomplete="new-password" placeholder="不修改请留空">
          </label>
        </section>

        <section class="profile-paper-card profile-space-card">
          <h2>专属空间</h2>
          <button type="button" class="profile-setting-row" @click="toggleNotifications">
            <span><i aria-hidden="true">♢</i><b>消息提醒</b><small>{{ notificationStatusText }}</small></span>
            <em class="profile-switch" :class="{ active: settings.notifications }"><i></i></em>
          </button>
          <button type="button" class="profile-setting-row" @click="showAbout = true">
            <span><i aria-hidden="true">♡</i><b>关于共赴</b><small>用户协议、隐私政策与更新日志</small></span>
            <strong>{{ appVersion }} ›</strong>
          </button>
        </section>

        <section class="profile-paper-actions">
          <button type="button" class="logout" @click="confirmLogout">退出登录</button>
          <button v-if="user.inviteStatus === 'bound'" type="button" class="unbind" @click="confirmUnbind">解除绑定关系</button>
        </section>
      </main>

      <!-- 编辑模式标签 -->
      <div class="edit-mode-badge" :class="{ show: isEditing }">编辑模式</div>
      
      <!-- 顶部导航 -->
      <header class="header">
        <div class="header-back" @click="goBack">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </div>
        <div class="header-title">个人资料</div>
        <div class="header-actions">
          <button v-if="!isEditing" class="header-edit-btn" @click="startEdit">编辑</button>
          <template v-else>
            <button class="header-edit-btn cancel" @click="cancelEdit">取消</button>
            <button class="header-edit-btn save" @click="saveProfile" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </template>
        </div>
      </header>
      
      <!-- 主内容 -->
      <main class="main">
        <!-- 头像区域 -->
        <div class="profile-header">
          <div class="avatar-wrapper">
            <div class="avatar-large" @click="selectAvatar">
              <img v-if="editForm.avatar" :src="editForm.avatar" alt="头像" crossorigin="anonymous">
              <span v-else>{{ editForm.nickname ? editForm.nickname.charAt(0).toUpperCase() : '?' }}</span>
            </div>
            <div class="avatar-edit" @click="selectAvatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <input type="file" ref="avatarInput" accept="image/*" style="display: none" @change="handleAvatarChange">
          </div>
          <div class="profile-name">{{ user.nickname || '加载中...' }}</div>
          <div class="profile-id" :class="{ connected: user.partnerId }">
            <span v-if="user.partnerId">已绑定专属空间</span>
            <span v-else-if="user.inviteStatus === 'idle'">配对码: {{ user.pairCode || '...' }}</span>
            <span v-else>等待绑定确认</span>
          </div>
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
            <label class="form-label">昵称</label>
            <input type="text" class="form-input" v-model="editForm.nickname" placeholder="输入昵称" :readonly="!isEditing">
          </div>
          
          <div class="form-item">
            <label class="form-label">个人简介</label>
            <input type="text" class="form-input" v-model="editForm.bio" placeholder="一句话介绍自己" :readonly="!isEditing">
          </div>
          
          <div class="form-item">
            <label class="form-label">性别</label>
            <div class="gender-select">
              <div class="gender-option" :class="{ active: editForm.gender === 'male', disabled: !isEditing }" @click="isEditing && (editForm.gender = 'male')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                男生
              </div>
              <div class="gender-option" :class="{ active: editForm.gender === 'female', disabled: !isEditing }" @click="isEditing && (editForm.gender = 'female')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
            <label class="form-label">邮箱 / 手机号</label>
            <input type="text" class="form-input" v-model="editForm.account" placeholder="用于登录" readonly>
          </div>
          
          <div class="form-item" v-if="isEditing">
            <label class="form-label">修改密码</label>
            <input type="password" class="form-input" v-model="editForm.newPassword" placeholder="不修改请留空">
          </div>
        </div>
        
        <!-- 恋爱信息 -->
        <div class="card">
          <div class="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            恋爱信息
          </div>
          
          <div class="form-item" v-if="user.partnerId">
            <label class="form-label">相爱纪念日</label>
            <DatePickerField v-model="editForm.loveDate" :disabled="!isEditing" :max="today" display-class="form-input" placeholder="请选择纪念日" />
          </div>
          
          <div class="form-item" v-else>
            <label class="form-label">相爱纪念日</label>
            <div class="form-input" style="color: var(--text-tertiary); cursor: not-allowed;">
              绑定情侣后即可设置
            </div>
          </div>
          
          <div class="form-item">
            <label class="form-label">对TA的备注</label>
            <input type="text" class="form-input" v-model="editForm.partnerNote" placeholder="给TA起个专属昵称" :readonly="!isEditing">
          </div>
          
          <div class="form-item">
            <label class="form-label">我的生日</label>
            <DatePickerField v-model="editForm.birthday" :disabled="!isEditing" display-class="form-input" placeholder="请选择生日" />
          </div>
          
          <div class="form-item" v-if="user.partnerId">
            <label class="form-label">对方的生日</label>
            <div class="form-input" style="color: var(--text-tertiary); cursor: not-allowed;">
              {{ partnerBirthday || '对方未设置生日' }}
            </div>
          </div>
        </div>
        
        <!-- 设置 -->
        <div class="card">
          <div class="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            设置
          </div>
          
          <div class="setting-item">
            <div class="setting-left">
              <div class="setting-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div class="setting-info">
                <h4>开启通知</h4>
                <p>{{ notificationStatusText }}</p>
              </div>
            </div>
            <div class="switch" :class="{ active: settings.notifications }" @click="toggleNotifications"></div>
          </div>
          
          <div class="setting-item" @click="showAbout = true">
            <div class="setting-left">
              <div class="setting-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div class="setting-info">
                <h4>关于共赴</h4>
                <p>{{ appVersion }}</p>
              </div>
            </div>
            <div class="setting-right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 退出登录 -->
        <div class="logout-section">
          <button class="btn-logout" @click="confirmLogout">
            退出登录
          </button>
          
          <!-- 解绑按钮 - 低调设计，仅在已绑定时显示 -->
          <button 
            v-if="user.inviteStatus === 'bound'" 
            class="btn-unbind" 
            @click="confirmUnbind"
          >
            解除绑定关系
          </button>
        </div>
      </main>
      
      <!-- Toast -->
      <div
        class="toast"
        :class="{ show: toast.show, success: toast.type === 'success', error: toast.type === 'error' }"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>{{ toast.message }}</span>
      </div>
      
      <!-- 确认对话框 -->
      <div class="confirm-overlay" :class="{ show: confirm.show }" @click.self="cancelConfirm">
        <div class="confirm-dialog">
          <div class="confirm-title">{{ confirm.title }}</div>
          <div class="confirm-message">{{ confirm.message }}</div>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="cancelConfirm">{{ confirm.cancelText }}</button>
            <button class="confirm-btn confirm" :class="{ danger: confirm.isDanger }" @click="doConfirm">{{ confirm.confirmText }}</button>
          </div>
        </div>
      </div>
      
      <!-- 头像裁剪模态框 -->
      <div class="crop-overlay" :class="{ show: cropper.show }" v-if="cropper.show">
        <div class="crop-header">
          <button class="crop-btn" @click="closeCropper">取消</button>
          <span class="crop-title">调整头像</span>
          <button class="crop-btn confirm" @click="confirmCrop" :disabled="cropper.loading">
            <span v-if="cropper.loading" class="spinner"></span>
            <span v-else>确认</span>
          </button>
        </div>
        <div class="crop-preview-area">
          <div class="crop-image-container">
            <img ref="cropImage" class="crop-image" :src="cropper.imageUrl" alt="裁剪图片">
          </div>
        </div>
        <div class="crop-footer">拖动调整，双指缩放，将在圆形区域内裁剪</div>
      </div>
      
      <!-- 关于共赴弹窗 -->
      <div class="about-overlay" :class="{ show: showAbout }" @click.self="showAbout = false">
        <div class="about-dialog">
          <div class="about-header">
            <h3>关于共赴</h3>
            <button class="about-close" @click="showAbout = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="about-content">
            <div class="about-brand">
              <h2>💕 共赴</h2>
              <p class="about-version">版本 {{ appVersion }}</p>
              <p class="about-slogan">两个人的私密空间</p>
            </div>
            
            <div class="about-menu">
              <div class="about-item" @click="showChangelog = true">
                <span>版本更新日志</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="about-item" @click="openAboutDocument('terms')">
                <span>用户协议</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="about-item" @click="openAboutDocument('privacy')">
                <span>隐私政策</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="about-item" @click="openAboutDocument('contact')">
                <span>联系我们</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
            
            <div class="about-footer">
              <a href="https://beian.miit.gov.cn/" target="_blank" class="about-icp">吉ICP备2026000987号-1</a>
              <p class="about-copyright">2026 金道炫</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 关于页文档弹窗 -->
      <div class="about-overlay" :class="{ show: currentAboutDocument }" @click.self="closeAboutDocument">
        <div class="about-dialog legal-dialog">
          <div class="about-header">
            <h3>{{ currentAboutDocument?.title }}</h3>
            <button class="about-close" @click="closeAboutDocument">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div v-if="currentAboutDocument" class="about-content legal-content">
            <p class="legal-updated">{{ currentAboutDocument.updated }}</p>
            <section v-for="section in currentAboutDocument.sections" :key="section.title" class="legal-section">
              <h4>{{ section.title }}</h4>
              <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
            </section>
          </div>
        </div>
      </div>
      
      <!-- 版本更新日志弹窗 -->
      <div class="about-overlay" :class="{ show: showChangelog }" @click.self="showChangelog = false">
        <div class="about-dialog" style="max-height: 70vh; display: flex; flex-direction: column;">
          <div class="about-header" style="flex-shrink: 0;">
            <h3>版本更新日志</h3>
            <button class="about-close" @click="showChangelog = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div ref="changelogContent" class="about-content" style="overflow-y: auto; flex: 1;">
            <div v-if="changelogLoading" class="changelog-loading">加载中...</div>
            <template v-else>
              <div v-for="(log, index) in changelog" :key="index" class="changelog-item">
                <h4>v{{ log.version }} <span class="changelog-date">{{ log.date }}</span></h4>
                <ul>
                  <li v-for="(change, idx) in log.changes" :key="idx">{{ change }}</li>
                </ul>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部导航 -->
    <BottomNav v-show="!hideBottomNav" @toast="showToast" />
  </div>
</template>

<script setup>
// 定义组件名称，用于 keep-alive 匹配
defineOptions({ name: 'Profile' })
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'

import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { useUserStore } from '../stores/user.js'
import { clearAvatarCache } from '../utils/cache.js'
import { createClientLogger } from '../utils/client-logger.js'
import { todayLocalDate } from '../utils/date.js'
import { FALLBACK_CHANGELOG, getChangelog, getVersion, getVersionSync } from '../utils/version.js'
import { 
  isNotificationSupported, 
  requestNotificationPermission,
  getNotificationPermission,
  subscribePush,
  unsubscribePush,
  getSubscriptionStatus
} from '../utils/notification.js'
import BottomNav from '../components/BottomNav.vue'
import DatePickerField from '../components/DatePickerField.vue'
import CoupleThread from '../components/CoupleThread.vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const router = useRouter()
const { onMessage, send } = useWebSocket()
const userStore = useUserStore()
const logger = createClientLogger('Profile')
const avatarInput = ref(null)
const cropImage = ref(null)
let cropperInstance = null
let unsubscribeWS = null

// 初始化用户数据（切换账号时必须清空）
const user = reactive({
  nickname: '',
  pairCode: '',
  partnerId: null,
  inviteStatus: 'idle',
  birthday: null,
  avatar: '',
  // 编辑模式需要的字段
  bio: '',
  gender: '',
  account: '',
  anniversary: '',  // 纪念日（恋爱日期）
  partnerNote: '',
  homeMessage: ''
})

const partnerBirthday = ref('')

// 初始化表单（切换账号时必须清空）
const editForm = reactive({
  nickname: '',
  bio: '',
  gender: '',
  account: '',
  currentPassword: '',
  newPassword: '',
  loveDate: '',
  partnerNote: '',
  birthday: '',
  avatar: '',
  homeMessage: ''
})

// 标记是否已初始化（防止显示旧数据）
const isInitialized = ref(false)

// 清空所有用户数据
const clearUserData = () => {
  Object.assign(user, {
    nickname: '',
    pairCode: '',
    partnerId: null,
    inviteStatus: 'idle',
    birthday: null,
    avatar: '',
    bio: '',
    gender: '',
    account: '',
    anniversary: '',
    partnerNote: '',
    homeMessage: ''
  })
  
  Object.assign(editForm, {
    nickname: '',
    bio: '',
    gender: '',
    account: '',
    currentPassword: '',
    newPassword: '',
    loveDate: '',
    partnerNote: '',
    birthday: '',
    avatar: '',
    homeMessage: ''
  })
  
  partnerBirthday.value = ''
  isInitialized.value = false
}

// 初始化数据函数
const initUserData = () => {
  const storeUser = userStore.currentUser
  
  // 如果 store 中没有用户数据，不初始化（保持空状态）
  if (!storeUser) {
    clearUserData()
    return
  }
  
  const inviteStatus = storeUser.inviteStatus || (storeUser.connected ? 'bound' : 'idle')
  const canShowPairCode = !storeUser.partnerId && !storeUser.connected && inviteStatus === 'idle'

  const initialUser = {
    nickname: storeUser.nickname || '',
    pairCode: canShowPairCode ? (storeUser.pairCode || '') : '',
    partnerId: storeUser.partnerId || null,
    inviteStatus,
    birthday: storeUser.birthday || null,
    avatar: storeUser.avatarUrl || storeUser.avatar || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    anniversary: storeUser.anniversary || '',
    partnerNote: storeUser.partnerNote || '',
    homeMessage: storeUser.homeMessage || ''
  }
  
  Object.assign(user, initialUser)
  
  Object.assign(editForm, {
    nickname: storeUser.nickname || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    currentPassword: '',
    newPassword: '',
    loveDate: storeUser.anniversary ? storeUser.anniversary.split('T')[0] : '',
    partnerNote: storeUser.partnerNote || '',
    birthday: storeUser.birthday ? storeUser.birthday.split('T')[0] : '',
    avatar: storeUser.avatarUrl || storeUser.avatar || '',
    homeMessage: storeUser.homeMessage || ''
  })
  
  // 同步对方的生日
  const storePartner = userStore.currentPartner
  if (storePartner?.birthday) {
    partnerBirthday.value = String(storePartner.birthday).split('T')[0]
  } else {
    partnerBirthday.value = ''
  }
  
  isInitialized.value = true
}

const settings = reactive({
  notifications: false  // 通知总开关
})

const isEditing = ref(false)
const saving = ref(false)

const toast = reactive({
  show: false,
  message: '',
  type: 'success',
  timer: null
})

const confirm = reactive({
  show: false,
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  isDanger: false,
  action: null
})

const cropper = reactive({
  show: false,
  imageUrl: '',
  loading: false
})

const showAbout = ref(false)
const showChangelog = ref(false)
const currentAboutDocument = ref(null)
const changelogContent = ref(null)

const aboutDocuments = {
  terms: {
    title: '用户协议',
    updated: '更新日期：2026-06-29',
    sections: [
      {
        title: '服务内容',
        paragraphs: [
          '共赴为情侣提供共同记录生活、计划、心愿、账本、相册和健康提醒的私密空间。应用会根据登录身份和当前绑定关系展示相关数据。'
        ]
      },
      {
        title: '账号与内容',
        paragraphs: [
          '请使用真实且有权提交的信息，不要上传违法、侵权、骚扰或泄露他人隐私的内容。你需要妥善保管账号凭据，账号内操作会被视为本人授权操作。',
          '你可以在资料页管理头像、昵称、情侣绑定和登录状态。解除关系后，双方共享空间将停止继续同步。'
        ]
      },
      {
        title: '功能变更',
        paragraphs: [
          '共赴会持续改进体验、安全和功能。重要更新会通过版本日志说明，必要时也会调整本协议内容。继续使用应用即表示你接受已生效的更新。'
        ]
      }
    ]
  },
  privacy: {
    title: '隐私政策',
    updated: '更新日期：2026-06-29',
    sections: [
      {
        title: '我们收集什么',
        paragraphs: [
          '我们仅处理注册登录、情侣绑定、头像、相册、纪念日、计划、心愿、账本、健康提醒等你主动提交或使用功能时产生的数据。'
        ]
      },
      {
        title: '数据如何使用',
        paragraphs: [
          '这些数据用于账号识别、情侣空间同步、提醒、统计、备份和问题排查。情侣共享数据只在当前绑定关系内展示，个人记录按功能规则保持私密。',
          '生产环境不会在接口响应中返回密码、令牌、存储凭据或无关个人字段。配对码仅用于本人查看和发起邀请，不会通过公开资料向无关用户展示。'
        ]
      },
      {
        title: '你的控制权',
        paragraphs: [
          '如需处理账号、导出或删除数据、反馈隐私问题，请通过“联系我们”说明账号、页面和具体诉求。请不要在反馈中发送密码、验证码或令牌。'
        ]
      }
    ]
  },
  contact: {
    title: '联系我们',
    updated: '服务支持信息',
    sections: [
      {
        title: '维护信息',
        paragraphs: [
          '应用维护者：金道炫',
          '备案信息：吉ICP备2026000987号-1'
        ]
      },
      {
        title: '反馈范围',
        paragraphs: [
          '你可以反馈账号登录、情侣绑定、数据删除、隐私问题、功能建议、页面异常和同步问题。',
          '为了更快定位问题，请描述账号、发生时间、所在页面、操作步骤和异常截图。请勿发送密码、验证码或登录令牌。'
        ]
      }
    ]
  }
}

const openAboutDocument = (key) => {
  currentAboutDocument.value = aboutDocuments[key] || null
}

const closeAboutDocument = () => {
  currentAboutDocument.value = null
}

// 当关于页弹窗打开时，隐藏底部导航
const hideBottomNav = computed(() => {
  return showAbout.value || showChangelog.value || !!currentAboutDocument.value
})

// 监听 showChangelog，打开时滚动到顶部
watch(showChangelog, (newVal) => {
  if (newVal && changelogContent.value) {
    nextTick(() => {
      changelogContent.value.scrollTop = 0
    })
  }
})
const appVersion = ref(getVersionSync())

// 从 version.json 动态获取更新日志
const changelog = ref(FALLBACK_CHANGELOG)

// 加载版本信息和更新日志
onMounted(async () => {
  try {
    const [version, log] = await Promise.all([getVersion(), getChangelog()])
    appVersion.value = version
    changelog.value = log
  } catch (e) {
    logger.warn('加载更新日志失败', e)
    appVersion.value = getVersionSync()
    changelog.value = FALLBACK_CHANGELOG
  }
})

const today = todayLocalDate()

const profilePartner = computed(() => userStore.currentPartner || {})
const partnerPronoun = computed(() => {
  if (profilePartner.value.gender === 'female') return '她'
  if (profilePartner.value.gender === 'male') return '他'
  return 'TA'
})
const profileTogetherDays = computed(() => {
  if (!user.anniversary) return 0
  const anniversary = new Date(user.anniversary)
  const start = new Date(anniversary.getFullYear(), anniversary.getMonth(), anniversary.getDate())
  const now = new Date()
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(1, Math.floor((current - start) / 86400000))
})
const profileColorForGender = (gender) => {
  if (gender === 'female') return '#ff6475'
  if (gender === 'male') return '#5d8cff'
  return '#8b7cf6'
}
const profileGenderStyle = computed(() => ({
  '--profile-me': profileColorForGender(user.gender),
  '--profile-partner': profileColorForGender(profilePartner.value.gender)
}))
const profileDateText = (value, fallback) => {
  if (!value) return fallback
  const raw = String(value).split('T')[0]
  const parts = raw.split('-')
  if (parts.length !== 3) return fallback
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

const showToast = (message, type = 'success') => {
  toast.message = message
  toast.type = type
  toast.show = true
  if (toast.timer) clearTimeout(toast.timer)
  toast.timer = setTimeout(() => toast.show = false, 3000)
}

// 通知状态文本
const notificationStatusText = computed(() => {
  if (!isNotificationSupported()) {
    return '当前设备不支持'
  }
  const permission = getNotificationPermission()
  if (permission === 'denied') {
    return '请在系统设置中开启'
  }
  return settings.notifications ? '已开启' : '接收纪念日等提醒'
})

// 切换通知开关
const toggleNotifications = async () => {
  logger.debug('点击通知开关')
  
  if (!isNotificationSupported()) {
    logger.debug('不支持通知')
    showToast('当前浏览器不支持通知功能（需要 HTTPS 或 localhost）', 'error')
    return
  }
  
  const permission = getNotificationPermission()
  logger.debug('当前权限', permission)
  
  if (permission === 'denied') {
    showToast('请在系统设置中开启通知权限', 'error')
    return
  }
  
  if (!settings.notifications) {
    // 开启通知
    logger.debug('请求通知权限')
    const granted = await requestNotificationPermission()
    logger.debug('权限结果', granted)
    
    if (!granted) {
      showToast('需要通知权限才能开启', 'error')
      return
    }
    
    // 权限已获取，尝试订阅 Push
    logger.debug('开始订阅 Push')
    showToast('正在订阅推送服务...')
    
    const result = await subscribePush()
    logger.debug('订阅结果', result)
    
    if (result.success) {
      settings.notifications = true
      saveNotificationSettings(true)  // 保存到 localStorage（按用户）
      
      // 保存到服务器（全部开启）
      try {
        const token = localStorage.getItem('token')
        await fetch(`${CONFIG.API_URL}/habits/notification-settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            weeklyReport: true,
            dailyReminder: true,
            partnerActivity: true
          })
        })
      } catch (e) {
        logger.error('保存通知设置失败', e)
      }
      
      showToast('通知已开启')
    } else {
      // Push 订阅失败，显示具体错误原因
      showToast(result.error || '通知订阅失败', 'error')
      settings.notifications = false
      saveNotificationSettings(false)
    }
  } else {
    // 关闭通知
    logger.debug('关闭通知')
    await unsubscribePush()
    settings.notifications = false
    saveNotificationSettings(false)  // 保存到 localStorage（按用户）
    showToast('通知已关闭')
  }
}



const showConfirm = (options) => {
  confirm.title = options.title
  confirm.message = options.message
  confirm.confirmText = options.confirmText || '确认'
  confirm.cancelText = options.cancelText || '取消'
  confirm.isDanger = options.isDanger || false
  confirm.action = options.action
  confirm.show = true
}

const cancelConfirm = () => {
  confirm.show = false
}

const doConfirm = () => {
  if (confirm.action) confirm.action()
  confirm.show = false
}

const fetchPairCodeIfNeeded = async () => {
  if (user.partnerId || user.inviteStatus !== 'idle' || user.pairCode) return
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const res = await fetch(`${CONFIG.API_URL}/user/pair-code`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success && data.data?.pairCode) {
      user.pairCode = data.data.pairCode
      const currentUser = userStore.currentUser
      if (currentUser) {
        userStore.updateUserData({ ...currentUser, pairCode: data.data.pairCode }, userStore.currentPartner)
      }
    }
  } catch (e) {
    logger.error('获取配对码失败', e)
  }
}

const fetchUserInfo = async (force = false) => {
  // 如果不是强制刷新，且数据未过期，则使用缓存
  if (!force && !userStore.isDataStale && userStore.currentUser) {
    logger.debug('使用缓存数据')
    // 确保数据同步
    syncFromStore()
    fetchPairCodeIfNeeded()
    return
  }
  
  // 如果已经在加载中，跳过
  if (userStore.isLoading) return
  
  userStore.setLoading(true)
  try {
    const res = await fetch(`${CONFIG.API_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      Object.assign(user, data.user)
      user.pairCode = ''
      Object.assign(editForm, {
        nickname: data.user.nickname || '',
        bio: data.user.bio || '',
        gender: data.user.gender || '',
        account: data.user.account || '',
        loveDate: data.user.anniversary ? data.user.anniversary.split('T')[0] : '',
        partnerNote: data.user.partnerNote || '',
        birthday: data.user.birthday ? data.user.birthday.split('T')[0] : '',
        avatar: data.user.avatar || '',
        currentPassword: '',
        newPassword: '',
        homeMessage: data.user.homeMessage || ''
      })
      user.inviteStatus = data.user.connected ? 'bound' : 'idle'
      user.birthday = data.user.birthday
      if (!data.user.connected) {
        await fetchPairCodeIfNeeded()
      }
      // 获取对方的生日
      if (data.user.partner?.birthday) {
        partnerBirthday.value = data.user.partner.birthday.split('T')[0]
      } else {
        partnerBirthday.value = ''
      }
      // 更新 store - 需要转换 connected 为 inviteStatus
      // 注意：1) partner 数据可能不完整（缺少头像等），需要安全合并
      //       2) 后端返回的是 avatar 字段，需要同时设置 avatarUrl 供 Home 使用
      const userData = {
        ...data.user,
        ...(user.pairCode && { pairCode: user.pairCode }),
        inviteStatus: data.user.connected ? 'bound' : 'idle',
        avatarUrl: data.user.avatar  // 兼容字段：avatar 和 avatarUrl 指向同一URL
      }
      // 安全合并 partner 数据：只更新有值的字段，保留原有头像
      const currentPartner = userStore.currentPartner
      const safePartner = data.user.partner ? {
        ...currentPartner,
        ...Object.fromEntries(
          Object.entries(data.user.partner).filter(([_, v]) => v !== undefined && v !== null)
        )
      } : currentPartner
      userStore.updateUserData(userData, safePartner)
    }
  } catch (e) {
    showToast('获取用户信息失败', 'error')
  } finally {
    userStore.setLoading(false)
  }
}

// 从 store 同步数据到本地
const syncFromStore = () => {
  const storeUser = userStore.currentUser
  if (!storeUser) return
  
  Object.assign(user, {
    nickname: storeUser.nickname || '',
    pairCode: (!storeUser.partnerId && !storeUser.connected && storeUser.inviteStatus === 'idle') ? (storeUser.pairCode || '') : '',
    partnerId: storeUser.partnerId || null,
    inviteStatus: storeUser.inviteStatus || (storeUser.connected ? 'bound' : 'idle'),
    birthday: storeUser.birthday || null,
    avatar: storeUser.avatarUrl || storeUser.avatar || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    anniversary: storeUser.anniversary || '',
    partnerNote: storeUser.partnerNote || '',
    homeMessage: storeUser.homeMessage || ''
  })
  
  Object.assign(editForm, {
    nickname: storeUser.nickname || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    currentPassword: '',
    newPassword: '',
    loveDate: storeUser.anniversary ? String(storeUser.anniversary).split('T')[0] : '',
    partnerNote: storeUser.partnerNote || '',
    birthday: storeUser.birthday ? String(storeUser.birthday).split('T')[0] : '',
    avatar: storeUser.avatarUrl || storeUser.avatar || '',
    homeMessage: storeUser.homeMessage || ''
  })
  
  // 同步对方的生日
  const storePartner = userStore.currentPartner
  if (storePartner?.birthday) {
    partnerBirthday.value = String(storePartner.birthday).split('T')[0]
  } else {
    partnerBirthday.value = ''
  }
}

const goBack = () => {
  router.push('/home')
}

const startEdit = () => {
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  // 从 user 对象恢复 editForm（user 对象存储的是原始数据）
  editForm.nickname = user.nickname || ''
  editForm.bio = user.bio || ''
  editForm.gender = user.gender || ''
  editForm.currentPassword = ''
  editForm.newPassword = ''
  // 纪念日存储在 user.anniversary，但 editForm 中使用 loveDate
  editForm.loveDate = user.anniversary ? String(user.anniversary).split('T')[0] : ''
  editForm.partnerNote = user.partnerNote || ''
  editForm.birthday = user.birthday ? String(user.birthday).split('T')[0] : ''
  editForm.homeMessage = user.homeMessage || ''
}

const saveProfile = async () => {
  if (!editForm.nickname.trim()) {
    showToast('请输入昵称', 'error')
    return
  }
  if (editForm.newPassword && !editForm.currentPassword) {
    showToast('修改密码时请填写当前密码', 'error')
    return
  }
  saving.value = true
  try {
    const res = await fetch(`${CONFIG.API_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: editForm.nickname,
        gender: editForm.gender,
        bio: editForm.bio,
        anniversary: editForm.loveDate,
        partnerNote: editForm.partnerNote,
        birthday: editForm.birthday,
        homeMessage: editForm.homeMessage
      })
    })
    const data = await res.json()
    if (data.success) {
      let passwordWarning = ''
      if (editForm.newPassword) {
        const passwordRes = await fetch(`${CONFIG.API_URL}/user/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            currentPassword: editForm.currentPassword,
            newPassword: editForm.newPassword
          })
        })
        const passwordData = await passwordRes.json()
        if (!passwordData.success) {
          passwordWarning = `资料已保存，密码修改失败：${passwordData.message || '请重试'}`
        }
      }
      // 更新本地 user 对象
      Object.assign(user, data.user)
      editForm.currentPassword = ''
      editForm.newPassword = ''
      isEditing.value = false
      showToast(passwordWarning || '保存成功', passwordWarning ? 'error' : 'success')
      
      // 关键修复：同步更新 store，确保 Home 页面数据一致
      // 安全合并：只更新非 undefined 的字段，避免覆盖原有数据
      const safeData = Object.fromEntries(
        Object.entries({
          nickname: data.user.nickname,
          gender: data.user.gender,
          bio: data.user.bio,
          anniversary: data.user.anniversary,
          partnerNote: data.user.partnerNote,
          homeMessage: data.user.homeMessage,
          birthday: data.user.birthday,
          avatar: data.user.avatar,
          avatarUrl: data.user.avatar
        }).filter(([_, v]) => v !== undefined && v !== null)
      )
      
      const updatedUser = {
        ...(userStore.currentUser || {}),
        ...safeData
      }
      userStore.updateUserData(updatedUser, userStore.currentPartner)
      send({
        type: 'update',
        data: {
          nickname: data.user.nickname,
          gender: data.user.gender,
          bio: data.user.bio,
          anniversary: data.user.anniversary,
          birthday: data.user.birthday,
          homeMessage: data.user.homeMessage,
          avatar: data.user.avatar
        }
      })
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (e) {
    showToast('保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const selectAvatar = () => {
  avatarInput.value?.click()
}

const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }
  
  // 读取文件并打开裁剪模态框
  const reader = new FileReader()
  reader.onload = (e) => {
    cropper.imageUrl = e.target.result
    cropper.show = true
    
    // 等待 DOM 更新后初始化 Cropper
    nextTick(() => {
      if (cropperInstance) {
        cropperInstance.destroy()
      }
      
      cropperInstance = new Cropper(cropImage.value, {
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
        background: false
      })
    })
  }
  reader.readAsDataURL(file)
  
  // 清空 input 以便重复选择同一文件
  e.target.value = ''
}

const closeCropper = () => {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  cropper.show = false
  cropper.imageUrl = ''
}

const confirmCrop = async () => {
  if (!cropperInstance || cropper.loading) return
  
  cropper.loading = true
  try {
    // 获取裁剪后的画布
    const canvas = cropperInstance.getCroppedCanvas({
      width: 400,
      height: 400,
      fillColor: '#fff'
    })
    
    // 转换为 Blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    })
    
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('avatar', file)
    
    const res = await fetch(`${CONFIG.API_URL}/user/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    })
    
    const data = await res.json()
    if (data.success) {
      editForm.avatar = data.avatarUrl
      user.avatar = data.avatarUrl
      // 更新 store 中的头像
      userStore.updateAvatar(data.avatarUrl)
      showToast('头像更新成功')
      closeCropper()
      // 清除头像缓存（后台执行，不阻塞）
      clearAvatarCache().catch(() => {})
    } else {
      showToast(data.message || '上传失败', 'error')
    }
  } catch (e) {
    logger.error('裁剪上传失败', e)
    showToast('上传失败', 'error')
  } finally {
    cropper.loading = false
  }
}

const confirmLogout = () => {
  showConfirm({
    title: '退出登录',
    message: '确定要退出登录吗？',
    confirmText: '退出',
    isDanger: true,
    action: () => {
      // 断开 WebSocket 连接
      const { disconnect } = useWebSocket()
      disconnect()
      userStore.clearUser()
      router.replace('/')
    }
  })
}

const confirmUnbind = () => {
  showConfirm({
    title: '解除绑定关系',
    message: '确定要解除与伴侣的绑定关系吗？此操作不可撤销。',
    confirmText: '解除',
    isDanger: true,
    action: async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/couple/unbind`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const data = await res.json()
        if (data.success) {
          showToast('已解除伴侣关系')
          fetchUserInfo()
        } else {
          showToast(data.message || '解除失败', 'error')
        }
      } catch (e) {
        showToast('解除失败', 'error')
      }
    }
  })
}

// 获取通知设置的 storage key（按用户ID）
const getNotificationSettingsKey = () => {
  const userId = userStore.currentUserId || localStorage.getItem('currentUserId')
  return userId ? `notifications_enabled_${userId}` : null
}

// 加载当前用户的通知设置
const loadNotificationSettings = async () => {
  const settingsKey = getNotificationSettingsKey()
  if (!settingsKey) {
    settings.notifications = false
    return
  }
  
  // 从 localStorage 读取该用户的通知设置
  const savedSetting = localStorage.getItem(settingsKey)
  if (savedSetting !== null) {
    settings.notifications = savedSetting === 'true'
  } else {
    // 如果没有保存过，检查实际的订阅状态
    const status = await getSubscriptionStatus()
    settings.notifications = status.subscribed && status.permission === 'granted'
    // 保存到 localStorage
    localStorage.setItem(settingsKey, settings.notifications.toString())
  }
}

// 保存通知设置（按用户）
const saveNotificationSettings = (enabled) => {
  const settingsKey = getNotificationSettingsKey()
  if (settingsKey) {
    localStorage.setItem(settingsKey, enabled.toString())
  }
}

// 页面挂载时初始化
onMounted(() => {
  // 初始化通知状态（按当前登录用户）
  loadNotificationSettings()
  
  // 订阅 WebSocket 消息
  unsubscribeWS = onMessage((data) => {
    if (data.type === 'partnerUpdated' && data.data) {
      // 刷新用户信息以获取最新状态
      fetchUserInfo(true)
    } else if (data.type === 'unbound') {
      // 对方解除绑定，刷新状态
      showToast('对方已解除伴侣关系', 'error')
      fetchUserInfo(true)
    }
  })
})

// 页面激活时重新初始化（keep-alive 缓存后重新显示）
onActivated(() => {
  logger.debug('页面激活，检查用户')
  
  // 回到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
  
  // 检查当前缓存是否属于当前登录用户
  const storedUserId = localStorage.getItem('currentUserId')
  const token = localStorage.getItem('token')
  
  // 如果没有 token，清空数据
  if (!token) {
    clearUserData()
    router.replace('/')
    return
  }
  
  // 关键修复：如果用户ID不匹配，先清空数据，绝不从旧store读取
  if (storedUserId && userStore.currentUserId && userStore.currentUserId !== storedUserId) {
    logger.debug('用户切换，清空旧数据，等待新数据')
    clearUserData()
    userStore.invalidateCache()
    // 强制重新获取，不要从store初始化
    fetchUserInfo(true)
    // 重新加载新用户的通知设置
    loadNotificationSettings()
    return
  }
  
  // 正常情况：从store初始化或获取数据
  if (userStore.currentUser && !isInitialized.value) {
    initUserData()
  } else if (!userStore.currentUser) {
    fetchUserInfo(false)
  }
  
  // 重新加载当前用户的通知设置
  loadNotificationSettings()
})

// 监听 store 变化，保持同步
watch(() => userStore.currentUser, (newUser) => {
  if (newUser) {
    syncFromStore()
  }
}, { deep: true })

onUnmounted(() => {
  if (unsubscribeWS) {
    unsubscribeWS()
  }
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--bg-dark);
}

/* 背景 */
.bg-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.35;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #D5EAE3 0%, #FFFFFF 100%);
  top: -150px;
  right: -150px;
  animation: float 25s ease-in-out infinite;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #FFFFFF 0%, #D5EAE3 100%);
  bottom: 100px;
  left: -150px;
  animation: float 20s ease-in-out infinite reverse;
  opacity: 0.25;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* 主容器 */
.app {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding-bottom: 100px;
}

/* 编辑模式标签 */
.edit-mode-badge {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  z-index: 99;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.edit-mode-badge.show {
  opacity: 1;
  visibility: visible;
}

/* 顶部导航 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 20px 16px;
  background: rgba(253, 253, 245, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.header-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.header-back:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-edit-btn {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.header-edit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(241, 101, 137, 0.25);
}

.header-edit-btn.save {
  background: linear-gradient(135deg, #F06292 0%, #E91E63 100%);
  color: white;
  min-width: 64px;
}

.header-edit-btn.save:hover {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.header-edit-btn.save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.header-edit-btn.cancel {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.header-edit-btn.cancel:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

/* 主内容 */
.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 20px;
}

/* 头像区域 */
.profile-header {
  text-align: center;
  padding: 20px 0 32px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.avatar-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-input) 100%);
  border: 3px solid transparent;
  background-clip: padding-box;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.avatar-large {
  cursor: pointer;
}

.avatar-large:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.2);
}

.avatar-large::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  background: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  border: 3px solid var(--bg-dark);
  transition: all 0.3s ease;
}

.avatar-edit:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.4);
}



.profile-name {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.profile-id {
  font-size: 13px;
  color: var(--text-tertiary);
}

.profile-id.connected {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 3px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
}

/* 卡片 */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title svg {
  color: var(--color-primary);
}

/* 表单项 */
.form-item {
  margin-bottom: 20px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-left: 4px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  transition: all 0.3s ease;
}

.form-input:focus {
  border-color: var(--border-focus);
  background: rgba(254, 208, 214, 0.3);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.form-input[readonly] {
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: default;
  border-color: transparent;
}

.form-input[readonly]:focus {
  box-shadow: none;
  border-color: transparent;
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

/* 性别选择 */
.gender-select {
  display: flex;
  gap: 12px;
}

.gender-option {
  flex: 1;
  padding: 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text-secondary);
}

.gender-option.active {
  background: rgba(241, 101, 137, 0.15);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.gender-option.disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--bg-card);
}

.gender-option.disabled.active {
  background: rgba(241, 101, 137, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
}

/* 设置列表 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  opacity: 0.8;
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  width: 36px;
  height: 36px;
  background: var(--bg-input);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.setting-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 2px;
}

.setting-info p {
  font-size: 12px;
  color: var(--text-tertiary);
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
}

/* 开关 */
.switch {
  width: 48px;
  height: 26px;
  background: var(--bg-input);
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.switch.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.switch::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: all 0.3s ease;
}

.switch.active::after {
  left: 24px;
}

/* 小开关 */
.switch.small {
  width: 40px;
  height: 22px;
}

.switch.small::after {
  width: 16px;
  height: 16px;
}

.switch.small.active::after {
  left: 20px;
}



.subsetting-info h5 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px 0;
}

.subsetting-info p {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

/* 底部退出 */
.logout-section {
  margin-top: 32px;
  padding-top: 16px;
}

.btn-logout {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  background: rgba(254, 208, 214, 0.5);
  color: #EF4444;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background: rgba(254, 208, 214, 0.7);
}

/* 解绑按钮 - 低调设计 */
.btn-unbind {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.btn-unbind:hover {
  color: #EF4444;
  opacity: 1;
}

/* Toast */
.toast {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%) translateY(-30px);
  background: rgba(253, 253, 245, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
  z-index: 9999;
  max-width: 90%;
  width: max-content;
}

.toast.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

.toast.success {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(219, 237, 156, 0.3);
}

.toast.success svg {
  color: #22C55E;
}

.toast.error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(241, 101, 137, 0.15);
}

.toast.error svg {
  color: #EF4444;
}

/* 确认对话框 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(51, 51, 51, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.confirm-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.confirm-dialog {
  background: linear-gradient(135deg, rgba(253, 253, 245, 0.98) 0%, rgba(254, 208, 214, 0.95) 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 28px;
  width: 320px;
  max-width: 90%;
  text-align: center;
  transform: scale(0.9) translateY(20px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.confirm-overlay.show .confirm-dialog {
  transform: scale(1) translateY(0);
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.confirm-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-btn.cancel {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.confirm-btn.confirm {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  color: white;
}

.confirm-btn.danger {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
}

/* 头像裁剪模态框 */
.crop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(253, 253, 245, 0.98);
  backdrop-filter: blur(20px);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.crop-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.crop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 20px 12px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(253, 253, 245, 0.95);
}

.crop-title {
  font-size: 17px;
  font-weight: 600;
}

.crop-btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: var(--text-secondary);
}

.crop-btn:hover {
  color: var(--text-primary);
  background: var(--bg-card);
}

.crop-btn.confirm {
  background: var(--color-primary);
  color: white;
  min-width: 64px;
}

.crop-btn.confirm:hover {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.crop-btn.confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.crop-preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.crop-image-container {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
}

.crop-image {
  max-width: 100%;
  display: block;
}

/* Cropper.js 圆形裁剪框样式 */
:deep(.cropper-view-box),
:deep(.cropper-face) {
  border-radius: 50%;
}

:deep(.cropper-view-box) {
  outline: 2px solid var(--color-primary);
  outline-color: var(--color-primary);
}

:deep(.cropper-point) {
  background-color: var(--color-primary);
}

.crop-footer {
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 加载动画 */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 关于共赴弹窗 */
.about-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.about-overlay.show {
  opacity: 1;
  visibility: visible;
}

.about-dialog {
  width: 85%;
  max-width: 320px;
  max-height: 80vh;
  background: var(--bg-dark);
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.3s ease;
}

.about-overlay.show .about-dialog {
  transform: scale(1);
  opacity: 1;
}

.about-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.about-header h3 {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}

.about-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.about-close:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.about-content {
  padding: 24px 20px;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

.about-brand {
  text-align: center;
  margin-bottom: 32px;
}

.about-brand h2 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #d87450;
}

.about-version {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.about-slogan {
  font-size: 13px;
  color: var(--text-tertiary);
}

.about-menu {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 24px;
}

.about-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid var(--border-color);
}

.about-item:last-child {
  border-bottom: none;
}

.about-item:hover {
  background: var(--bg-card-hover);
}

.about-item span {
  font-size: 15px;
  color: var(--text-primary);
}

.about-item svg {
  color: var(--text-tertiary);
}

.about-footer {
  text-align: center;
  padding-top: 8px;
}

.about-icp {
  font-size: 12px;
  color: var(--text-tertiary);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.about-icp:hover {
  color: var(--text-secondary);
}

.about-copyright {
  font-size: 12px;
  color: var(--text-tertiary);
}

.legal-dialog {
  width: min(90vw, 380px);
  max-width: 380px;
  max-height: 76vh;
}

.legal-content {
  padding-top: 18px;
}

.legal-updated {
  margin-bottom: 18px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

.legal-section {
  margin-bottom: 22px;
}

.legal-section:last-child {
  margin-bottom: 0;
}

.legal-section h4 {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.legal-section p {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.legal-section p:last-child {
  margin-bottom: 0;
}

/* 版本更新日志样式 */
.changelog-item {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.changelog-item:last-child {
  border-bottom: none;
}

.changelog-item h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-primary);
}

.changelog-date {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: normal;
  margin-left: 8px;
}

.changelog-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.changelog-item li {
  font-size: 14px;
  color: var(--text-secondary);
  padding: 6px 0;
  padding-left: 20px;
  position: relative;
}

.changelog-item li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: var(--color-primary);
}

.changelog-loading {
  text-align: center;
  padding: 40px;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* 7.0.1 “我们”页：参考图的单列纸张布局 */
.profile-page {
  min-height: 100dvh;
  color: #27241f;
  background: #eee5d8;
}

.profile-page > .bg-container,
.app > .edit-mode-badge,
.app > .header,
.app > .main {
  display: none;
}

.profile-page .app {
  width: min(100%, 430px);
  min-height: 100dvh;
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 4%, rgba(226, 185, 137, 0.15), transparent 27%),
    radial-gradient(circle at 91% 76%, rgba(134, 169, 190, 0.1), transparent 28%),
    linear-gradient(165deg, #fbf8f2 0%, #f5efe6 60%, #faf7f1 100%);
  box-shadow: 0 0 42px rgba(84, 62, 40, 0.12);
}

.profile-paper-app {
  --profile-me: #df8062;
  --profile-partner: #86a9c3;
  position: relative;
  min-height: 100dvh;
  padding: max(28px, env(safe-area-inset-top)) 22px calc(104px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.profile-paper-app::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.2;
  background-image:
    repeating-linear-gradient(0deg, rgba(97, 75, 51, 0.024) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px 5px);
  mix-blend-mode: multiply;
}

.profile-paper-app > * {
  position: relative;
  z-index: 1;
}

.profile-paper-header {
  height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.profile-paper-header h1 {
  margin: 0;
  font-size: 25px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.profile-settings-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  margin-top: -6px;
  border: 0;
  border-radius: 50%;
  color: #4e4942;
  background: transparent;
  font-size: 21px;
  cursor: pointer;
}

.profile-couple {
  position: relative;
  height: 194px;
}

.profile-person {
  position: absolute;
  top: 6px;
  z-index: 3;
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 0;
  color: inherit;
  background: transparent;
}

button.profile-person { cursor: pointer; }
.profile-person.me { left: 24px; }
.profile-person.partner-person { right: 24px; }

.profile-avatar {
  width: 82px;
  height: 82px;
  display: grid;
  place-items: center;
  overflow: hidden;
  box-sizing: border-box;
  border: 3px solid var(--profile-me);
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #c8ae99, #927b6b);
  box-shadow: 0 5px 13px rgba(67, 49, 33, 0.15), inset 0 0 0 3px #fffaf3;
  font-size: 25px;
}

.partner-person .profile-avatar {
  border-color: var(--profile-partner);
  background: linear-gradient(145deg, #aab9bf, #71868f);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-person small {
  max-width: 100px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-heart-thread {
  position: absolute;
  top: 34px;
  left: 89px;
  width: 208px;
  height: 47px;
}

.profile-heart-thread .line {
  position: absolute;
  top: 25px;
  width: 105px;
  border-top: 2.4px solid var(--profile-me);
}

.profile-heart-thread .line.mine {
  left: 0;
  border-radius: 0 90% 0 0;
  transform: rotate(1.7deg);
}

.profile-heart-thread .line.partner {
  right: 0;
  border-color: var(--profile-partner);
  border-radius: 90% 0 0 0;
  transform: rotate(-1.7deg);
}

.profile-heart-thread .heart {
  position: absolute;
  top: -1px;
  color: var(--profile-me);
  font: 39px/1 Georgia, serif;
  font-style: normal;
}

.profile-heart-thread .heart.mine { left: 82px; transform: rotate(-16deg) scaleX(0.86); }
.profile-heart-thread .heart.partner { left: 101px; color: var(--profile-partner); transform: rotate(16deg) scaleX(0.86); }

.profile-bound-copy {
  position: absolute;
  right: 0;
  bottom: 11px;
  left: 0;
  text-align: center;
}

.profile-bound-copy p {
  margin: 0 0 12px;
  color: #79746d;
  font-size: 12px;
}

.profile-bound-copy p strong {
  margin: 0 2px;
  color: #d67450;
  font-family: Georgia, serif;
  font-size: 22px;
  font-weight: 500;
}

.profile-bound-copy > button,
.profile-edit-actions button {
  min-height: 34px;
  padding: 0 17px;
  border: 0;
  border-radius: 17px;
  color: #d26e4c;
  background: rgba(232, 132, 92, 0.1);
  font: 12px/1 inherit;
  cursor: pointer;
}

.profile-edit-actions {
  display: inline-flex;
  gap: 8px;
}

.profile-edit-actions button.save {
  color: #fffaf5;
  background: #dc7956;
}

.profile-paper-card {
  position: relative;
  margin-top: 11px;
  padding: 17px 18px 7px;
  border: 1px solid rgba(117, 96, 72, 0.09);
  border-radius: 14px;
  background:
    repeating-linear-gradient(0deg, rgba(93, 73, 50, 0.015) 0 1px, transparent 1px 4px),
    rgba(247, 242, 234, 0.94);
  box-shadow: 0 6px 15px rgba(76, 56, 38, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.profile-paper-card h2 {
  margin: 0 0 9px;
  font-size: 15px;
  line-height: 1.2;
  font-weight: 700;
}

.profile-paper-row {
  min-height: 39px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid rgba(116, 98, 78, 0.1);
  color: #5f5a53;
  font-size: 12px;
}

.profile-paper-row > span {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.profile-paper-row i,
.profile-setting-row > span > i {
  width: 18px;
  color: #d57b59;
  font-family: Georgia, serif;
  font-size: 17px;
  font-style: normal;
  text-align: center;
}

.profile-paper-row:nth-of-type(3) i,
.profile-setting-row:nth-of-type(2) > span > i { color: #7ea5be; }

.profile-paper-row strong {
  color: #3c3833;
  font-size: 12px;
  font-weight: 500;
}

.profile-paper-row :deep(.profile-paper-input) {
  max-width: 145px;
  min-height: 30px;
  padding: 0;
  border: 0;
  color: #3c3833;
  background: transparent;
  font-size: 12px;
  text-align: right;
}

.profile-about-me {
  padding-bottom: 15px;
}

.profile-about-me p {
  margin: 0;
  color: #716b64;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 14px;
  line-height: 1.6;
}

.profile-edit-field {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid rgba(116, 98, 78, 0.1);
}

.profile-edit-field > span,
.profile-gender-edit > span {
  width: 70px;
  flex: none;
  color: #69635c;
  font-size: 11px;
}

.profile-edit-field input {
  min-width: 0;
  flex: 1;
  padding: 7px 0;
  border: 0;
  outline: 0;
  color: #312d28;
  background: transparent;
  font: 12px/1.3 inherit;
  text-align: right;
}

.profile-edit-field.readonly input { color: #9a938b; }

.profile-gender-edit {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-top: 1px solid rgba(116, 98, 78, 0.1);
}

.profile-gender-edit button {
  min-height: 29px;
  padding: 0 12px;
  border: 1px solid rgba(113, 96, 77, 0.13);
  border-radius: 15px;
  color: #716a62;
  background: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.profile-gender-edit button.active {
  border-color: var(--profile-me);
  color: var(--profile-me);
  background: rgba(255, 255, 255, 0.72);
}

.profile-space-card {
  padding-bottom: 4px;
}

.profile-setting-row {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  border: 0;
  border-top: 1px solid rgba(116, 98, 78, 0.1);
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.profile-setting-row > span {
  display: grid;
  grid-template-columns: 22px 1fr;
  column-gap: 7px;
  align-items: center;
}

.profile-setting-row > span > i { grid-row: 1 / 3; }
.profile-setting-row b { font-size: 12px; font-weight: 600; }
.profile-setting-row small { margin-top: 2px; color: #969087; font-size: 9px; }
.profile-setting-row > strong { color: #777168; font-size: 11px; font-weight: 500; white-space: nowrap; }

.profile-switch {
  position: relative;
  width: 38px;
  height: 22px;
  flex: none;
  border-radius: 11px;
  background: #d6d0c8;
}

.profile-switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(67, 53, 39, 0.22);
  transition: transform 0.2s ease;
}

.profile-switch.active { background: #df8062; }
.profile-switch.active i { transform: translateX(16px); }

.profile-paper-actions {
  padding: 22px 0 4px;
  text-align: center;
}

.profile-paper-actions button {
  display: block;
  min-height: 38px;
  margin: 0 auto;
  border: 0;
  color: #d06d4e;
  background: transparent;
  font: 13px/1 inherit;
  cursor: pointer;
}

.profile-paper-actions button.unbind {
  min-height: 30px;
  color: #aaa198;
  font-size: 10px;
}

.profile-paper-app button:focus-visible,
.profile-paper-app input:focus-visible {
  outline: 3px solid rgba(223, 128, 98, 0.28);
  outline-offset: 2px;
}

/* 青春主题：沿用首页的冷白底色与性别强调色 */
.profile-page {
  color: oklch(29% 0.03 265);
  background: oklch(95% 0.018 252);
}

.profile-page .app {
  background:
    radial-gradient(circle at 9% 5%, oklch(94% 0.06 12), transparent 28%),
    radial-gradient(circle at 92% 72%, oklch(93% 0.055 250), transparent 31%),
    radial-gradient(circle at 12% 90%, oklch(95% 0.052 166), transparent 24%),
    linear-gradient(165deg, oklch(99% 0.006 255), oklch(97% 0.018 252));
  box-shadow: 0 0 36px oklch(38% 0.04 265 / 0.1);
}

.profile-paper-app {
  --profile-me: #ff6475;
  --profile-partner: #5d8cff;
}

.profile-paper-app::before { display: none; }
.profile-settings-btn { color: oklch(38% 0.035 265); }

.profile-avatar {
  background: linear-gradient(145deg, oklch(92% 0.055 12), oklch(72% 0.14 15));
  box-shadow: 0 4px 8px oklch(38% 0.04 265 / 0.14), inset 0 0 0 3px #fff;
}

.partner-person .profile-avatar {
  background: linear-gradient(145deg, oklch(91% 0.055 250), oklch(70% 0.14 252));
}

.profile-heart-thread {
  --thread-warm: var(--profile-me);
  --thread-cool: var(--profile-partner);
}

.profile-bound-copy p { color: oklch(48% 0.03 265); }
.profile-bound-copy p strong { color: var(--profile-me); }

.profile-bound-copy > button,
.profile-edit-actions button {
  color: var(--profile-me);
  background: color-mix(in oklch, var(--profile-me) 12%, white);
}

.profile-edit-actions button.save {
  color: #fff;
  background: var(--profile-me);
}

.profile-paper-card {
  border: 0;
  background: oklch(99% 0.006 255 / 0.9);
  box-shadow: 0 3px 7px oklch(38% 0.04 265 / 0.09);
}

.profile-paper-row,
.profile-edit-field,
.profile-gender-edit,
.profile-setting-row {
  border-color: oklch(72% 0.04 250 / 0.19);
}

.profile-paper-row { color: oklch(41% 0.03 265); }
.profile-paper-row i,
.profile-setting-row > span > i { color: var(--profile-me); }
.profile-paper-row:nth-of-type(3) i,
.profile-setting-row:nth-of-type(2) > span > i { color: var(--profile-partner); }
.profile-paper-row strong,
.profile-paper-row :deep(.profile-paper-input) { color: oklch(31% 0.03 265); }
.profile-about-me p { color: oklch(43% 0.03 265); }

.profile-edit-field > span,
.profile-gender-edit > span { color: oklch(43% 0.03 265); }
.profile-edit-field input { color: oklch(29% 0.03 265); }
.profile-edit-field.readonly input { color: oklch(53% 0.025 265); }

.profile-gender-edit button {
  border-color: oklch(70% 0.04 250 / 0.22);
  color: oklch(45% 0.03 265);
  background: oklch(98% 0.008 255);
}

.profile-gender-edit button.active {
  border-color: var(--profile-me);
  color: var(--profile-me);
  background: color-mix(in oklch, var(--profile-me) 9%, white);
}

.profile-setting-row small { color: oklch(51% 0.025 265); }
.profile-setting-row > strong { color: oklch(45% 0.03 265); }
.profile-switch { background: oklch(84% 0.025 250); }
.profile-switch i { box-shadow: 0 1px 4px oklch(38% 0.04 265 / 0.18); }
.profile-switch.active { background: var(--profile-me); }
.profile-paper-actions button { color: var(--profile-me); }
.profile-paper-actions button.unbind { color: oklch(54% 0.03 265); }

.profile-paper-app button:focus-visible,
.profile-paper-app input:focus-visible {
  outline-color: color-mix(in oklch, var(--profile-me) 28%, transparent);
}

@media (max-width: 374px) {
  .profile-paper-app { padding-right: 16px; padding-left: 16px; }
  .profile-person.me { left: 13px; }
  .profile-person.partner-person { right: 13px; }
  .profile-heart-thread { left: 76px; width: calc(100% - 152px); }
}
</style>
