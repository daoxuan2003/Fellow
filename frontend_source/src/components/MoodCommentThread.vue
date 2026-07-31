<template>
  <section class="mood-comment-thread" :aria-label="`评论 ${recordTitle}`">
    <div v-if="hasComments" class="mood-comment-thread__list">
      <article
        v-if="record.partnerResponse"
        class="mood-comment-thread__comment is-legacy"
        :class="{ 'is-mine': isCurrentUser(record.partnerResponse.responderId) }"
      >
        <span>{{ authorName(record.partnerResponse.responderId, true) }}</span>
        <strong>{{ responseLabel(record.partnerResponse.kind) }}</strong>
        <p v-if="record.partnerResponse.message">{{ record.partnerResponse.message }}</p>
        <time v-if="record.partnerResponse.respondedAt">{{ formatTime(record.partnerResponse.respondedAt) }}</time>
      </article>

      <article
        v-for="(comment, index) in comments"
        :key="comment.id || comment._id || `${comment.createdAt}-${index}`"
        class="mood-comment-thread__comment"
        :class="{ 'is-mine': isCurrentUser(comment.commenterId) }"
      >
        <span>{{ authorName(comment.commenterId) }}</span>
        <strong v-if="comment.kind">{{ responseLabel(comment.kind) }}</strong>
        <p v-if="comment.message">{{ comment.message }}</p>
        <time v-if="comment.createdAt">{{ formatTime(comment.createdAt) }}</time>
      </article>
    </div>

    <button
      type="button"
      class="mood-comment-thread__toggle"
      :aria-expanded="composerOpen"
      @click="composerOpen = !composerOpen"
    >
      <span aria-hidden="true">＋</span>
      {{ composerOpen ? '收起评论' : hasComments ? '继续评论' : '评论这条心情' }}
    </button>

    <form v-if="composerOpen" class="mood-comment-thread__composer" @submit.prevent="sendComment">
      <fieldset>
        <legend>可以先给一个轻回应</legend>
        <div class="mood-comment-thread__kinds">
          <button
            v-for="option in responseKinds"
            :key="option.kind"
            type="button"
            :class="{ active: selectedKind === option.kind }"
            :aria-pressed="selectedKind === option.kind"
            @click="toggleKind(option.kind)"
          >{{ option.label }}</button>
        </div>
      </fieldset>
      <label class="mood-comment-thread__message">
        <span>再留一句话</span>
        <input
          v-model="message"
          maxlength="120"
          placeholder="想说什么都可以"
          autocomplete="off"
        >
      </label>
      <p v-if="error" class="mood-comment-thread__error" role="alert">{{ error }}</p>
      <button type="submit" class="mood-comment-thread__send" :disabled="sending || !canSend">
        {{ sending ? '送达中…' : '发出评论' }}
      </button>
    </form>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { CONFIG } from '../utils/config.js'
import { getMoodLabel } from '../utils/mood-catalog.js'

const props = defineProps({
  record: { type: Object, required: true },
  currentUserId: { type: String, default: '' },
  myName: { type: String, default: '我' },
  partnerName: { type: String, default: '伴侣' },
  recordIsMine: { type: Boolean, default: false }
})
const emit = defineEmits(['sent'])

const composerOpen = ref(false)
const selectedKind = ref('')
const message = ref('')
const sending = ref(false)
const error = ref('')

const responseKinds = [
  { kind: 'hug', label: '抱抱你' },
  { kind: 'stay', label: '陪着你' },
  { kind: 'listen', label: '听你说' },
  { kind: 'cheer', label: '为你加油' }
]
const comments = computed(() => Array.isArray(props.record.comments)
  ? props.record.comments.slice().sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
  : [])
const hasComments = computed(() => Boolean(props.record.partnerResponse) || comments.value.length > 0)
const canSend = computed(() => Boolean(selectedKind.value || message.value.trim()))
const recordTitle = computed(() => getMoodLabel(props.record.mood))

function isCurrentUser(commenterId) {
  return Boolean(commenterId) && String(commenterId) === props.currentUserId
}

function authorName(commenterId, legacy = false) {
  if (isCurrentUser(commenterId)) return props.myName
  if (commenterId) return props.partnerName
  if (legacy) return props.recordIsMine ? props.partnerName : props.myName
  return props.partnerName
}

