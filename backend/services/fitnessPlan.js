const PLAN_VERSION = '2026-09-couple-1';

const MEAL_SLOTS = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' }
];

const SHARED_PHASES = [
  {
    key: 'foundation',
    label: '建立动作与饮食节奏',
    startDate: '2026-09-02',
    endDate: '2026-09-29',
    note: '先稳定完成固定30分钟，不追求力竭或快速降重。'
  },
  {
    key: 'december',
    label: '12月阶段成果',
    startDate: '2026-09-30',
    endDate: '2026-12-31',
    note: '保持每周训练和饮食记录，优先观察腰围、力量与周平均体重。'
  },
  {
    key: 'consolidate',
    label: '巩固与渐进加重',
    startDate: '2027-01-01',
    endDate: '2027-03-31',
    note: '连续两次完成固定次数后，再增加器械最小重量。'
  },
  {
    key: 'finish',
    label: '塑形与最终冲刺',
    startDate: '2027-04-01',
    endDate: '2027-06-30',
    note: '不使用极端节食，用真实趋势决定是否调整饮食或步行量。'
  }
];

const COMMON_WARMUP = {
  label: '跑步机快走',
  minutes: 5,
  note: '自行选择能稳定快走的速度；出现膝痛时立即降速或停止。'
};

function repsExercise(key, label, sets, reps, alternatives, note = '') {
  return { key, label, sets, reps, alternatives, note, tracking: 'reps' };
}

function secondsExercise(key, label, sets, seconds, alternatives, note = '') {
  return { key, label, sets, seconds, alternatives, note, tracking: 'seconds' };
}

function minutesExercise(key, label, minutes, alternatives, note = '') {
  return { key, label, sets: 1, minutes, alternatives, note, tracking: 'minutes' };
}

const MALE_WORKOUTS = {
  strength_a: {
    key: 'strength_a',
    label: '全身力量 A',
    type: 'strength',
    durationMinutes: 30,
    focus: '腿部基础、胸肌与背部',
    warmup: COMMON_WARMUP,
    exercises: [
      repsExercise('goblet_squat', '高脚杯深蹲', 3, 10, ['史密斯深蹲', '腿举', '徒手深蹲']),
      repsExercise('flat_press', '平板推胸', 3, 10, ['哑铃卧推', '坐姿推胸', '俯卧撑']),
      repsExercise('seated_row', '坐姿划船', 3, 10, ['单臂哑铃划船', '弹力带划船']),
      repsExercise('dead_bug', '死虫', 2, 10, ['仰卧交替抬腿'], '每侧固定10次')
    ]
  },
  strength_b: {
    key: 'strength_b',
    label: '全身力量 B',
    type: 'strength',
    durationMinutes: 30,
    focus: '后侧链、背阔肌与肩宽',
    warmup: COMMON_WARMUP,
    exercises: [
      repsExercise('romanian_deadlift', '罗马尼亚硬拉', 3, 10, ['哑铃罗马尼亚硬拉', '山羊挺身']),
      repsExercise('lat_pulldown', '高位下拉', 3, 10, ['辅助引体向上', '弹力带下拉']),
      repsExercise('lateral_raise', '侧平举', 3, 15, ['绳索侧平举', '弹力带侧平举']),
      secondsExercise('plank', '平板支撑', 2, 40, ['上斜平板支撑'])
    ]
  },
  strength_c: {
    key: 'strength_c',
    label: '全身力量 C',
    type: 'strength',
    durationMinutes: 30,
    focus: '臀腿、上胸与腹部',
    warmup: COMMON_WARMUP,
    exercises: [
      repsExercise('hip_thrust', '臀推', 3, 12, ['臀推机', '哑铃臀桥', '自重臀桥']),
      repsExercise('incline_press', '上斜推胸', 3, 10, ['上斜哑铃卧推', '上斜推胸机', '上斜俯卧撑']),
      repsExercise('leg_curl', '坐姿腿弯举', 3, 12, ['俯卧腿弯举', '健身球腿弯举']),
      repsExercise('cable_crunch', '绳索卷腹', 3, 15, ['反向卷腹', '普通卷腹'])
    ]
  },
  upper_focus: {
    key: 'upper_focus',
    label: '胸肩背强化',
    type: 'strength',
    durationMinutes: 30,
    focus: '胸肌、肩宽与背部轮廓',
    warmup: COMMON_WARMUP,
    exercises: [
      repsExercise('incline_press_focus', '上斜推胸', 3, 10, ['上斜哑铃卧推', '上斜推胸机', '上斜俯卧撑']),
      repsExercise('lat_pulldown_focus', '高位下拉', 3, 10, ['辅助引体向上', '弹力带下拉']),
      repsExercise('shoulder_press', '坐姿肩推', 3, 10, ['哑铃肩推', '器械肩推']),
      repsExercise('lateral_raise_focus', '侧平举', 3, 15, ['绳索侧平举', '弹力带侧平举']),
      repsExercise('reverse_fly', '反向飞鸟', 2, 15, ['面拉', '弹力带拉开'])
    ]
  }
};

