const test = require('node:test');
const assert = require('node:assert/strict');
const {getSequence, resolveSession, PLAN_VERSION} = require('../services/fitnessPlan');
const expected = {
  female: [
    '高位下拉:3:10-12|坐姿划船:3:10-12|器械推胸:2:10-12|器械肩推:2:10-12|哑铃侧平举:2:12-15|绳索下压:2:10-15|哑铃弯举:2:10-15|25',
    '罗马尼亚硬拉:3:8-12|坐姿腿弯举:3:10-15|绳索拉髋:3:12-15|髋外展机:2:15-20|20',
    '45|死虫式:2:10-10/侧|Pallof Press:2:10-12/侧',
    '中立握高位下拉:3:10-12|胸托划船:3:10-12|上斜器械推胸:2:10-12|反向蝴蝶机:3:12-15|哑铃侧平举:2:12-15|单臂绳索下压:2:10-15/侧|器械/牧师凳弯举:2:10-15|25',
    '45°罗马椅髋伸:3:10-15|卧式腿弯举:3:10-15|腿屈伸:2:12-15|绳索后踢腿:2:12-15/侧|髋外展机:2:15-20|25'
  ],
  male: [
    '器械推胸:4:6-10|高位下拉:4:8-12|坐姿划船:3:8-12|器械肩推:3:8-12|哑铃侧平举:3:12-20|绳索下压:3:10-15|哑铃弯举:3:10-15|20',
    '45°腿举:4:8-12|罗马尼亚硬拉:3:8-12|坐姿腿弯举:3:10-15|腿屈伸:3:10-15|器械提踵:3:12-20|15',
    '40|地面负重卷腹:4:10-15|健腹轮:3:6-12',
    '上斜器械推胸:4:6-10|胸托划船:4:8-12|中立握高位下拉:3:8-12|蝴蝶机夹胸:3:10-15|反向蝴蝶机:3:12-20|哑铃侧平举:3:12-20|单臂绳索下压:3:10-15/侧|器械/牧师凳弯举:3:10-15|20',
    '史密斯深蹲:4:6-10|卧式腿弯举:3:10-15|45°罗马椅髋伸:3:10-15|腿屈伸:2:12-15|器械提踵:3:12-20|地面负重卷腹:3:10-15|健腹轮:2:6-12|15'
  ]
};
for (const gender of ['male','female']) test(`${gender} session order, volume, ranges and cardio match the supplied training contract`, () => {
  const workouts=getSequence(gender);
  assert.deepEqual(workouts.map(w=>w.exercises.map(e=>e.tracking==='minutes'?String(e.minutes):`${e.label}:${e.sets}:${e.reps}-${e.repsMax}${e.perSide?'/侧':''}`).join('|')),expected[gender]);
  assert.equal(workouts.filter(w=>w.type==='strength').length,4);
  assert.equal(workouts.flatMap(w=>w.exercises).filter(e=>e.tracking==='minutes').reduce((n,e)=>n+e.minutes,0),gender==='male'?110:140);
  for(const workout of workouts) {
    assert.equal(new Set(workout.exercises.map(e=>e.key)).size,workout.exercises.length);
    if(workout.type==='strength') assert.match(workout.warmup.note,/50%.*70%.*不计正式组/);
  }
});
test('A B busy C D busy E sequence ignores dates and finished sessions advance', () => {
  let latest=null;
  for(const [date,key] of [['2026-09-01','A'],['2026-09-02','B'],['2026-09-04','C'],['2026-09-05','D'],['2026-09-08','E']]) {
    const current=resolveSession('male',date,null,latest);
    assert.equal(current.workout.key,key);
    latest={date,workoutKey:key,planVersion:PLAN_VERSION,sessionFinishedAt:new Date()};
  }
  assert.equal(resolveSession('male','2026-09-09',null,latest).workout.key,'rest');
  assert.equal(resolveSession('male','2026-09-10',null,latest).workout.key,'A');
  latest.sessionFinishedAt=null;
  assert.equal(resolveSession('male','2027-01-01',null,latest).workout.key,'E');
});

test('historical all-recorded completion advances and preserves recovery after E', () => {
  for(const gender of ['female','male']) {
    const latest={date:'2026-10-08',workoutKey:'E',planVersion:PLAN_VERSION,workoutCompletedAt:new Date(),sessionFinishedAt:null};
    assert.equal(resolveSession(gender,'2026-10-09',null,latest).workout.key,'rest');
    assert.equal(resolveSession(gender,'2026-10-10',null,latest).workout.key,'A');
    latest.workoutKey='B';
    assert.equal(resolveSession(gender,'2026-10-09',null,latest).workout.key,'C');
    assert.equal(resolveSession(gender,'2026-10-08',latest,null).nextKey,'C');
    latest.workoutCompletedAt=null;
    assert.equal(resolveSession(gender,'2026-10-09',null,latest).workout.key,'B');
  }
});
