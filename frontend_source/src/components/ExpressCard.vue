<template>
    <div class="express-card" :class="data.status">
        <!-- 头部 -->
        <div class="card-header">
            <div class="tracking-no">
                <span class="label">取件码</span>
                <span class="value">{{ data.trackingNo }}</span>
            </div>
            <div class="status-badge" :class="data.status">
                {{ statusText }}
            </div>
        </div>
        
        <!-- 主体：左右分栏 -->
        <div class="card-body">
            <!-- 左侧：物品 + 时间 + 删除按钮 -->
            <div class="left-area">
                <div v-if="data.description" class="item-row">
                    {{ data.description }}
                </div>
                <div class="time-row">
                    {{ formatTime(data.createdAt) }}
                </div>
                <div class="delete-row">
                    <template v-if="data.status === 'pending'">
                        <button class="btn-delete" @click="$emit('delete', data.id)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            删除
                        </button>
                    </template>
                    <template v-else>
                        <span v-if="isPickedByMe" class="picked-text">我取的件</span>
                        <span v-else class="picked-text">{{ data.picker?.nickname || '已取' }}已取</span>
                    </template>
                </div>
            </div>
            
            <!-- 右侧：地点（放大） + 取件按钮 -->
            <div class="right-area">
                <div class="location-big">
                    {{ data.pickupLocation }}
                </div>
                <div class="action-row">
                    <template v-if="data.status === 'pending'">
                        <button :class="['btn-pick', pickButtonClass]" @click="$emit('pick', data.id)">
                            {{ pickButtonText }}
                        </button>
                    </template>
                    <template v-else>
                        <button 
                            v-if="isPickedByMe && remainingTime > 0" 
                            class="btn-unpick" 
                            @click="$emit('unpick', data.id)"
                        >
                            撤销 {{ undoTimeText }}
                        </button>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
// 可撤销时间窗口（秒）- 1天
const UNDO_WINDOW = 24 * 60 * 60

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
        currentUserGender: {
            type: String,
            default: null
        },
        partnerGender: {
            type: String,
            default: null
        }
    },
    emits: ['pick', 'unpick', 'delete'],
    data() {
        return {
            remainingTime: 0,
            timer: null
        }
    },
    mounted() {
        this.startUndoTimer()
    },
    beforeUnmount() {
        this.clearUndoTimer()
    },
    watch: {
        'data.pickedAt'() {
            this.startUndoTimer()
        }
    },
    methods: {
        startUndoTimer() {
            this.clearUndoTimer()
            if (this.data.status !== 'picked' || !this.isPickedByMe || !this.data.pickedAt) {
                return
            }
            
            const pickedTime = new Date(this.data.pickedAt).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - pickedTime) / 1000)
            this.remainingTime = Math.max(0, UNDO_WINDOW - elapsed)
            
            if (this.remainingTime > 0) {
                this.timer = setInterval(() => {
                    this.remainingTime--
                    if (this.remainingTime <= 0) {
                        this.clearUndoTimer()
                    }
                }, 1000)
            }
        },
        clearUndoTimer() {
            if (this.timer) {
                clearInterval(this.timer)
                this.timer = null
            }
        }
    },
    computed: {
        statusText() {
            if (this.data.status === 'pending') return '待取件'
            if (this.data.status === 'picked') {
                if (this.isPickedByMe) return '我已取'
                return '已取件'
            }
            return ''
        },
        
        isMyRequest() {
            return this.data.requesterId === this.currentUserId
        },
        
        pickButtonText() {
            if (this.isMyRequest) return '自己取'
            const pronoun = this.getPronoun(this.partnerGender)
            return `帮${pronoun}取`
        },
        
        pickButtonClass() {
            const gender = this.isMyRequest ? this.currentUserGender : this.partnerGender
            if (gender === 'male') return 'btn-pick-male'
            if (gender === 'female') return 'btn-pick-female'
            return 'btn-pick-default'
        },
        
        isPickedByMe() {
            return this.data.pickerId === this.currentUserId
        },
        
        undoTimeText() {
            if (this.remainingTime <= 0) return ''
            const hours = Math.floor(this.remainingTime / 3600)
            const minutes = Math.floor((this.remainingTime % 3600) / 60)
            
            if (hours > 0) {
                return `${hours}小时`
            }
            if (minutes > 0) {
                return `${minutes}分钟`
            }
            return `${this.remainingTime}秒`
        },
    },
    methods: {
        getPronoun(gender) {
            if (gender === 'male') return '他'
            if (gender === 'female') return '她'
            return 'TA'
        },
        
        formatTime(isoString) {
            if (!isoString) return ''
            const date = new Date(isoString)
            const now = new Date()
            const diff = now - date
            
            if (diff < 60 * 60 * 1000) {
                const minutes = Math.floor(diff / (60 * 1000))
                if (minutes < 1) return '刚刚'
                return `${minutes}分钟前`
            }
            
            if (diff < 24 * 60 * 60 * 1000) {
                const hours = Math.floor(diff / (60 * 60 * 1000))
                return `${hours}小时前`
            }
            
            const month = date.getMonth() + 1
            const day = date.getDate()
            return `${month}月${day}日`
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

/* 头部：取件码 + 状态 */
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
    font-size: 24px;
    font-weight: 700;
    font-family: 'SF Mono', monospace;
    color: var(--text-primary);
    letter-spacing: 2px;
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

/* 主体：左右分栏 */
.card-body {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
}

/* 左侧 */
.left-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.item-row {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
}

.time-row {
    font-size: 12px;
    color: var(--text-tertiary);
}

.delete-row {
    margin-top: auto;
    padding-top: 8px;
    min-height: 40px;
    display: flex;
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

.picked-text {
    font-size: 13px;
    color: var(--text-secondary);
}

/* 右侧 */
.right-area {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    min-width: 100px;
}

/* 地点：放大显示 */
.location-big {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    text-align: right;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 8px 0;
}

.action-row {
    margin-top: auto;
    min-height: 40px;
    display: flex;
    align-items: center;
}

.btn-pick {
    padding: 10px 20px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-pick-default,
.btn-pick-female {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    box-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
}

.btn-pick-default:hover,
.btn-pick-female:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.4);
}

.btn-pick-male {
    background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.btn-pick-male:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

.btn-unpick {
    padding: 10px 16px;
    background: rgba(255, 183, 77, 0.1);
    border: 1px solid #FFB74D;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    color: #F57C00;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.btn-unpick:hover {
    background: rgba(255, 183, 77, 0.2);
    border-color: #FFA726;
    color: #EF6C00;
}
</style>
