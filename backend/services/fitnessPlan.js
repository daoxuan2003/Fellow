const legacy = require('./fitnessPlanLegacy');
const PLAN_VERSION = '2026-09-sequence-2';
const SEQUENCE = ['A', 'B', 'C', 'D', 'E'];
const CUES = {
  lat_pulldown: '大腿固定，胸微抬；肘向下拉，杆到上胸附近，避免大幅后仰。',
  seated_row: '腰背稳定，手柄拉向肚脐，肩胛轻收；不要前后甩动。',
  machine_chest_press: '手柄与胸中部齐平，不耸肩，肘不要暴力锁死。',
  machine_shoulder_press: '手柄从耳朵或肩旁起推，避免腰部过度后仰。',
  dumbbell_lateral_raise: '肘微屈，抬至接近肩高，不耸肩、不借惯性。',
  romanian_deadlift: '脚约髋宽，膝微屈后保持角度，臀向后推，重量贴腿；腰背中立，下降到能控制的位置。',
  seated_leg_curl: '滚轴在脚踝附近，屈膝时不抬臀，缓慢回程。',
  cable_pull_through: '滑轮最低，背对器械，绳索穿过两腿；臀向后再向前伸髋。',
  hip_abduction: '向外打开到舒适范围，稍停后慢慢回来，不必追求大重量。',
  leg_press_45: '下降到臀部和腰仍贴住靠背的位置，再推回。',
  leg_extension: '伸膝收紧大腿前侧，再缓慢下降。',
  machine_calf_raise: '前脚掌踩稳，脚跟抬高后稍停，再缓慢下降。',
  dead_bug: '仰卧髋膝约90°，对侧手脚伸展；腰明显拱起时缩小幅度。',
  pallof_press: '滑轮齐胸，侧对器械，将手柄向前推出，躯干保持不转动。',
  weighted_floor_crunch: '屈膝脚踩地，胸前抱重量，肋骨向骨盆卷，肩胛离地稍停；腰不必离地，不坐起。',
  ab_wheel: '从跪姿开始，腹臀收紧，只滚到腰不塌的位置再回来。',
  neutral_pulldown: '手掌相对，肘向下、向身体两侧拉。',
  chest_supported_row: '胸贴靠垫，肘向后拉，避免身体前后借力。',
  incline_machine_press: '调整座椅贴稳靠背，控制推起和回程，不耸肩。',
  reverse_pec_deck: '胸朝靠垫，双臂向两侧打开，控制肩后束与上背发力。',
  roman_chair_hip_extension: '垫子在髋部附近，臀腿后侧带动身体回到一条直线，不继续后仰。',
  lying_leg_curl: '趴稳，滚轴在脚踝附近，脚跟向臀部弯曲，缓慢回程。',
  cable_kickback: '脚踝绑带连接最低滑轮，身体固定，腿向后伸，避免摇晃借力。',
  smith_squat: '杠在上斜方肌，不压颈；脚略向前，膝沿脚尖方向，下降到能稳定控制的深度。'
};
const NAMES = {
  lat_pulldown: '高位下拉', seated_row: '坐姿划船', machine_chest_press: '器械推胸',
  machine_shoulder_press: '器械肩推', dumbbell_lateral_raise: '哑铃侧平举', cable_pushdown: '绳索下压', dumbbell_curl: '哑铃弯举',
  romanian_deadlift: '罗马尼亚硬拉', seated_leg_curl: '坐姿腿弯举', cable_pull_through: '绳索拉髋', hip_abduction: '髋外展机',
  leg_press_45: '45°腿举', leg_extension: '腿屈伸', machine_calf_raise: '器械提踵', dead_bug: '死虫式', pallof_press: 'Pallof Press',
  weighted_floor_crunch: '地面负重卷腹', ab_wheel: '健腹轮', neutral_pulldown: '中立握高位下拉', chest_supported_row: '胸托划船',
  incline_machine_press: '上斜器械推胸', reverse_pec_deck: '反向蝴蝶机', single_cable_pushdown: '单臂绳索下压', preacher_curl: '器械/牧师凳弯举',
  pec_deck: '蝴蝶机夹胸', roman_chair_hip_extension: '45°罗马椅髋伸', lying_leg_curl: '卧式腿弯举', cable_kickback: '绳索后踢腿', smith_squat: '史密斯深蹲'
};
function reps(key, sets, min, max, rest = '60–90秒', perSide = false) {
  return { key, label: NAMES[key], sets, reps: min, repsMax: max, rest, perSide, tracking: 'reps', note: CUES[key] || '躯干稳定，放下约2秒、发力约1–2秒，不借惯性。', alternatives: [] };
}
function cardio(minutes, dedicated = false) {
  return { key: dedicated ? 'cardio_session' : 'cardio_finish', label: dedicated ? '有氧训练' : '中等强度有氧', tracking: 'minutes', sets: 1, minutes,
    note: dedicated ? `5分钟低强度热身（RPE 2–3）＋${minutes - 10}分钟RPE 4–6＋5分钟放松。跑步机快走或椭圆机；呼吸加快但仍能说完整短句。坡度0–3%、4–5.5 km/h仅为起始尝试，按体感调整，不必跑步。` : '跑步机快走或椭圆机，RPE约4–6，呼吸加快但仍能说完整短句。', alternatives: [] };
}
const f = {
  A: [
    reps('lat_pulldown',3,10,12,'90秒'),
    reps('seated_row',3,10,12,'90秒'),
    reps('machine_chest_press',2,10,12,'90秒'),
    reps('machine_shoulder_press',2,10,12,'90秒'),
    reps('dumbbell_lateral_raise',2,12,15,'60秒'),
    reps('cable_pushdown',2,10,15,'60秒'),
    reps('dumbbell_curl',2,10,15,'60秒'),
    cardio(25)],
  B: [
    reps('romanian_deadlift',3,8,12,'120秒'),
    reps('seated_leg_curl',3,10,15,'90秒'),
    reps('cable_pull_through',3,12,15,'90秒'),
    reps('hip_abduction',2,15,20,'60秒'),
    cardio(20)],
  C: [
    cardio(45,true),
    reps('dead_bug',2,10,10,'60–90秒',true),
    reps('pallof_press',2,10,12,'60–90秒',true)],
  D: [
    reps('neutral_pulldown',3,10,12,'90–120秒'),
    reps('chest_supported_row',3,10,12,'90–120秒'),
    reps('incline_machine_press',2,10,12,'90–120秒'),
    reps('reverse_pec_deck',3,12,15),
    reps('dumbbell_lateral_raise',2,12,15),
    reps('single_cable_pushdown',2,10,15,'60–90秒',true),
    reps('preacher_curl',2,10,15),
    cardio(25)],
  E: [
    reps('roman_chair_hip_extension',3,10,15,'90–120秒'),
    reps('lying_leg_curl',3,10,15,'90–120秒'),
    reps('leg_extension',2,12,15),
    reps('cable_kickback',2,12,15,'60–90秒',true),
    reps('hip_abduction',2,15,20),
    cardio(25)]
};
const m = {
  A: [
    reps('machine_chest_press',4,6,10,'120秒'),
    reps('lat_pulldown',4,8,12,'90–120秒'),
    reps('seated_row',3,8,12,'90–120秒'),
    reps('machine_shoulder_press',3,8,12,'90秒'),
    reps('dumbbell_lateral_raise',3,12,20,'60秒'),
    reps('cable_pushdown',3,10,15),
    reps('dumbbell_curl',3,10,15),
    cardio(20)],
  B: [
    reps('leg_press_45',4,8,12,'120秒'),
    reps('romanian_deadlift',3,8,12,'120秒'),
    reps('seated_leg_curl',3,10,15,'90秒'),
    reps('leg_extension',3,10,15,'90秒'),
    reps('machine_calf_raise',3,12,20),
    cardio(15)],
  C: [
    cardio(40,true),
    reps('weighted_floor_crunch',4,10,15),
    reps('ab_wheel',3,6,12)],
  D: [
    reps('incline_machine_press',4,6,10,'90–120秒'),
    reps('chest_supported_row',4,8,12,'90–120秒'),
    reps('neutral_pulldown',3,8,12,'90–120秒'),
    reps('pec_deck',3,10,15),
    reps('reverse_pec_deck',3,12,20),
    reps('dumbbell_lateral_raise',3,12,20),
    reps('single_cable_pushdown',3,10,15,'60–90秒',true),
    reps('preacher_curl',3,10,15),
    cardio(20)],
  E: [
    reps('smith_squat',4,6,10,'90–120秒'),
    reps('lying_leg_curl',3,10,15,'90–120秒'),
    reps('roman_chair_hip_extension',3,10,15,'90–120秒'),
    reps('leg_extension',2,12,15),
    reps('machine_calf_raise',3,12,20),
    reps('weighted_floor_crunch',3,10,15),
    reps('ab_wheel',2,6,12),
    cardio(15)]
};
const REST = { key: 'rest', label: '休息 / 忙碌日', type: 'rest', durationMinutes: 0, durationLabel: '自由活动', focus: '散步、逛街、通勤都可以；不要求步数，不补课式猛练。', warmup: null, exercises: [] };
function getSequence(gender) {
  if (!['male','female'].includes(gender)) return [];
  return SEQUENCE.map(key => ({ key, label: `${key} · ${{ A:'上肢Ⅰ', B:'下肢Ⅰ', C:gender === 'male' ? '有氧 + 腹肌' : '有氧 + 核心', D:'上肢Ⅱ', E:gender === 'male' ? '下肢Ⅱ + 腹肌' : '下肢Ⅱ' }[key]}`,
    type: key === 'C' ? 'cardio' : 'strength', durationMinutes: null, durationLabel: '预留1–2小时',
    focus: key === 'C' ? '专门有氧与核心训练' : '正式组保留约2次余力，动作稳定再加重',
    warmup: key === 'C' ? null : { label: '低强度跑步机 / 椭圆机', minutes: '5–8', note: '首个力量动作额外热身2组：约正式重量50%做10次、70%做5–6次，不计正式组。' },
    exercises: (gender === 'male' ? m : f)[key] }));
}
function getWorkout(gender, key) { return key === 'rest' ? REST : getSequence(gender).find(item => item.key === key) || REST; }
function nextKey(key) { return SEQUENCE[(SEQUENCE.indexOf(key) + 1) % SEQUENCE.length]; }
// Completed records from before auto-finish also count as finished without a backfill.
function getSessionFinishedAt(log) {
  return log?.sessionFinishedAt || (log?.planVersion === PLAN_VERSION ? log.workoutCompletedAt : null) || null;
}
// Calendar gaps never consume a session. Partial sessions repeat until explicitly finished.
function resolveSession(gender, today, todayLog, latestSession) {
  const known = getSequence(gender).length > 0;
  const next = !known ? 'rest' : latestSession ? (getSessionFinishedAt(latestSession) ? nextKey(latestSession.workoutKey) : latestSession.workoutKey) : 'A';
  if (todayLog && todayLog.planVersion !== PLAN_VERSION) {
    return { workout: legacy.getWorkoutForDate(gender, today), nextKey: next, legacy: true };
  }
  const recoveryDue = latestSession?.workoutKey === 'E' && getSessionFinishedAt(latestSession) && legacy.offsetDateOnly(latestSession.date, 1) === today;
  const key = todayLog?.workoutKey || (recoveryDue ? 'rest' : next);
  return { workout: getWorkout(gender,key), nextKey: getSessionFinishedAt(todayLog) ? nextKey(key) : next, legacy: false, recoveryDue: Boolean(recoveryDue) };
}
function getFitnessProfile(gender) {
  return { version: PLAN_VERSION, gender, label: gender === 'male' ? '男生计划' : gender === 'female' ? '女生计划' : '请先设置个人资料中的性别',
    objective: gender === 'male' ? '全身增肌与腹部训练' : gender === 'female' ? '减脂与臀腿后侧力量' : '设置后显示对应的训练动作',
    squatPatternPolicy: gender === 'female' ? '不安排深蹲、腿举、保加利亚分腿蹲、臀推机或小腿专项；腿屈伸仅在E安排2组。' : null,
    guidance: ['按 A → B → C → D → E 推进，忙碌或休息不跳过训练。E后休息一天再开始A，中间也可按状态休息。',
      '例如 A → B → 忙一天 → C → D → 忙 → E。无需对应星期，连续忙两三天也不需要补练。',
      '正式组保留约2次余力（RIR 2）；回程约2秒，发力约1–2秒。大动作休息90–120秒，小动作60–90秒。',
      '先增加次数。所有组都达到次数上限，且动作稳定、最后一组仍约有2次余力，下次才加最小一档重量；否则保持重量。',
      '前1周RIR约3，第2周RIR 2–3，第3周起RIR 1–3。不要求力竭，先按这套动作练8周。',
      gender === 'female' ? 'A至E一轮有氧共140分钟（包含C的热身与放松）；尽量每天饭后快走10–15分钟，优先晚饭后。' : 'A至E一轮有氧共110分钟（包含C的热身与放松）；每周尽量至少4天饭后快走10分钟。',
      '休息日也可散步、逛街或通勤，不设步数任务。饮食方案后续单独安排。'],
    safety: '出现关节刺痛、腰部锐痛、胸闷、异常心悸、头晕或明显低血糖样症状时停止训练。若使用胰岛素或可能导致低血糖的降糖药，运动前后的血糖管理需另行制定。' };
}
function getExerciseHistoryDefinitions(gender) {
  const definitions = new Map();
  for (const workout of getSequence(gender)) for (const exercise of workout.exercises) {
    if (!definitions.has(exercise.key)) definitions.set(exercise.key, {key:exercise.key,exercise,exerciseKeys:[exercise.key]});
  }
  // Preserve all old movements and set counts; do not equate machines with unknown old alternatives.
  for (const item of legacy.getExerciseHistoryDefinitions(gender)) {
    if (definitions.has(item.key)) {
      definitions.get(item.key).exerciseKeys = [...new Set([...definitions.get(item.key).exerciseKeys,...item.exerciseKeys])];
    } else definitions.set(item.key,{...item,exercise:{...item.exercise,legacy:true}});
  }
  return [...definitions.values()];
}
module.exports = { PLAN_VERSION, LEGACY_PLAN_VERSION: legacy.PLAN_VERSION, MEAL_SLOTS:legacy.MEAL_SLOTS,
  getFitnessProfile,getSequence,getWorkout,nextKey,resolveSession,getSessionFinishedAt,getExerciseHistoryDefinitions,
  getWorkoutForDate:legacy.getWorkoutForDate,getWeekPlan:legacy.getWeekPlan,findExercise:legacy.findExercise,
  offsetDateOnly:legacy.offsetDateOnly,startOfWeek:legacy.startOfWeek };
