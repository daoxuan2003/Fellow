<template>
  <section class="mood-comment-thread" :aria-label="`评论 ${recordTitle}`">
    <div v-if="hasComments" class="mood-comment-thread__list">
      <article
        v-if="record.partnerResponse"
        class="mood-comment-thread__comment is-legacy"
        :class="{ 'is-mine': isCurrentUser(record.partnerResponse.responderId) }"
      >
        <header>
          <strong>{{ authorName(record.partnerResponse.responderId, true) }}</strong>
          <time v-if="record.partnerResponse.respondedAt">{{ formatTime(record.partnerResponse.respondedAt) }}</time>
        </header>
        <p><span>{{ responseLabel(record.partnerResponse.kind) }}</span>{{ record.partnerResponse.message }}</p>
      </article>

      <article
        v-for="(comment, index) in comments"
        :key="comment.id || comment._id || `${comment.createdAt}-${index}`"
        class="mood-comment-thread__comment"
        :class="{ 'is-mine': isCurrentUser(comment.commenterId) }"
      >
        <header>
          <strong>{{ authorName(comment.commenterId) }}</strong>
          <time v-if="comment.createdAt">{{ formatTime(comment.createdAt) }}</time>
        </header>
        <p><span v-if="comment.kind">{{ responseLabel(comment.kind) }}</span>{{ comment.message }}</p>
      </article>
    </div>

    <button
      type="button"
      class="mood-comment-thread__toggle"
      :aria-expanded="composerOpen"
      @click="composerOpen = !composerOpen"
    >
      <span aria-hidden="true">↩</span>
      {{ composerOpen ? '收起回应' : hasComments ? '再回应一句' : '回应这条心情' }}
    </button>

    <form v-if="composerOpen" class="mood-comment-thread__composer" @submit.prevent="sendComment">
      <fieldset>
        <legend>先给一个轻回应，也可以只留言</legend>
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
        <span>想对这份心情说</span>
        <input
          v-model="message"
          maxlength="120"
          placeholder="留一句短短的话"
          autocomplete="off"
        >
      </label>
      <p v-if="error" class="mood-comment-thread__error" role="alert">{{ error }}</p>
      <button type="submit" class="mood-comment-thread__send" :disabled="sending || !canSend">
        {{ sending ? '送达中…' : '送给对方' }}
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
  gap: 8px;
  margin-top: 10px;
}
.mood-comment-thread__list { display: grid; gap: 7px; padding-top: 1px; }
.mood-comment-thread__comment { justify-self: start; width: min(94%, 300px); padding: 8px 10px; border-radius: 5px 11px 11px; box-sizing: border-box; background: color-mix(in srgb, var(--fellow-mint) 32%, var(--fellow-white)); }
.mood-comment-thread__comment.is-mine { justify-self: end; border-radius: 11px 5px 11px 11px; background: color-mix(in srgb, var(--fellow-yellow) 48%, var(--fellow-white)); }
.mood-comment-thread__comment header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mood-comment-thread__comment header strong { color: var(--thread-ink); font-size: 10px; font-weight: 950; }
.mood-comment-thread__comment time { color: var(--fellow-text-secondary); font-size: 8px; }
.mood-comment-thread__comment p { margin: 3px 0 0; font-size: 11px; font-weight: 750; line-height: 1.45; overflow-wrap: anywhere; }
.mood-comment-thread__comment p span { display: inline-flex; min-height: 20px; align-items: center; margin-right: 5px; padding: 0 6px; border-radius: var(--fellow-radius-pill); background: var(--fellow-white); font-size: 9px; font-weight: 900; }
.mood-comment-thread__toggle { justify-self: end; min-height: 44px; padding: 0 4px; border: 0; color: var(--fellow-text-secondary); background: transparent; font: inherit; font-size: 10px; font-weight: 950; cursor: pointer; }
.mood-comment-thread__toggle span { margin-right: 3px; color: var(--thread-ink); font-size: 15px; }
.mood-comment-thread__composer { display: grid; gap: 9px; padding: 11px; border: 2px solid var(--thread-ink); border-radius: var(--fellow-radius-card); background: color-mix(in srgb, var(--fellow-blue) 12%, var(--fellow-white)); }
.mood-comment-thread__composer fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.mood-comment-thread__composer legend,
.mood-comment-thread__message > span { margin-bottom: 5px; color: var(--fellow-text-secondary); font-size: 9px; font-weight: 850; }
.mood-comment-thread__kinds { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.mood-comment-thread__kinds button { min-height: 44px; padding: 3px 1px; border: 2px solid transparent; border-radius: var(--fellow-radius-control); color: var(--thread-ink); background: var(--fellow-white); font: inherit; font-size: 9px; font-weight: 900; cursor: pointer; }
.mood-comment-thread__kinds button.active { border-color: var(--thread-ink); background: var(--fellow-yellow); }
.mood-comment-thread__message { display: grid; }
.mood-comment-thread__message input { width: 100%; min-height: 44px; padding: 0 10px; border: 2px solid var(--thread-ink); border-radius: var(--fellow-radius-control); box-sizing: border-box; color: var(--thread-ink); background: var(--fellow-white); font: inherit; font-size: 16px; }
.mood-comment-thread__error { margin: 0; color: var(--fellow-color-danger); font-size: 10px; font-weight: 850; }
.mood-comment-thread__send { min-height: 44px; border: 2px solid var(--thread-ink); border-radius: var(--fellow-radius-control); color: var(--thread-ink); background: var(--fellow-pink); font: inherit; font-size: 11px; font-weight: 950; cursor: pointer; }
.mood-comment-thread__send:disabled { opacity: .55; box-shadow: none; cursor: default; }
@media (max-width: 340px) {
  .mood-comment-thread__kinds { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