function responseLabel(kind) {
  return responseKinds.find(option => option.kind === kind)?.label || '回应了这份心情'
}

function formatTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value))
}

function toggleKind(kind) {
  selectedKind.value = selectedKind.value === kind ? '' : kind
}

async function sendComment() {
  if (!canSend.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    const response = await fetch(`${CONFIG.API_URL}/mood/${props.record.id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kind: selectedKind.value || null,
        message: message.value.trim()
      })
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '评论发送失败')
    selectedKind.value = ''
    message.value = ''
    composerOpen.value = false
    emit('sent', body.data)
  } catch (requestError) {
    error.value = requestError.message || '评论发送失败，请稍后重试。'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.mood-comment-thread {
  --thread-ink: var(--fellow-ink, #20202a);
  display: grid;
  align-self: stretch;
  gap: 7px;
  margin-top: 9px;
}
.mood-comment-thread__list { display: grid; gap: 6px; }
.mood-comment-thread__comment { width: min(92%, 280px); padding: 7px 9px; border: 2px solid var(--thread-ink); border-radius: 5px 11px 11px; background: color-mix(in srgb, var(--fellow-mint, #75dfc1) 38%, white); box-shadow: 2px 2px 0 var(--thread-ink); box-sizing: border-box; }
.mood-comment-thread__comment.is-mine { justify-self: end; border-radius: 11px 5px 11px 11px; background: color-mix(in srgb, var(--fellow-yellow, #ffd94a) 58%, white); }
.mood-comment-thread__comment.is-legacy { border-style: dashed; }
.mood-comment-thread__comment span { display: block; color: #66636e; font-size: 9px; font-weight: 850; }
.mood-comment-thread__comment strong { display: inline-block; margin-top: 2px; font-size: 11px; font-weight: 950; }
.mood-comment-thread__comment p { margin: 3px 0 0; font-size: 11px; font-weight: 750; line-height: 1.45; overflow-wrap: anywhere; }
.mood-comment-thread__comment time { display: block; margin-top: 3px; color: #77737d; font-size: 8px; text-align: right; }
.mood-comment-thread__toggle { justify-self: end; min-height: 44px; padding: 0 10px; border: 2px solid var(--thread-ink); border-radius: 9px; color: var(--thread-ink); background: #fff; box-shadow: 2px 2px 0 var(--thread-ink); font: inherit; font-size: 10px; font-weight: 950; cursor: pointer; }
.mood-comment-thread__toggle span { margin-right: 2px; font-size: 14px; }
.mood-comment-thread__composer { display: grid; gap: 8px; padding: 10px; border: 2px solid var(--thread-ink); border-radius: 11px; background: color-mix(in srgb, var(--fellow-blue, #58c8f5) 13%, white); }
.mood-comment-thread__composer fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.mood-comment-thread__composer legend,
.mood-comment-thread__message > span { margin-bottom: 5px; color: #66636e; font-size: 9px; font-weight: 850; }
.mood-comment-thread__kinds { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.mood-comment-thread__kinds button { min-height: 44px; padding: 3px 1px; border: 2px solid var(--thread-ink); border-radius: 8px; color: var(--thread-ink); background: #fff; font: inherit; font-size: 9px; font-weight: 900; cursor: pointer; }
.mood-comment-thread__kinds button.active { background: var(--fellow-yellow, #ffd94a); box-shadow: 2px 2px 0 var(--thread-ink); transform: translate(-1px, -1px); }
.mood-comment-thread__message { display: grid; }
.mood-comment-thread__message input { width: 100%; min-height: 44px; padding: 0 9px; border: 2px solid var(--thread-ink); border-radius: 8px; box-sizing: border-box; color: var(--thread-ink); background: #fff; font: inherit; font-size: 16px; }
.mood-comment-thread__error { margin: 0; color: #7c2630; font-size: 10px; font-weight: 850; }
.mood-comment-thread__send { min-height: 44px; border: 2px solid var(--thread-ink); border-radius: 8px; color: var(--thread-ink); background: var(--fellow-pink, #ff7fa5); box-shadow: 2px 2px 0 var(--thread-ink); font: inherit; font-size: 11px; font-weight: 950; cursor: pointer; }
.mood-comment-thread__send:disabled { opacity: .55; box-shadow: none; cursor: default; }
@media (max-width: 340px) {
  .mood-comment-thread__kinds { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
