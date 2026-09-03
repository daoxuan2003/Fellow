<template>
  <div class="fitness-page">
    <FeatureHeader
      title="训练与减脂"
      eyebrow="FIT TOGETHER"
      chapter="05A"
      kind="health"
      back-to="/health"
      back-label="返回健康档案"
    />

    <section v-if="loading" class="fitness-state" aria-live="polite">
      <span class="state-symbol" aria-hidden="true"></span>
      <h1>正在排好今天的30分钟</h1>
      <p>训练、饮食和两个人的进度马上就好。</p>
      <div class="state-lines" aria-hidden="true"><i></i><i></i><i></i></div>
    </section>

    <section v-else-if="error" class="fitness-state error" role="alert">
      <span class="state-symbol" aria-hidden="true">!</span>
      <h1>训练计划没有同步好</h1>
      <p>{{ error }}</p>
      <button type="button" @click="loadFitness">重新加载</button>
    </section>

    <main v-else-if="fitness" class="fitness-main">
      <div class="person-switch" role="group" aria-label="查看谁的健身计划">
        <button
          v-for="option in personOptions"
          :key="option.key"
          type="button"
          :class="{ active: scope === option.key }"
          :aria-pressed="scope === option.key"
          @click="scope = option.key"
        >
          <span class="person-avatar" aria-hidden="true">{{ option.avatar }}</span>
          <span><strong>{{ option.name }}</strong><small>{{ option.status }}</small></span>
        </button>
      </div>

      <nav class="fitness-tabs" aria-label="训练与减脂页面">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          :class="{ active: activeTab === item.key }"
          :aria-current="activeTab === item.key ? 'page' : undefined"
          @click="activeTab = item.key"
        >{{ item.label }}</button>
      </nav>

      <section v-if="activeTab === 'today'" class="today-panel">
        <header class="panel-heading">
          <div>
            <span>{{ displayDate }}</span>
            <h1>{{ participant.today.workout.label }}</h1>
          </div>
          <strong>{{ participant.today.workout.durationMinutes }}分钟</strong>
        </header>

        <div class="week-rail" aria-label="本周训练轨迹">
          <div
            v-for="day in participant.week"
            :key="day.date"
            class="week-day"
            :class="{ today: day.isToday, completed: day.completed, rest: day.workout.type === 'rest' }"
          >
            <span>周{{ weekDayLabel(day.date) }}</span>
            <b>{{ dateDay(day.date) }}</b>
            <i aria-hidden="true">{{ day.workout.type === 'rest' ? '休' : (day.completed ? '✓' : '○') }}</i>
            <small>{{ day.workout.label }}</small>
          </div>
        </div>

        <div v-if="participant.today.log?.workoutCompletedAt" class="completion-banner" role="status">
          <span aria-hidden="true">✓</span>
          <div><strong>今天的训练完成了</strong><small>真实记录已经同步给对方。</small></div>
        </div>

        <section v-if="participant.today.workout.type === 'rest'" class="rest-board">
          <span aria-hidden="true">休</span>
          <div><h2>今天让身体恢复</h2><p>不安排训练动作，保证睡眠和正常吃饭即可。</p></div>
        </section>

        <template v-else>
          <div v-if="participant.today.workout.warmup" class="warmup-row">
            <span>热身</span>
            <strong>{{ participant.today.workout.warmup.label }} {{ participant.today.workout.warmup.minutes }}分钟</strong>
            <small>{{ participant.today.workout.warmup.note }}</small>
          </div>

          <section class="exercise-section" aria-labelledby="exercise-heading">
            <div class="section-title-row">
              <div><h2 id="exercise-heading">今日动作</h2><p>{{ participant.today.workout.focus }}</p></div>
              <span>{{ completedExercises }}/{{ participant.today.workout.exercises.length }}</span>
            </div>

            <ol class="exercise-list">
              <li v-for="(exercise, index) in participant.today.workout.exercises" :key="exercise.key">
                <button
                  type="button"
                  class="exercise-action"
                  :class="{ done: exerciseLog(exercise.key)?.completed }"
                  :disabled="!participant.today.canEdit || submitting"
                  @click="openExercise(exercise)"
                >
                  <span class="exercise-index" aria-hidden="true">{{ exerciseLog(exercise.key)?.completed ? '✓' : index + 1 }}</span>
                  <span class="exercise-copy">
                    <strong>{{ exercise.label }}</strong>
                    <small>{{ exerciseTarget(exercise) }}</small>
                    <em>{{ exerciseLogSummary(exercise, exerciseLog(exercise.key)) }}</em>
                  </span>
                  <b>{{ participant.today.canEdit ? (exerciseLog(exercise.key)?.completed ? '修改' : '记录') : '只读' }}</b>
                </button>
                <details v-if="exercise.alternatives?.length" class="alternatives">
                  <summary>器械没有时换动作</summary>
                  <p>{{ exercise.alternatives.join(' / ') }}</p>
                </details>
              </li>
            </ol>
          </section>

        </template>

        <section class="meal-section" aria-labelledby="meal-heading">
          <div class="section-title-row">
            <div><h2 id="meal-heading">今天吃得怎么样</h2><p>休息日也照常记录，不用猜精确热量。</p></div>
            <span>{{ recordedMeals }}/3</span>
          </div>
          <div class="meal-list">
            <button
              v-for="slot in fitness.mealSlots"
              :key="slot.key"
              type="button"
              :disabled="!participant.today.canEdit || submitting"
              @click="openMeal(slot)"
            >
              <span><strong>{{ slot.label }}</strong><small>{{ mealStatusLabel(mealLog(slot.key)?.status) }}</small></span>
              <b>{{ participant.today.canEdit ? (mealLog(slot.key) ? '修改' : '记录') : '只读' }}</b>
            </button>
          </div>
          <p class="nutrition-line">{{ participant.profile.nutrition.plate }} · {{ participant.profile.nutrition.mealBudgetLabel }}</p>
        </section>
      </section>

      <section v-else-if="activeTab === 'plan'" class="plan-panel">
        <header class="plan-intro">
          <span>{{ participant.profile.label }}</span>
          <h1>{{ participant.profile.objective }}</h1>
          <p v-if="participant.profile.squatPatternPolicy" class="policy-note">{{ participant.profile.squatPatternPolicy }}</p>
        </header>

        <section class="nutrition-plan" aria-labelledby="nutrition-plan-heading">
          <h2 id="nutrition-plan-heading">饮食起始方案</h2>
          <ul>
            <li>{{ participant.profile.nutrition.caloriesLabel }}</li>
            <li>{{ participant.profile.nutrition.proteinLabel }}</li>
            <li>{{ participant.profile.nutrition.plate }}</li>
            <li>{{ participant.profile.nutrition.mealBudgetLabel }}</li>
          </ul>
          <p>这是两周试算值，不是医疗处方；以后根据真实周平均体重和状态调整。</p>
        </section>

        <section class="weekly-plan" aria-labelledby="weekly-plan-heading">
          <h2 id="weekly-plan-heading">每周固定安排</h2>
          <article v-for="day in participant.week" :key="day.date">
            <span>周{{ weekDayLabel(day.date) }}</span>
            <div><strong>{{ day.workout.label }}</strong><small>{{ day.workout.focus }}</small></div>
            <b>{{ day.workout.durationMinutes ? `${day.workout.durationMinutes}分` : '休息' }}</b>
          </article>
        </section>

        <section class="phase-plan" aria-labelledby="phase-heading">
          <h2 id="phase-heading">到明年6月的节奏</h2>
          <ol>
            <li v-for="phase in participant.profile.phases" :key="phase.key">
              <time>{{ phase.startDate.slice(5) }} — {{ phase.endDate.slice(5) }}</time>
              <div><strong>{{ phase.label }}</strong><p>{{ phase.note }}</p></div>
            </li>
          </ol>
          <p class="milestone-note">{{ participant.profile.milestone }}</p>
        </section>
      </section>

      <section v-else class="progress-panel">
        <header class="progress-heading">
          <span>近28天真实记录</span>
          <h1>{{ participant.user.nickname }}的进展</h1>
        </header>

        <section class="progress-row">
          <div><strong>训练完成</strong><span>{{ participant.progress.completedWorkouts }}/{{ participant.progress.plannedWorkouts }}次</span></div>
          <div class="progress-track" role="progressbar" aria-label="近28天训练完成率" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="workoutProgress">
            <i :style="{ transform: `scaleX(${workoutProgress / 100})` }"></i>
          </div>
          <small>{{ workoutProgress }}%</small>
        </section>

        <section class="progress-row">
          <div><strong>饮食按计划</strong><span>{{ participant.progress.onPlanMeals }}/{{ participant.progress.recordedMeals }}餐</span></div>
          <div class="progress-track meal" role="progressbar" aria-label="近28天饮食按计划比例" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="mealProgress">
            <i :style="{ transform: `scaleX(${mealProgress / 100})` }"></i>
          </div>
          <small>{{ participant.progress.recordedMeals ? `${mealProgress}%` : '还没有记录' }}</small>
        </section>

        <section class="body-progress" aria-labelledby="body-progress-heading">
          <div class="section-title-row">
            <div><h2 id="body-progress-heading">最近身体数据</h2><p>只读取健康档案里的真实记录。</p></div>
          </div>
          <div v-if="participant.health" class="body-metrics">
            <span><small>体重</small><strong>{{ metric(participant.health.weight, 'kg') }}</strong></span>
            <span><small>腰围</small><strong>{{ metric(participant.health.waist, 'cm') }}</strong></span>
            <span><small>体脂</small><strong>{{ metric(participant.health.bodyFat, '%') }}</strong></span>
          </div>
          <div v-else class="progress-empty">
            <strong>还没有身体数据</strong>
            <p>先去健康档案记录体重和腰围，这里才会出现趋势依据。</p>
            <button v-if="scope === 'mine'" type="button" @click="router.push('/health')">去记录</button>
          </div>
        </section>

        <p class="safety-note">体重只是一个指标。出现胸痛、晕厥、异常心悸或持续关节疼痛时应停止训练；女生月经明显紊乱时暂停扩大热量缺口。</p>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="sheet" class="fitness-sheet-backdrop" @click.self="closeSheet">
        <section ref="sheetDialog" class="fitness-sheet" role="dialog" aria-modal="true" :aria-labelledby="`${sheet}-sheet-title`" @keydown="handleSheetKeydown">
          <header>
            <div>
              <span>{{ sheet === 'exercise' ? '真实记录这一组训练' : '记录这顿饭' }}</span>
              <h2 :id="`${sheet}-sheet-title`">{{ sheet === 'exercise' ? selectedExercise?.label : selectedMeal?.label }}</h2>
            </div>
            <button type="button" aria-label="关闭" :disabled="submitting" @click="closeSheet">×</button>
          </header>

          <form v-if="sheet === 'exercise'" @submit.prevent="saveExercise">
            <p class="sheet-target">目标：{{ exerciseTarget(selectedExercise) }}</p>

            <fieldset v-if="selectedExercise?.tracking === 'reps'">
              <legend>每组实际完成次数</legend>
              <label v-for="(_, index) in exerciseForm.actualReps" :key="index">
                <span>第{{ index + 1 }}组</span>
                <input v-model.number="exerciseForm.actualReps[index]" type="number" min="1" max="200" inputmode="numeric" required>
              </label>
            </fieldset>

            <fieldset v-else-if="selectedExercise?.tracking === 'seconds'">
              <legend>每组实际秒数</legend>
              <label v-for="(_, index) in exerciseForm.actualSeconds" :key="index">
                <span>第{{ index + 1 }}组</span>
                <input v-model.number="exerciseForm.actualSeconds[index]" type="number" min="1" max="3600" inputmode="numeric" required>
              </label>
            </fieldset>

            <label v-else class="sheet-field">
              <span>实际完成分钟</span>
              <input v-model.number="exerciseForm.durationMinutes" type="number" min="1" max="240" inputmode="numeric" required>
            </label>

            <label v-if="selectedExercise?.tracking === 'reps'" class="sheet-field">
              <span>本次重量（kg，可不填）</span>
              <input v-model.number="exerciseForm.weightKg" type="number" min="0" max="500" step="0.5" inputmode="decimal" placeholder="自重动作留空">
            </label>

            <p v-if="sheetError" class="sheet-error" role="alert">{{ sheetError }}</p>
            <footer>
              <button v-if="exerciseLog(selectedExercise?.key)?.completed" type="button" class="undo-button" :disabled="submitting" @click="uncompleteExercise">恢复待完成</button>
              <button type="button" class="secondary-button" :disabled="submitting" @click="closeSheet">取消</button>
              <button ref="primarySheetAction" type="submit" class="primary-button" :disabled="submitting">{{ submitting ? '正在保存…' : '完成并保存' }}</button>
            </footer>
          </form>

          <form v-else @submit.prevent="saveMeal">
            <fieldset class="meal-choices">
              <legend>这顿饭的执行情况</legend>
              <button
                v-for="(label, key) in mealStatusOptions"
                :key="key"
                type="button"
                :class="{ active: mealForm.status === key }"
                :aria-pressed="mealForm.status === key"
                @click="mealForm.status = key"
              >{{ label }}</button>
            </fieldset>
            <label class="sheet-field">
              <span>吃了什么（可选）</span>
              <textarea v-model.trim="mealForm.note" maxlength="120" rows="3" placeholder="例如：食堂鸡肉、两份青菜、半份米饭"></textarea>
            </label>
            <p v-if="sheetError" class="sheet-error" role="alert">{{ sheetError }}</p>
            <footer>
              <button type="button" class="secondary-button" :disabled="submitting" @click="closeSheet">取消</button>
              <button ref="primarySheetAction" type="submit" class="primary-button" :disabled="submitting || !mealForm.status">{{ submitting ? '正在保存…' : '保存这顿' }}</button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>

    <div class="fitness-toast" :class="{ show: toast.show, [toast.type]: true }" role="status" aria-live="polite" aria-atomic="true">
      {{ toast.message }}
    </div>

    <div v-if="celebrating" class="fitness-celebration" role="status" aria-live="assertive">
      <span aria-hidden="true">✓</span>
      <strong>今天30分钟完成</strong>
      <small>每一次真实打卡，都在把目标拉近。</small>
      <button type="button" @click="celebrating = false">知道了</button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import FeatureHeader from '../components/FeatureHeader.vue'