const FEMALE_WORKOUTS = {
  supported_a: {
    key: 'supported_a',
    label: '支撑力量 A',
    type: 'strength',
    durationMinutes: 30,
    focus: '无蹲起腿部基础与上肢力量',
    warmup: COMMON_WARMUP,
    exercises: [
      repsExercise('leg_extension_a', '坐姿腿屈伸', 3, 12, ['弹力带坐姿伸膝']),
      repsExercise('leg_curl_a', '坐姿腿弯举', 3, 12, ['俯卧腿弯举', '健身球腿弯举']),
      repsExercise('chest_press_a', '坐姿推胸', 2, 10, ['上斜俯卧撑', '弹力带推胸']),
      repsExercise('seated_row_a', '坐姿划船', 2, 10, ['单臂哑铃划船', '弹力带划船']),
      repsExercise('dead_bug_a', '死虫', 2, 10, ['仰卧交替抬腿'], '每侧固定10次')
    ]
  },
  supported_b: {
    key: 'supported_b',
    label: '支撑力量 B',
    type: 'strength',
    durationMinutes: 30,
    focus: '臀部、背部与肩部力量',
    warmup: COMMON_WARMUP,
    exercises: [
      repsExercise('glute_bridge_b', '臀桥', 3, 12, ['臀推机', '哑铃臀桥']),
      repsExercise('lat_pulldown_b', '高位下拉', 3, 10, ['弹力带下拉']),
      repsExercise('shoulder_press_b', '坐姿肩推', 2, 10, ['器械肩推', '轻哑铃肩推']),
      repsExercise('hip_abduction_b', '髋外展机', 3, 15, ['弹力带坐姿髋外展']),
      secondsExercise('incline_plank_b', '上斜平板支撑', 2, 30, ['墙面平板支撑'])
    ]
  },
  supported_c: {
    key: 'supported_c',
    label: '支撑力量 C',
    type: 'strength',
    durationMinutes: 30,
    focus: '无蹲起腿部巩固与躯干稳定',
    warmup: COMMON_WARMUP,
    exercises: [
      repsExercise('leg_extension_c', '坐姿腿屈伸', 3, 12, ['弹力带坐姿伸膝']),
      repsExercise('leg_curl_c', '坐姿腿弯举', 3, 12, ['俯卧腿弯举', '健身球腿弯举']),
      repsExercise('chest_press_c', '坐姿推胸', 2, 10, ['上斜俯卧撑', '弹力带推胸']),
      repsExercise('seated_row_c', '坐姿划船', 2, 10, ['单臂哑铃划船', '弹力带划船']),
      repsExercise('bird_dog_c', '鸟狗式', 2, 10, ['站姿对侧抬手抬腿'], '每侧固定10次')
    ]
  }
};

const COMMON_WORKOUTS = {
  cardio: {
    key: 'cardio',
    label: '中低强度快走',
    type: 'cardio',
    durationMinutes: 30,
    focus: '稳定消耗与心肺能力',
    warmup: null,
    exercises: [
      minutesExercise('brisk_walk', '连续快走', 30, ['椭圆机', '健身车'], '呼吸加快但仍能说完整短句')
    ]
  },
  recovery: {
    key: 'recovery',
    label: '轻松走路',
    type: 'recovery',
    durationMinutes: 30,
    focus: '主动恢复',
    warmup: null,
    exercises: [
      minutesExercise('easy_walk', '轻松走路', 30, ['校园散步'], '不追求速度和出汗量')
    ]
  },
  rest: {
    key: 'rest',
    label: '休息日',
    type: 'rest',
    durationMinutes: 0,
    focus: '恢复睡眠和精神状态',
    warmup: null,
    exercises: []
  }
};

