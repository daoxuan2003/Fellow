<template>
    <div class="express-card" :class="data.status">
        <!-- 头部：取件码 + 状态 -->
        <div class="card-header">
            <div class="tracking-no">
                <span class="label">取件码</span>
                <span class="value">{{ data.trackingNo }}</span>
            </div>
            <div class="status-badge" :class="data.status">
                {{ statusText }}
            </div>
        </div>
        
        <!-- 内容：地点 + 物品 -->
        <div class="card-body">
            <div class="info-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{{ data.pickupLocation }}</span>
            </div>
            <div v-if="data.description" class="info-row item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="9" y1="9" x2="15" y2="9"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <span>{{ data.description }}</span>
            </div>
            <div class="info-row time">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ formatTime(data.createdAt) }}</span>
            </div>
        </div>
        
        <!-- 底部：操作按钮 -->
        <div class="card-footer">
            <!-- 待取状态 -->
            <template v-if="data.status === 'pending'">
                <button class="btn-delete" @click="$emit('delete', data.id)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    删除
                </button>
                <button :class="['btn-pick', pickButtonClass]" @click="$emit('pick', data.id)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    {{ pickButtonText }}
                </button>
            </template>
            
            <!-- 已取状态 -->
            <template v-else>
                <div class="picker-info">
                    <span v-if="isPickedByMe">我取的件</span>
                    <span v-else>{{ pickedByText }}</span>
                </div>
                <button 
                    v-if="isPickedByMe" 
                    class="btn-unpick" 
                    @click="$emit('unpick', data.id)"
                >
                    撤销
                </button>
            </template>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ExpressCard',
    props: {
        data: {
            type: Object,
            required: true
        },
        currentUserId: {
            type: String,
            required: true
        },
        partnerGender: {
            type: String,
            default: null
        }
    },
    emits: ['pick', 'unpick', 'delete'],
    computed: {
        // 状态文字
        statusText() {
            if (this.data.status === 'pending') return '待取件'
            if (this.data.status === 'picked') {
                if (this.isPickedByMe) return '我已取'
                if (this.data.picker) return `${this.data.picker.nickname}已取`
                return '已取件'
            }
            return ''
        },
        
        // 是否是自己创建的快递
        isMyRequest() {
            return this.data.requesterId === this.currentUserId
        },
        
        // 取件按钮文字
        pickButtonText() {
            if (this.isMyRequest) {
                return '自己取'
            }
            const pronoun = this.getPronoun(this.partnerGender)
            return `帮${pronoun}取`
        },
        
        // 取件按钮颜色类
        pickButtonClass() {
            if (this.isMyRequest) {
                return 'btn-pick-self' // 自己取 - 默认粉色
            }
            // 帮对方取，根据对方性别显示不同颜色
            if (this.partnerGender === 'male') {
                return 'btn-pick-male' // 蓝色
            }
            if (this.partnerGender === 'female') {
                return 'btn-pick-female' // 粉色
            }
            return 'btn-pick-self' // 默认
        },
        
        // 是否是我取的
        isPickedByMe() {
            return this.data.pickerId === this.currentUserId
        },
    },
    methods: {
        // 获取称呼
        getPronoun(gender) {
            if (gender === 'male') return '他'
            if (gender === 'female') return '她'
            return 'TA'
        },
        
        // 格式化时间
        formatTime(isoString) {
            if (!isoString) return ''
            const date = new Date(isoString)
            const now = new Date()
            const diff = now - date
            
            // 小于1小时显示"xx分钟前"
            if (diff < 60 * 60 * 1000) {
                const minutes = Math.floor(diff / (60 * 1000))
                if (minutes < 1) return '刚刚'
                return `${minutes}分钟前`
            }
            
            // 小于24小时显示"xx小时前"
            if (diff < 24 * 60 * 60 * 1000) {
                const hours = Math.floor(diff / (60 * 60 * 1000))
                return `${hours}小时前`
            }
            
            // 大于24小时显示日期
            const month = date.getMonth() + 1
            const day = date.getDate()
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            return `${month}月${day}日 ${hours}:${minutes}`
        }
    }
}
</script>

<style scoped>
.express-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: 16px;
    transition: all 0.3s ease;
}

.express-card.pending {
    border-color: #FFB74D;
    background: linear-gradient(135deg, rgba(255, 183, 77, 0.05) 0%, transparent 100%);
}

.express-card.picked {
    border-color: #81C784;
    background: linear-gradient(135deg, rgba(129, 199, 132, 0.05) 0%, transparent 100%);
}

/* 头部 */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.tracking-no {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.tracking-no .label {
    font-size: 11px;
    color: var(--text-tertiary);
}

.tracking-no .value {
    font-size: 22px;
    font-weight: 700;
    font-family: 'SF Mono', monospace;
    color: var(--text-primary);
    letter-spacing: 1px;
}

.status-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
}

.status-badge.pending {
    background: rgba(255, 183, 77, 0.15);
    color: #F57C00;
}

.status-badge.picked {
    background: rgba(129, 199, 132, 0.15);
    color: #388E3C;
}

/* 内容 */
.card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 12px;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary);
}

.info-row svg {
    color: var(--text-tertiary);
    flex-shrink: 0;
}

.info-row.item {
    color: var(--text-primary);
}

.info-row.time {
    font-size: 12px;
    color: var(--text-tertiary);
}

/* 底部 */
.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.btn-delete {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-delete:hover {
    background: rgba(244, 67, 54, 0.1);
    border-color: rgba(244, 67, 54, 0.3);
    color: #F44336;
}

.btn-pick {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
}

/* 自己取 - 粉色 */
.btn-pick-self {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    box-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
}

.btn-pick-self:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.4);
}

/* 帮男生取 - 蓝色 */
.btn-pick-male {
    background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.btn-pick-male:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

/* 帮女生取 - 粉色 */
.btn-pick-female {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    box-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
}

.btn-pick-female:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.4);
}

.btn-pick:active {
    transform: translateY(0);
}

.picker-info {
    font-size: 13px;
    color: var(--text-secondary);
}

.btn-unpick {
    padding: 8px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-unpick:hover {
    background: rgba(255, 183, 77, 0.1);
    border-color: #FFB74D;
    color: #F57C00;
}
</style>