import { useWebSocket } from '../composables/useWebSocket.js'
import { CONFIG } from '../utils/config.js'
import {
  FITNESS_MEAL_STATUS,
  createExerciseForm,
  fitnessDateDay,
  fitnessExerciseLogSummary,
  fitnessExerciseTarget,
  fitnessProgressPercent,
  fitnessWeekDayLabel
} from '../utils/fitness-plan.js'

const router = useRouter()
const { onMessage } = useWebSocket()
const loading = ref(true)
const error = ref('')
const fitness = ref(null)
const scope = ref('mine')
const activeTab = ref('today')
const sheet = ref('')
const sheetDialog = ref(null)
const primarySheetAction = ref(null)
const selectedExercise = ref(null)
const selectedMeal = ref(null)
const exerciseForm = ref(createExerciseForm(null))
const mealForm = ref({ status: '', note: '' })
const sheetError = ref('')
const submitting = ref(false)
const celebrating = ref(false)
const toast = ref({ show: false, message: '', type: 'info' })
let sheetInvoker = null
let previousBodyOverflow = ''
const tabs = [
  { key: 'today', label: '今日' },
  { key: 'plan', label: '计划' },
  { key: 'progress', label: '进展' }
]
const mealStatusOptions = FITNESS_MEAL_STATUS