const WEEK_KEYS = {
  male: ['rest', 'strength_a', 'cardio', 'strength_b', 'recovery', 'strength_c', 'upper_focus'],
  female: ['rest', 'supported_a', 'cardio', 'supported_b', 'recovery', 'supported_c', 'cardio'],
  neutral: ['rest', 'cardio', 'recovery', 'cardio', 'recovery', 'cardio', 'recovery']
};

const PROFILES = {
  male: {
    label: '男生计划',
    objective: '降低腹部脂肪，强化胸、肩、背，保持下肢正常有力',
    nutrition: {
      caloriesLabel: '每日起始试算 2100–2300 kcal',
      proteinLabel: '每日蛋白质 130–160g',
      mealBudgetLabel: '每餐不超过25元',
      plate: '每顿1.5–2掌蛋白质、2拳蔬菜、1拳主食'
    },
    milestone: '12月底优先观察腰围下降、胸肩轮廓和训练重量；明年6月再判断腹肌清晰度。'
  },
  female: {
    label: '女生计划',
    objective: '渐进减重并加强腿部基础力量，默认长期避开蹲起类动作',
    nutrition: {
      caloriesLabel: '每日起始试算 1600–1800 kcal',
      proteinLabel: '每日蛋白质 100–120g',
      mealBudgetLabel: '每餐不超过25元',
      plate: '每顿1–1.5掌蛋白质、2拳蔬菜、0.5–1拳主食'
    },
    milestone: '12月底参考68–73kg；明年6月参考52–58kg，50kg是状态允许时的冲刺目标。'
  },
  neutral: {
    label: '基础计划',
    objective: '建立规律快走和全身活动习惯',
    nutrition: {
      caloriesLabel: '先记录两周饮食，再评估总量',
      proteinLabel: '每餐安排一份明确蛋白质',
      mealBudgetLabel: '每餐不超过25元',
      plate: '每顿蛋白质、蔬菜和主食都要出现'
    },
    milestone: '先完成真实记录，不根据缺失身体信息推测减重结果。'
  }
};

function parseDateOnly(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ''));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) return null;
  return date;
}

function formatUtcDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function offsetDateOnly(dateString, amount) {
  const date = parseDateOnly(dateString);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + amount);
  return formatUtcDate(date);
}

function startOfWeek(dateString) {
  const date = parseDateOnly(dateString);
  if (!date) return '';
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return formatUtcDate(date);
}

function normalizeGender(gender) {
  return gender === 'male' || gender === 'female' ? gender : 'neutral';
}

function workoutByKey(gender, key) {
  if (COMMON_WORKOUTS[key]) return COMMON_WORKOUTS[key];
  if (gender === 'male' && MALE_WORKOUTS[key]) return MALE_WORKOUTS[key];
  if (gender === 'female' && FEMALE_WORKOUTS[key]) return FEMALE_WORKOUTS[key];
  return COMMON_WORKOUTS.recovery;
}

function getWorkoutForDate(genderValue, dateString) {
  const gender = normalizeGender(genderValue);
  const date = parseDateOnly(dateString);
  if (!date) return null;
  const key = WEEK_KEYS[gender][date.getUTCDay()];
  return workoutByKey(gender, key);
}

function getFitnessProfile(genderValue) {
  const gender = normalizeGender(genderValue);
  return {
    version: PLAN_VERSION,
    gender,
    ...PROFILES[gender],
    phases: SHARED_PHASES,
    mealSlots: MEAL_SLOTS,
    squatPatternPolicy: gender === 'female'
      ? '默认长期关闭，不按时间自动解锁；未来只有本人主动选择并通过能力评估后才可另行加入。'
      : null
  };
}

function getWeekPlan(genderValue, dateString) {
  const weekStart = startOfWeek(dateString);
  if (!weekStart) return [];
  return Array.from({ length: 7 }, (_, index) => {
    const date = offsetDateOnly(weekStart, index);
    return { date, workout: getWorkoutForDate(genderValue, date) };
  });
}

function findExercise(workout, exerciseKey) {
  return workout?.exercises?.find(exercise => exercise.key === exerciseKey) || null;
}

module.exports = {
  PLAN_VERSION,
  MEAL_SLOTS,
  getFitnessProfile,
  getWorkoutForDate,
  getWeekPlan,
  findExercise,
  offsetDateOnly,
  startOfWeek
};