const participant = computed(() => fitness.value?.[scope.value] || fitness.value?.mine || null)
const personOptions = computed(() => ['mine', 'partner'].map(key => {
  const item = fitness.value?.[key]
  const completed = Boolean(item?.today?.log?.workoutCompletedAt)
  const rest = item?.today?.workout?.type === 'rest'
  return {
    key,
    name: key === 'mine' ? '我' : (item?.user?.nickname || '伴侣'),
    avatar: item?.user?.nickname?.[0] || (key === 'mine' ? '我' : 'TA'),
    status: rest ? '今天休息' : (completed ? '今日已完成' : '今日待完成')
  }
}))
const displayDate = computed(() => {
  const date = fitness.value?.today || ''
  return date ? `${date.slice(5, 7)}月${date.slice(8, 10)}日 · 周${fitnessWeekDayLabel(date)}` : ''
})
const completedExercises = computed(() => participant.value?.today?.workout?.exercises?.filter(
  exercise => exerciseLog(exercise.key)?.completed
).length || 0)
const recordedMeals = computed(() => Object.values(participant.value?.today?.log?.mealLogs || {}).filter(Boolean).length)
const workoutProgress = computed(() => fitnessProgressPercent(
  participant.value?.progress?.completedWorkouts,
  participant.value?.progress?.plannedWorkouts
))
const mealProgress = computed(() => fitnessProgressPercent(
  participant.value?.progress?.onPlanMeals,
  participant.value?.progress?.recordedMeals
))

function showToast(message, type = 'info') {
  toast.value = { show: true, message, type }
  window.setTimeout(() => { toast.value.show = false }, 2600)
}

async function api(path, options = {}) {
  let response
  try {
    response = await fetch(`${CONFIG.API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })
  } catch {
    throw new Error('网络连接失败，请检查后重试')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.success) throw new Error(body.message || '操作失败，请稍后再试')
  return body
}

async function loadFitness(options = {}) {
  if (!options.silent) loading.value = true
  if (!options.silent) error.value = ''
  try {
    const body = await api('/fitness')
    fitness.value = body.data
    error.value = ''
  } catch (requestError) {
    if (options.silent && fitness.value) {
      showToast('最新进度暂时没有同步，请稍后重试', 'error')
    } else {
      error.value = requestError.message || '请检查网络后重试'
    }
  } finally {
    loading.value = false
  }
}

function exerciseLog(key) {
  return participant.value?.today?.log?.exerciseLogs?.[key] || null
}

function mealLog(key) {
  return participant.value?.today?.log?.mealLogs?.[key] || null
}

function openExercise(exercise) {
  if (!participant.value?.today?.canEdit) return
  prepareSheet()
  selectedExercise.value = exercise
  exerciseForm.value = createExerciseForm(exercise, exerciseLog(exercise.key))
  sheetError.value = ''
  sheet.value = 'exercise'
  focusSheet()
}

function openMeal(slot) {
  if (!participant.value?.today?.canEdit) return
  prepareSheet()
  const existing = mealLog(slot.key)
  selectedMeal.value = slot
  mealForm.value = { status: existing?.status || '', note: existing?.note || '' }
  sheetError.value = ''
  sheet.value = 'meal'
  focusSheet()
}

async function focusSheet() {
  await nextTick()
  primarySheetAction.value?.focus()
}

function prepareSheet() {
  sheetInvoker = document.activeElement
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function releaseSheet(restoreFocus = true) {
  document.body.style.overflow = previousBodyOverflow
  if (restoreFocus && sheetInvoker?.focus) nextTick(() => sheetInvoker?.focus())
  sheetInvoker = null
}

function handleSheetKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeSheet()
    return
  }
  if (event.key !== 'Tab') return
  const focusable = [...sheetDialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function closeSheet() {
  if (submitting.value) return
  sheet.value = ''
  selectedExercise.value = null
  selectedMeal.value = null
  sheetError.value = ''
  releaseSheet()
}

async function mutateExercise(payload) {
  submitting.value = true
  sheetError.value = ''
  const wasComplete = Boolean(fitness.value?.mine?.today?.log?.workoutCompletedAt)
  try {
    const body = await api(`/fitness/today/exercises/${selectedExercise.value.key}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
    fitness.value.mine.today.log = body.data.log
    const nowComplete = Boolean(body.data.log?.workoutCompletedAt)
    submitting.value = false
    closeSheetAfterSave()
    showToast(body.message, 'success')
    if (!wasComplete && nowComplete) celebrating.value = true
    await loadFitness({ silent: true })
  } catch (requestError) {
    sheetError.value = requestError.message
  } finally {
    submitting.value = false
  }
}

async function saveExercise() {
  await mutateExercise({ completed: true, ...exerciseForm.value })
}

async function uncompleteExercise() {
  await mutateExercise({ completed: false, weightKg: exerciseForm.value.weightKg })
}

function closeSheetAfterSave() {
  sheet.value = ''
  selectedExercise.value = null
  selectedMeal.value = null
  sheetError.value = ''
  releaseSheet()
}

async function saveMeal() {
  submitting.value = true
  sheetError.value = ''
  try {
    const body = await api(`/fitness/today/meals/${selectedMeal.value.key}`, {
      method: 'PATCH',
      body: JSON.stringify(mealForm.value)
    })
    fitness.value.mine.today.log = body.data.log
    submitting.value = false
    closeSheetAfterSave()
    showToast(body.message, 'success')
    await loadFitness({ silent: true })
  } catch (requestError) {
    sheetError.value = requestError.message
  } finally {
    submitting.value = false
  }
}

function mealStatusLabel(status) {
  return FITNESS_MEAL_STATUS[status] || '还没记录'
}

function metric(value, unit) {
  const hasValue = value !== null && value !== undefined && value !== ''
  return hasValue && Number.isFinite(Number(value)) ? `${Number(value)}${unit}` : '待记录'
}

const exerciseTarget = fitnessExerciseTarget
const exerciseLogSummary = fitnessExerciseLogSummary
const weekDayLabel = fitnessWeekDayLabel
const dateDay = fitnessDateDay

function handleWebSocket(message) {
  if (message.type !== 'fitnessSync') return
  const fromPartner = String(message.data?.actor || '') !== String(fitness.value?.mine?.user?.id || '')
  loadFitness({ silent: true })
  if (fromPartner) showToast('对方的训练进度更新了', 'info')
}

let unsubscribe = null
onMounted(() => {
  unsubscribe = onMessage(handleWebSocket)
  loadFitness()
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  if (sheet.value) releaseSheet(false)
})
</script>

<style scoped>
.fitness-page {
  min-height: 100dvh;
  padding-bottom: max(32px, env(safe-area-inset-bottom, 0px));
  color: var(--fellow-ink);
  background: var(--fellow-paper);
}

button,
input,
textarea { font: inherit; }

button { color: inherit; }

.fitness-main {
  width: min(100%, var(--fellow-content-max-width));
  margin: 0 auto;
  padding: 16px;
}

.fitness-state {
  width: min(calc(100% - 32px), 398px);
  margin: 32px auto;
  padding: 24px 20px;
  text-align: center;
  background: var(--fellow-white);
  border: 3px solid var(--fellow-ink);
  border-radius: var(--fellow-radius-card);
}

.state-symbol {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  border: 3px solid currentColor;
  border-radius: 50%;
  background: var(--fellow-mint);
  font-weight: 950;
}

.fitness-state.error .state-symbol { background: var(--fellow-orange); }
.fitness-state h1 { margin: 0; font-size: 20px; }
.fitness-state p { margin: 8px 0 18px; color: var(--fellow-text-secondary); line-height: 1.55; }
.fitness-state button { min-height: 44px; padding: 0 18px; border: 3px solid currentColor; border-radius: 10px; background: var(--fellow-yellow); font-weight: 900; }
.state-lines { display: grid; gap: 8px; }
.state-lines i { height: 9px; border-radius: 5px; background: color-mix(in srgb, var(--fellow-ink) 12%, var(--fellow-white)); }
.state-lines i:nth-child(2) { width: 72%; }
.state-lines i:nth-child(3) { width: 86%; }

.person-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.person-switch button {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  text-align: left;
  background: var(--fellow-white);
  border: 2px solid var(--fellow-ink);
  border-radius: 12px;
}

.person-switch button.active { background: var(--fellow-mint); box-shadow: 2px 3px 0 var(--fellow-ink); }
.person-avatar { flex: 0 0 36px; display: grid; place-items: center; width: 36px; height: 36px; border: 2px solid currentColor; border-radius: 50%; background: var(--fellow-white); font-weight: 950; }
.person-switch strong, .person-switch small { display: block; min-width: 0; }
.person-switch strong { font-size: 14px; }
.person-switch small { margin-top: 2px; color: var(--fellow-text-secondary); font-size: 10px; line-height: 1.2; }

.fitness-tabs {
  position: sticky;
  top: calc(72px + env(safe-area-inset-top, 0px));
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 -16px 18px;
  padding: 0 16px;
  background: var(--fellow-paper);
  border-bottom: 2px solid var(--fellow-ink);
}

.fitness-tabs button {
  min-height: 48px;
  border: 0;
  border-bottom: 4px solid transparent;
  background: transparent;
  font-weight: 900;
}

.fitness-tabs button.active { border-bottom-color: var(--fellow-pink); }

.panel-heading,
.plan-intro,
.progress-heading { margin-bottom: 16px; }
.panel-heading { display: flex; justify-content: space-between; align-items: end; gap: 12px; }
.panel-heading span,
.plan-intro > span,
.progress-heading span { display: block; margin-bottom: 4px; color: var(--fellow-text-secondary); font-size: 12px; font-weight: 800; }
.panel-heading h1,
.plan-intro h1,
.progress-heading h1 { margin: 0; text-wrap: balance; font: 950 25px/1.15 var(--fellow-font-display); letter-spacing: -0.035em; }
.panel-heading > strong { padding: 7px 10px; border: 2px solid currentColor; border-radius: var(--fellow-radius-pill); background: var(--fellow-yellow); font-size: 12px; }

.week-rail {
  display: grid;
  grid-template-columns: repeat(7, minmax(42px, 1fr));
  gap: 4px;
  margin: 0 -4px 18px;
  overflow-x: auto;
  padding: 4px;
}

.week-day {
  min-width: 42px;
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 6px 2px;
  border: 2px solid transparent;
  border-radius: 10px;
}
.week-day.today { border-color: var(--fellow-ink); background: var(--fellow-white); }
.week-day.completed { background: var(--fellow-mint); }
.week-day span, .week-day small { font-size: 9px; }
.week-day b { font-size: 13px; }
.week-day i { display: grid; place-items: center; width: 22px; height: 22px; border: 2px solid currentColor; border-radius: 50%; font-size: 10px; font-style: normal; }
.week-day small { max-width: 44px; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; }

.completion-banner,
.rest-board {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border: 3px solid var(--fellow-ink);
  border-radius: var(--fellow-radius-card);
  background: var(--fellow-mint);
}
.completion-banner > span,
.rest-board > span { flex: 0 0 40px; display: grid; place-items: center; width: 40px; height: 40px; border: 3px solid currentColor; border-radius: 50%; background: var(--fellow-white); font-weight: 950; }
.completion-banner strong, .completion-banner small { display: block; }
.completion-banner small { margin-top: 3px; font-size: 11px; }
.rest-board { background: var(--fellow-yellow); }
.rest-board h2, .rest-board p { margin: 0; }
.rest-board h2 { font-size: 17px; }
.rest-board p { margin-top: 4px; font-size: 12px; line-height: 1.45; }

.warmup-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 9px;
  margin-bottom: 18px;
  padding: 11px 0;
  border-top: 2px solid var(--fellow-ink);
  border-bottom: 2px solid var(--fellow-ink);
}
.warmup-row > span { padding: 3px 7px; border-radius: 6px; background: var(--fellow-orange); font-size: 11px; font-weight: 950; }
.warmup-row strong { font-size: 14px; }
.warmup-row small { grid-column: 2; color: var(--fellow-text-secondary); font-size: 11px; line-height: 1.35; }

.exercise-section,
.meal-section,
.nutrition-plan,
.weekly-plan,
.phase-plan,
.progress-row,
.body-progress { margin-bottom: 22px; }
.section-title-row { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 10px; }
.section-title-row h2 { margin: 0; font-size: 18px; }
.section-title-row p { margin: 3px 0 0; color: var(--fellow-text-secondary); font-size: 11px; line-height: 1.4; }
.section-title-row > span { padding: 5px 8px; border: 2px solid currentColor; border-radius: var(--fellow-radius-pill); background: var(--fellow-white); font-size: 11px; font-weight: 900; }

.exercise-list { margin: 0; padding: 0; list-style: none; border-top: 3px solid var(--fellow-ink); }
.exercise-list > li { border-bottom: 2px solid var(--fellow-ink); }
.exercise-action { width: 100%; min-height: 74px; display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 9px 2px; text-align: left; border: 0; background: transparent; }
.exercise-action:disabled { opacity: 1; }
.exercise-index { display: grid; place-items: center; width: 36px; height: 36px; border: 3px solid currentColor; border-radius: 50%; background: var(--fellow-white); font-weight: 950; }
.exercise-action.done .exercise-index { background: var(--fellow-mint); }
.exercise-copy { min-width: 0; }
.exercise-copy strong, .exercise-copy small, .exercise-copy em { display: block; }
.exercise-copy strong { font-size: 15px; }
.exercise-copy small { margin-top: 3px; color: var(--fellow-text-secondary); font-size: 11px; }
.exercise-copy em { margin-top: 4px; color: var(--fellow-color-success); font-size: 11px; font-style: normal; font-weight: 900; }
.exercise-action > b { font-size: 12px; }
.alternatives { padding: 0 2px 9px 52px; }
.alternatives summary { min-height: 32px; cursor: pointer; color: var(--fellow-text-secondary); font-size: 11px; font-weight: 800; }
.alternatives p { margin: 2px 0 0; font-size: 11px; line-height: 1.45; }

.meal-list { border-top: 3px solid var(--fellow-ink); }
.meal-list button { width: 100%; min-height: 58px; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 2px; text-align: left; border: 0; border-bottom: 2px solid var(--fellow-ink); background: transparent; }
.meal-list button:disabled { opacity: 1; }
.meal-list strong, .meal-list small { display: block; }
.meal-list strong { font-size: 14px; }
.meal-list small { margin-top: 3px; color: var(--fellow-text-secondary); font-size: 11px; }
.meal-list b { font-size: 12px; }
.nutrition-line { margin: 10px 0 0; padding: 9px 10px; background: var(--fellow-yellow); border: 2px solid var(--fellow-ink); border-radius: 10px; font-size: 11px; line-height: 1.45; }

.plan-intro { padding-bottom: 16px; border-bottom: 3px solid var(--fellow-ink); }
.policy-note { margin: 12px 0 0; padding: 10px; background: var(--fellow-yellow); border-radius: 10px; font-size: 12px; line-height: 1.55; }
.nutrition-plan h2, .weekly-plan h2, .phase-plan h2 { margin: 0 0 10px; font-size: 18px; }
.nutrition-plan { padding: 14px; border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-white); }
.nutrition-plan ul { margin: 0; padding-left: 20px; }
.nutrition-plan li { margin: 6px 0; font-size: 13px; line-height: 1.4; }
.nutrition-plan p { margin: 10px 0 0; color: var(--fellow-text-secondary); font-size: 11px; line-height: 1.5; }
.weekly-plan { border-top: 3px solid var(--fellow-ink); }
.weekly-plan h2 { padding-top: 14px; }
.weekly-plan article { min-height: 56px; display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; border-bottom: 2px solid var(--fellow-ink); }
.weekly-plan article > span { font-size: 11px; font-weight: 900; }
.weekly-plan article strong, .weekly-plan article small { display: block; }
.weekly-plan article strong { font-size: 13px; }
.weekly-plan article small { margin-top: 2px; color: var(--fellow-text-secondary); font-size: 10px; }
.weekly-plan article > b { font-size: 11px; }
.phase-plan ol { margin: 0; padding: 0; list-style: none; border-left: 3px solid var(--fellow-ink); }
.phase-plan li { position: relative; display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 10px; padding: 0 0 18px 14px; }
.phase-plan li::before { content: ''; position: absolute; left: -7px; top: 3px; width: 11px; height: 11px; border: 2px solid var(--fellow-ink); border-radius: 50%; background: var(--fellow-pink); }
.phase-plan time { font-size: 10px; font-weight: 900; }
.phase-plan strong { font-size: 13px; }
.phase-plan p { margin: 4px 0 0; color: var(--fellow-text-secondary); font-size: 11px; line-height: 1.45; }
.phase-plan .milestone-note { padding: 10px; border: 2px solid var(--fellow-ink); border-radius: 10px; background: var(--fellow-mint); color: var(--fellow-ink); }

.progress-row { padding-bottom: 16px; border-bottom: 3px solid var(--fellow-ink); }
.progress-row > div:first-child { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
.progress-row strong, .progress-row span { font-size: 13px; }
.progress-track { height: 13px; overflow: hidden; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-pill); background: var(--fellow-white); }
.progress-track i { display: block; width: 100%; height: 100%; transform-origin: left center; background: var(--fellow-mint); transition: transform var(--fellow-motion-standard) var(--fellow-ease-standard); }
.progress-track.meal i { background: var(--fellow-yellow); }
.progress-row > small { display: block; margin-top: 6px; text-align: right; color: var(--fellow-text-secondary); font-size: 11px; }
.body-metrics { display: grid; grid-template-columns: repeat(3, 1fr); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-white); }
.body-metrics span { min-width: 0; padding: 12px 6px; text-align: center; }
.body-metrics span + span { border-left: 2px solid var(--fellow-ink); }
.body-metrics small, .body-metrics strong { display: block; }
.body-metrics small { font-size: 10px; }
.body-metrics strong { margin-top: 4px; overflow-wrap: anywhere; font: 900 16px/1.2 var(--fellow-font-number); }
.progress-empty { padding: 16px; border: 3px dashed var(--fellow-ink); border-radius: var(--fellow-radius-card); text-align: center; }
.progress-empty p { margin: 6px 0 12px; color: var(--fellow-text-secondary); font-size: 12px; line-height: 1.5; }
.progress-empty button { min-height: 44px; padding: 0 15px; border: 2px solid currentColor; border-radius: 10px; background: var(--fellow-yellow); font-weight: 900; }
.safety-note { margin: 0; padding: 11px; border: 2px solid var(--fellow-ink); border-radius: 10px; background: var(--fellow-white); font-size: 11px; line-height: 1.55; }

.fitness-sheet-backdrop { position: fixed; inset: 0; z-index: var(--fellow-z-modal); display: flex; align-items: flex-end; justify-content: center; background: color-mix(in srgb, var(--fellow-ink) 48%, transparent); }
.fitness-sheet { width: min(100%, 430px); max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 12px); overflow-y: auto; padding: 16px 16px max(16px, env(safe-area-inset-bottom, 0px)); background: var(--fellow-white); border: 3px solid var(--fellow-ink); border-bottom: 0; border-radius: var(--fellow-radius-sheet) var(--fellow-radius-sheet) 0 0; }
.fitness-sheet > header { display: flex; justify-content: space-between; align-items: start; gap: 12px; padding-bottom: 12px; border-bottom: 3px solid var(--fellow-ink); }
.fitness-sheet > header span { display: block; margin-bottom: 3px; color: var(--fellow-text-secondary); font-size: 10px; font-weight: 800; }
.fitness-sheet > header h2 { margin: 0; font-size: 20px; }
.fitness-sheet > header button { width: 44px; height: 44px; border: 2px solid currentColor; border-radius: 10px; background: var(--fellow-white); font-size: 24px; }
.fitness-sheet form { padding-top: 14px; }
.sheet-target { margin: 0 0 12px; padding: 9px; border-radius: 8px; background: var(--fellow-yellow); font-size: 12px; font-weight: 800; }
.fitness-sheet fieldset { margin: 0 0 14px; padding: 0; border: 0; }
.fitness-sheet legend, .sheet-field > span { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 900; }
.fitness-sheet fieldset:not(.meal-choices) { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.fitness-sheet fieldset:not(.meal-choices) legend { grid-column: 1 / -1; }
.fitness-sheet fieldset label { min-width: 0; }
.fitness-sheet fieldset label span { display: block; margin-bottom: 4px; font-size: 10px; }
.fitness-sheet input, .fitness-sheet textarea { width: 100%; box-sizing: border-box; min-height: 44px; padding: 9px 10px; color: var(--fellow-ink); background: var(--fellow-white); border: 2px solid var(--fellow-ink); border-radius: 10px; }
.fitness-sheet textarea { resize: vertical; }
.sheet-field { display: block; margin-bottom: 14px; }
.meal-choices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.meal-choices legend { grid-column: 1 / -1; }
.meal-choices button { min-height: 48px; padding: 6px; border: 2px solid var(--fellow-ink); border-radius: 10px; background: var(--fellow-white); font-size: 11px; font-weight: 900; }
.meal-choices button.active { background: var(--fellow-mint); box-shadow: 2px 2px 0 var(--fellow-ink); }
.sheet-error { margin: 0 0 12px; color: var(--fellow-color-danger); font-size: 12px; font-weight: 800; }
.fitness-sheet footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; border-top: 2px solid var(--fellow-ink); }
.fitness-sheet footer button { min-height: 44px; padding: 0 12px; border: 2px solid var(--fellow-ink); border-radius: 10px; font-size: 12px; font-weight: 900; }
.secondary-button, .undo-button { background: var(--fellow-white); }
.undo-button { margin-right: auto; color: var(--fellow-color-danger); }
.primary-button { background: var(--fellow-mint); }
.fitness-sheet button:disabled { opacity: 0.55; }

.fitness-toast { position: fixed; left: 50%; bottom: max(18px, env(safe-area-inset-bottom, 0px)); z-index: var(--fellow-z-toast); max-width: calc(100% - 32px); padding: 10px 14px; opacity: 0; pointer-events: none; transform: translate(-50%, 12px); color: var(--fellow-white); background: var(--fellow-ink); border-radius: 10px; font-size: 12px; transition: opacity var(--fellow-motion-standard), transform var(--fellow-motion-standard); }
.fitness-toast.show { opacity: 1; transform: translate(-50%, 0); }
.fitness-toast.error { background: var(--fellow-color-danger); }
.fitness-toast.success { background: var(--fellow-color-success); }

.fitness-celebration { position: fixed; inset: 50% auto auto 50%; z-index: var(--fellow-z-critical); width: min(calc(100% - 40px), 340px); padding: 22px; transform: translate(-50%, -50%); text-align: center; color: var(--fellow-ink); background: var(--fellow-mint); border: 4px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); box-shadow: var(--fellow-shadow-overlay); }
.fitness-celebration > span { display: grid; place-items: center; width: 60px; height: 60px; margin: 0 auto 12px; border: 4px solid currentColor; border-radius: 50%; background: var(--fellow-white); font-size: 30px; font-weight: 950; }
.fitness-celebration strong, .fitness-celebration small { display: block; }
.fitness-celebration strong { font-size: 21px; }
.fitness-celebration small { margin-top: 6px; line-height: 1.45; }
.fitness-celebration button { min-height: 44px; margin-top: 16px; padding: 0 18px; border: 3px solid currentColor; border-radius: 10px; background: var(--fellow-yellow); font-weight: 950; }

@media (max-width: 350px) {
  .fitness-main { padding-right: 12px; padding-left: 12px; }
  .fitness-tabs { margin-right: -12px; margin-left: -12px; padding-right: 12px; padding-left: 12px; }
  .person-switch small { max-width: 86px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .exercise-action { grid-template-columns: 36px minmax(0, 1fr) auto; gap: 7px; }
  .exercise-index { width: 32px; height: 32px; }
  .meal-choices { grid-template-columns: 1fr; }
  .meal-choices legend { grid-column: auto; }
  .fitness-sheet footer { flex-wrap: wrap; }
}

@media (prefers-reduced-motion: reduce) {
  .progress-track i,
  .fitness-toast { transition: none; }
}
</style>
