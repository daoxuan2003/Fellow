<template>
  <div class="nutrition-page">
    <FeatureHeader title="饮食管理" eyebrow="EAT TOGETHER" chapter="05B" kind="health" back-to="/health/fitness" back-label="返回训练计划" />
    <main class="nutrition-main">
      <section v-if="loading && !data" class="n-state" aria-live="polite"><span class="n-kicker">一餐一餐，慢慢来</span><h1>正在整理饮食记录</h1><p>你的份量、目标与变化，都在这里。</p></section>
      <section v-else-if="!data" class="n-state" role="alert"><h1>暂时没能同步</h1><p>{{ error }}</p><button @click="load()">重新加载</button></section>
      <template v-else>
        <nav class="n-tabs" aria-label="饮食管理页面"><button v-for="tab in tabs" :key="tab.key" :aria-current="active === tab.key ? 'page' : undefined" :class="{ selected: active === tab.key }" @click="active = tab.key">{{ tab.label }}</button></nav>
        <p v-if="error" class="n-error" role="alert">{{ error }} <button :disabled="busy" @click="load()">重新同步</button></p>
        <p v-if="notice" class="n-notice" role="status">{{ notice }}</p>

        <template v-if="!data.profile || (active === 'plan' && editingProfile)">
          <section class="n-intro"><span class="n-kicker">{{ data.profile ? '我的档案' : '从你的真实情况开始' }}</span><h1>一样的饭，<br>各自的目标。</h1><p>先用 7–14 天了解平常的饮食，再一起找到合适的份量。</p></section>
          <form class="n-card n-form" @submit.prevent="saveProfile">
            <h2>{{ data.profile ? '调整个人档案' : '确认你的饮食档案' }}</h2><p class="n-muted">{{ data.profile ? '改变目标、性别或健康情况后，将重新校准。' : '已优先读取你的健康档案；缺失的身高与体重仅是可修改的参考值，确认前不会成为记录。' }}</p>
            <div class="n-fields"><label>生理性别<select v-model="form.sex"><option value="female">女性</option><option value="male">男性</option></select></label><label>年龄<input v-model.number="form.age" required type="number" min="1" max="110" inputmode="numeric"></label><label>身高 / cm<input v-model.number="form.height" required type="number" min="100" max="230" step="0.1" inputmode="decimal"></label><label>起点体重 / kg<input v-model.number="form.baselineWeight" required type="number" min="25" max="300" step="0.1" inputmode="decimal"></label><label>腰围 / cm<input v-model.number="form.waist" required type="number" min="35" max="250" step="0.1" inputmode="decimal"></label><label>大腿围 / cm · 选填<input v-model.number="form.thigh" type="number" min="15" max="150" step="0.1" inputmode="decimal"></label><label>臀围 / cm · 选填<input v-model.number="form.hip" type="number" min="35" max="250" step="0.1" inputmode="decimal"></label><label>体脂率 / % · 选填<input v-model.number="form.bodyFat" type="number" min="1" max="70" step="0.1" inputmode="decimal"></label></div>
            <label>我的目标<select v-model="form.goal"><option v-for="(label, key) in goals" :key="key" :value="key">{{ label }}</option></select></label>
            <div class="n-fields"><label>每日蛋白质 / g<input v-model.number="form.protein" required type="number" min="30" max="250" inputmode="numeric"></label><label>每日膳食纤维 / g<input v-model.number="form.fiber" required type="number" min="10" max="60" inputmode="numeric"></label></div>
            <p class="n-muted">蛋白质与纤维是可修改的初始参考；热量目标待校准后生成。</p>
            <label class="n-check"><input v-model="form.needsClinicalAdvice" type="checkbox">我处于孕哺期、使用降糖药物，或需要医疗饮食管理（仅记录，不自动建议热量）</label>
            <fieldset><legend>由你决定与 TA 分享什么</legend><label v-for="(label, key) in privacyLabels" :key="key" class="n-check"><input v-model="form.privacy[key]" type="checkbox">{{ label }}</label></fieldset>
            <label class="n-check"><input v-model="form.allowSharedMeals" type="checkbox">允许 TA 为我加入共享餐（TA 可修改或撤销自己创建的共享餐）</label>
            <p class="n-muted">晨重与围度默认仅自己可见。开启某项分享后，TA 可查看已有记录中的该项。</p>
            <button class="n-primary" :disabled="busy">{{ busy ? '正在保存…' : data.profile ? '保存档案' : '确认档案，开始校准' }}</button><button v-if="data.profile" type="button" :disabled="busy" @click="editingProfile = false">取消修改</button>
          </form>
        </template>

        <template v-else-if="active === 'today'">
          <div class="n-heading"><div><span class="n-kicker">我的一天</span><h1>吃好，也练好。</h1></div><label class="n-date">记录日期<input v-model="date" type="date" :max="data.today" :disabled="busy" @change="load()"></label></div>
          <section class="n-energy"><div><span>{{ data.profile.targetCalories ? '今日已记录' : '校准中 · 先如实记录' }}</span><strong>{{ fmt(data.day.totals.calories) }}<small>kcal</small></strong><p>{{ data.profile.targetCalories ? `参考目标 ${fmt(data.profile.targetCalories)} kcal` : `第 ${calibrationDay} 天 · 尚未设定热量目标` }}</p></div><div class="n-energy-mark" aria-hidden="true"><span>好好<br>吃饭</span></div><p class="n-energy-note">{{ energyNote }}<span v-if="data.profile.targetCalories && data.day.totals.calories < data.profile.targetCalories"> 距参考目标约 {{ fmt(data.profile.targetCalories - data.day.totals.calories) }} kcal。</span></p></section>
          <div class="n-macros"><article v-for="metric in macroMetrics" :key="metric.key"><span>{{ metric.label }}</span><strong>{{ metric.key === 'fiber' && !data.day.totals.fiberKnown ? '≥' : '' }}{{ fmt(data.day.totals[metric.key]) }}<small> g</small></strong><p>{{ metric.target ? `参考 ${metric.target} g` : '今日记录' }}</p><progress v-if="metric.target" :value="data.day.totals[metric.key]" :max="metric.target" :aria-label="metric.label + '记录进度'"></progress></article></div>
          <section class="n-weight-strip"><div><strong>晨起体重</strong><p>{{ data.day.weight == null ? '起床、如厕后，进食前；忙时可跳过。' : `${fmt(data.day.weight)} kg · 看长期趋势，不评判单日` }}</p></div><button :disabled="busy" @click="openMeasurements">{{ data.day.weight == null ? '记一下' : '修改' }}</button></section>
          <a class="n-training" href="/health/fitness" @click.prevent="router.push('/health/fitness')"><span><strong>{{ data.day.training.label }}</strong><small>{{ data.day.training.state === 'rest' ? '休息也要好好吃饭，散步通勤都算活动。' : '按 A → E 接着练，蛋白质分散到每一餐。' }}</small></span><span aria-hidden="true">↗</span></a>
          <p v-if="data.day.training.state === 'started'" class="n-tip">如果距上一餐已较久，训练前可选择容易消化的碳水和适量蛋白质，例如香蕉配牛奶或酸奶；按自己的饥饿感调整。</p>
          <p v-if="data.day.training.state === 'finished'" class="n-tip">训练结束后正常吃下一餐，搭配主食、蔬菜和蛋白质。{{ data.day.totals.protein < data.profile.protein ? `今天距蛋白质参考目标还有约 ${fmt(data.profile.protein - data.day.totals.protein)} g，可分到后续餐次。` : '今天已记录的蛋白质达到参考目标。' }}</p>
          <div class="n-heading"><h2>四餐记录</h2><button :disabled="busy || !data.yesterday.length" @click="openCopy">复制前一天</button></div>
          <section v-for="meal in meals" :key="meal.key" class="n-meal">
            <header><div><span class="n-meal-number">{{ String(meals.indexOf(meal) + 1).padStart(2, '0') }}</span><h2>{{ meal.label }}</h2></div><button :disabled="busy" :aria-label="`记录${meal.label}`" @click="openMeal(meal.key)">＋ 记录</button></header>
            <p v-if="entriesFor(meal.key).length" class="n-muted">本餐蛋白质 {{ fmt(mealProtein(meal.key)) }} g · 无需每餐完全一致</p>
            <p v-if="!entriesFor(meal.key).length" class="n-muted">还没有记录。按实际吃的份量填就好。</p>
            <article v-for="entry in entriesFor(meal.key)" :key="entry.id" class="n-entry"><div><strong>{{ entry.name }} <small v-if="entry.shared">共享餐 · 我的份量</small></strong><p v-for="(food, i) in entry.foods" :key="i">{{ food.name }} · {{ fmt(food.amount) }} {{ food.unit }} · {{ weightTypes[food.weightType] }}</p><b>{{ fmt(entry.totals.calories) }} kcal · 蛋白质 {{ fmt(entry.totals.protein) }} g</b></div><div class="n-entry-actions"><button :disabled="busy" @click="openTemplate(entry)">存为整餐</button><button v-if="entry.canEdit" :disabled="busy" @click="openEdit(entry)">修改</button><small v-else>由 TA 创建</small></div></article>
            <p v-if="meal.key === 'breakfast' && entriesFor(meal.key).length && mealProtein(meal.key) < 20" class="n-tip">早餐蛋白质较少，下次可以搭配蛋、奶或豆制品。</p>
            <button v-if="entriesFor(meal.key).length && (date === data.today || walkFor(meal.key))" class="n-walk" :disabled="busy || !!walkFor(meal.key)?.completedAt || (walkFor(meal.key) && remaining(meal.key) > 0)" @click="walk(meal.key)">{{ walkLabel(meal.key) }}</button>
          </section>
          <section class="n-card"><h2>{{ data.day.complete ? '这一天已完整记录' : '今天都记全了吗？' }}</h2><p>包括零食、饮料和烹调油。确认完整的日子才参与校准与饮食周报；之后修改餐食需重新确认。</p><button class="n-primary" :disabled="busy || !data.day.entries.length" @click="saveDay({ confirm: !data.day.complete })">{{ busy ? '正在保存…' : data.day.complete ? '撤销完整确认' : '确认本日饮食已完整记录' }}</button><label class="n-recovery">今天的恢复感受<select :value="data.day.recovery" :disabled="busy" @change="saveDay({ recovery: $event.target.value })"><option value="unknown">暂未记录</option><option value="normal">正常</option><option value="poor">疲劳 / 恢复较差</option></select></label></section>
          <section class="n-partner"><span class="n-kicker">一起照顾自己</span><h2>{{ data.partner.nickname }} 的今天</h2><p v-if="!data.partner.initialized">TA 还没有建立饮食档案。</p><template v-else><p v-if="'complete' in data.partner">{{ data.partner.complete ? '已确认完整饮食日' : '还在记录中' }}</p><p v-if="'calories' in data.partner">已记录 {{ fmt(data.partner.calories) }} kcal</p><p v-if="'weight' in data.partner">晨重 {{ fmt(data.partner.weight) }} kg</p><p v-if="'waist' in data.partner">腰围 {{ fmt(data.partner.waist) }} cm</p><p v-if="'thigh' in data.partner">大腿围 {{ fmt(data.partner.thigh) }} cm</p><details v-if="data.partner.entries"><summary>TA 分享的餐食</summary><p v-if="!data.partner.entries.length">这天还没有食物记录。</p><p v-for="entry in data.partner.entries" :key="entry.id">{{ mealLabel(entry.meal) }} · {{ entry.foods.map(f => `${f.name} ${fmt(f.amount)} ${f.unit}`).join('、') }}</p></details><small>只显示 TA 主动分享的内容。</small></template></section>
        </template>

        <template v-else-if="active === 'food'">
          <section class="n-intro"><span class="n-kicker">一起吃，各自记</span><h1>一桌饭，两份刚好。</h1><p>相同菜品，为自己和 TA 分别填写份量。</p><button class="n-primary" :disabled="busy" @click="openMeal('dinner', true)">记录情侣共享餐</button><p v-if="!data.partner.allowSharedMeals" class="n-muted">TA 需要先在「我的计划」允许共享餐。</p></section>
          <div class="n-heading"><h2>我的整餐</h2><span>{{ data.templates.length }} / 50</span></div><p v-if="!data.templates.length" class="n-card n-muted">把记录好的一餐存为整餐，下次就能直接加入。</p>
          <article v-for="template in data.templates" :key="template.id" class="n-template"><div><strong>{{ template.name }}</strong><p>{{ template.foods.map(f => `${f.name} ${fmt(f.amount)}${f.unit}`).join(' · ') }}</p></div><div class="n-inline"><button :disabled="busy" @click="openUseTemplate(template)">加入一餐</button><button :disabled="busy" @click="openDeleteTemplate(template)">移除</button></div></article>
          <div class="n-heading"><h2>食物库</h2><button :disabled="busy" @click="openCustom">＋ 自定义</button></div>
          <label class="n-search">搜索食物<input v-model="search" type="search" placeholder="如：鸡胸肉、米饭"></label>
          <div class="n-filter" role="group" aria-label="食物范围"><button v-for="(label, key) in libraryScopes" :key="key" :class="{ selected: libraryScope === key }" @click="libraryScope = key">{{ label }}</button></div>
          <label class="n-category">分类<select v-model="category"><option v-for="(label, key) in categories" :key="key" :value="key">{{ label }}</option></select></label>
          <p v-if="!filteredFoods.length" class="n-card n-muted">没有找到食物，可以换个关键词或新增自定义食品。</p>
          <article v-for="food in filteredFoods" :key="food.id" class="n-food-row"><button class="n-food-pick" @click="openMeal('lunch', false, food)"><strong>{{ food.name }}</strong><small>{{ weightTypes[food.weightType] }} · 每 100 {{ food.unit }}</small><span>{{ fmt(food.per100.calories) }} kcal · 蛋白质 {{ fmt(food.per100.protein) }} g</span></button><button :aria-pressed="isFavorite(food.id)" :aria-label="`${isFavorite(food.id) ? '取消常用' : '设为常用'}：${food.name}`" :disabled="busy" @click="favorite(food)">{{ isFavorite(food.id) ? '★' : '☆' }}</button><button v-if="food.custom" :disabled="busy" @click="openDeleteFood(food)">删除</button></article>
          <p class="n-source">基础库：USDA SR Legacy（2018），都是食材参考值，品牌与烹调方式会有差异。带包装食品请按营养表自定义；油、酱料另记。液体库也按克称量，不将克直接当毫升。</p>
        </template>

        <template v-else-if="active === 'trend'">
          <section class="n-intro"><span class="n-kicker">把目光放长一点</span><h1>看变化，不追数字。</h1><p>晨重有波动，7 日均重更适合一起观察。</p></section>
          <section class="n-card n-week"><header><h2>我的饮食周报</h2><span>{{ data.week.from.slice(5) }} — {{ data.week.until.slice(5) }}</span></header><p>最近 7 个已结束的日历日 · 完整饮食 {{ data.week.completeDays }}/7 天 · 晨重 {{ data.week.weightDays }}/7 天</p><div class="n-fields"><div><span>平均晨重</span><strong>{{ fmt(data.week.weight) }} <small>kg</small></strong><p>{{ weekChange }}</p></div><div><span>平均摄入</span><strong>{{ fmt(data.week.calories) }} <small>kcal</small></strong><p>仅取完整饮食日</p></div><div><span>平均蛋白质</span><strong>{{ fmt(data.week.protein) }} <small>g</small></strong></div><div><span>平均膳食纤维</span><strong>{{ !data.week.fiberKnown ? '≥' : '' }}{{ fmt(data.week.fiber) }} <small>g</small></strong></div></div><p>完成训练 {{ data.week.trainings }} 次 · 饭后活动 {{ data.week.walks }} 次</p></section>
          <section class="n-suggestion"><span class="n-kicker">接下来怎么吃</span><h2>{{ data.suggestion.action === 'hold' ? '先保持，继续观察' : `可选目标 ${fmt(data.suggestion.target)} kcal` }}</h2><p>{{ data.suggestion.reason }}</p><p v-if="!data.profile.targetCalories">完成校准、采用目标后，系统才会评估后续调整。</p><button v-if="data.suggestion.action !== 'hold'" :disabled="busy" @click="planAction('adjust')">采用此建议</button><p class="n-muted">每次调整后至少观察三周。不采用时会保持原目标。</p></section>
          <NutritionTrend :rows="data.trend" metric="weight" label="晨重" unit="kg" /><NutritionTrend :rows="data.trend" metric="averageWeight" label="7 日移动均重" unit="kg" /><NutritionTrend :rows="data.trend" metric="calories" label="每日已记录热量" unit="kcal" /><NutritionTrend :rows="data.trend" metric="protein" label="每日已记录蛋白质" unit="g" />
          <details class="n-card"><summary>查看每日明细与均重样本数</summary><div class="n-table-scroll"><table><caption>缺失值为 —；热量包含尚未确认完整的记录</caption><thead><tr><th>日期</th><th>晨重</th><th>7 日均重</th><th>热量</th><th>蛋白质</th></tr></thead><tbody><tr v-for="row in [...data.trend].reverse()" :key="row.date"><th>{{ row.date.slice(5) }}{{ row.complete ? ' ✓' : '' }}</th><td>{{ fmt(row.weight) }}</td><td>{{ fmt(row.averageWeight) }}<small>{{ row.weightDays }}/7 天</small></td><td>{{ fmt(row.calories) }}</td><td>{{ fmt(row.protein) }}</td></tr></tbody></table></div></details>
        </template>

        <template v-else-if="active === 'plan'">
          <section class="n-intro"><span class="n-kicker">我的计划 · {{ goals[data.profile.goal] }}</span><h1>{{ data.profile.targetCalories ? '找到节奏，慢慢来。' : '先认识自己的日常。' }}</h1><p>改善饮食结构、吃够蛋白质与纤维，少喝含糖饮料。用真实记录找到适合自己的安排。</p></section>
          <section class="n-card"><h2>当前营养参考</h2><div class="n-plan-target"><strong>{{ data.profile.targetCalories ? fmt(data.profile.targetCalories) : '校准中' }}<small v-if="data.profile.targetCalories"> kcal / 天</small></strong><p>蛋白质 {{ data.profile.protein }} g · 膳食纤维 {{ data.profile.fiber }} g</p></div><p v-if="data.profile.maintenance">本次校准维持热量参考：{{ fmt(data.profile.maintenance) }} kcal。它是记录估算，会随生活状态变化。</p><p v-if="data.profile.goal === 'fat_loss'">第一小步：从 {{ fmt(data.profile.baselineWeight) }} kg 到约 {{ fmt(data.profile.baselineWeight * .95) }} kg（起点的 5%）。不设赶进度期限。</p><button :disabled="busy" @click="editProfile">编辑档案与分享权限</button></section>
          <section class="n-card"><span class="n-kicker">{{ data.calibration.days }} 天校准</span><h2>{{ data.calibration.from }} — {{ data.calibration.until }}</h2><p>完整饮食 {{ data.calibration.completeDays }}/{{ data.calibration.days }} 天 · 晨重 {{ data.calibration.weightDays }} 天</p><p>{{ data.calibration.reason }}</p><dl class="n-calibration"><div><dt>完整日平均摄入</dt><dd>{{ fmt(data.calibration.calories) }} kcal</dd></div><div><dt>平均晨重</dt><dd>{{ fmt(data.calibration.weight) }} kg</dd></div><div><dt>两端晨重均值变化</dt><dd>{{ fmt(data.calibration.change) }} kg</dd></div></dl><div class="n-stack"><button v-if="!data.profile.targetCalories && data.calibration.canExtend" :disabled="busy" @click="planAction('extend')">延长到 14 天（推荐）</button><button v-if="!data.profile.targetCalories && data.calibration.ready" class="n-primary" :disabled="busy" @click="planAction('adopt')">采用 {{ fmt(data.calibration.target) }} kcal 参考目标</button><button :disabled="busy" @click="openRestart">重新开始校准</button></div></section>
          <section class="n-card"><h2>每天只做几件小事</h2><ol><li>晨起称重，忙时可以跳过。</li><li>早餐、午餐、晚餐、加餐按实际份量记录。</li><li>按 A → E 继续训练，中间忙几天也没关系。</li><li>愿意时饭后散步十分钟。</li></ol><p>一次吃多了不需要补偿性禁食，也不用补课式猛练。此模块提供生活记录与参考，不作疾病诊断或治疗。</p></section>
        </template>
      </template>
    </main>

    <dialog ref="dialog" class="nutrition-dialog" @cancel="onCancel" @close="onClosed">
      <form v-if="sheet" class="n-sheet-content n-form" @submit.prevent="submitSheet">
        <header class="n-sheet-heading"><h2>{{ sheetTitle }}</h2><button type="button" :disabled="busy" aria-label="关闭" @click="closeSheet">✕</button></header>
        <p v-if="sheetError" class="n-error" role="alert">{{ sheetError }}</p>
        <template v-if="sheet === 'meal'">
          <label>餐次<select v-model="mealDraft.meal"><option v-for="meal in meals" :key="meal.key" :value="meal.key">{{ meal.label }}</option></select></label><label>餐名<input v-model="mealDraft.name" maxlength="60" placeholder="如：今天的家常晚餐"></label>
          <label class="n-check"><input v-model="mealDraft.shared" type="checkbox" :disabled="!data.partner.allowSharedMeals">同时加入 TA 的餐食</label><p v-if="mealDraft.shared" class="n-muted">同样的菜，分别称量；保存后两人的餐食一起更新。</p>
          <label>找一种食物<input v-model="sheetSearch" type="search" placeholder="搜索米饭、鸡胸肉…"></label>
          <div class="n-picker"><button v-for="food in pickerFoods" :key="food.id" type="button" @click="addFood(food)"><strong>{{ food.name }}</strong><span>{{ weightTypes[food.weightType] }} · {{ fmt(food.per100.calories) }} kcal/100{{ food.unit }}</span></button><p v-if="!pickerFoods.length">没有匹配食物，可关闭后在「饮食」新增自定义食品。</p></div>
          <p v-if="!mealDraft.items.length" class="n-muted">选择食物后，在下方填写实际份量。</p>
          <article v-for="(item, index) in mealDraft.items" :key="index" class="n-draft-food"><header><strong>{{ item.food.name }}</strong><button type="button" :aria-label="`移除${item.food.name}`" @click="mealDraft.items.splice(index, 1)">移除</button></header><p>{{ weightTypes[item.food.weightType] }} · {{ item.food.source }}</p><div class="n-fields"><label>我的份量 / {{ item.food.unit }}<input v-model.number="item.amount" required type="number" min="0.1" max="3000" step="0.1" inputmode="decimal"></label><label v-if="mealDraft.shared">TA 的份量 / {{ item.food.unit }}<input v-model.number="item.partnerAmount" required type="number" min="0.1" max="3000" step="0.1" inputmode="decimal"></label></div><details><summary>每 100 {{ item.food.unit }} 的营养参考</summary><p>蛋白质 {{ fmt(item.food.per100.protein) }} g · 碳水 {{ fmt(item.food.per100.carbs) }} g · 脂肪 {{ fmt(item.food.per100.fat) }} g · 纤维 {{ fmt(item.food.per100.fiber) }} g</p><a v-if="item.food.sourceUrl" :href="item.food.sourceUrl" target="_blank" rel="noopener noreferrer">查看 USDA 来源</a></details></article>
          <p class="n-draft-total">我：{{ fmt(previewTotal(mealDraft.items)) }} kcal <span v-if="mealDraft.shared"> · TA：{{ fmt(previewTotal(mealDraft.items, true)) }} kcal</span></p>
        </template>
        <template v-else-if="sheet === 'measure'">
          <p>建议晨起如厕后、进食前测量，衣着尽量一致。留空会清除当天对应值。</p><div class="n-fields"><label>晨重 / kg<input v-model.number="measureDraft.weight" type="number" min="25" max="300" step="0.1" inputmode="decimal"></label><label>腰围 / cm · 选填<input v-model.number="measureDraft.waist" type="number" min="35" max="250" step="0.1" inputmode="decimal"></label><label>大腿围 / cm · 选填<input v-model.number="measureDraft.thigh" type="number" min="15" max="150" step="0.1" inputmode="decimal"></label></div><p class="n-muted">只按你在「我的计划」中的隐私设置分享。</p>
        </template>
        <template v-else-if="sheet === 'custom'">
          <label>食物名称<input v-model="custom.name" required maxlength="60" placeholder="如：我的原味酸奶"></label><div class="n-fields"><label>单位<select v-model="custom.unit"><option value="g">克 g</option><option value="ml">毫升 ml</option></select></label><label>称量状态<select v-model="custom.weightType"><option v-for="(label, key) in weightTypes" :key="key" :value="key">{{ label }}</option></select></label></div><label>食物分类<select v-model="custom.category"><option v-for="(label, key) in customCategories" :key="key" :value="key">{{ label }}</option></select></label><p>填写包装上每 100 {{ custom.unit }} 的营养值。若热量单位是 kJ，先除以 4.184 换算为 kcal。</p><div class="n-fields"><label v-for="(label, key) in nutrientLabels" :key="key">{{ label }} / {{ key === 'calories' ? 'kcal' : 'g' }}<input v-model.number="custom.per100[key]" required type="number" min="0" :max="key === 'calories' ? 1000 : 100" step="0.1" inputmode="decimal"></label></div>
        </template>
        <template v-else-if="sheet === 'edit'">
          <p v-if="selectedEntry.shared">这是共享餐。修改或撤销会同时更新两人的记录。</p><div v-for="(food, index) in selectedEntry.foods" :key="index" class="n-draft-food"><strong>{{ food.name }} · {{ weightTypes[food.weightType] }}</strong><div class="n-fields"><label>我的份量 / {{ food.unit }}<input v-model.number="editAmounts[index].mine" required type="number" min="0.1" max="3000" step="0.1" inputmode="decimal"></label><label v-if="selectedEntry.shared">TA 的份量 / {{ food.unit }}<input v-model.number="editAmounts[index].partner" required type="number" min="0.1" max="3000" step="0.1" inputmode="decimal"></label></div></div><button type="button" :disabled="busy" @click="sheet = 'deleteEntry'">撤销这餐记录</button>
        </template>
        <template v-else-if="sheet === 'copy'">
          <p>选择要复制的前一天餐食。保留原份量，仅加入自己当天的记录。</p><label v-for="entry in data.yesterday" :key="entry.id" class="n-check"><input v-model="copyIds" type="checkbox" :value="entry.id">{{ mealLabel(entry.meal) }} · {{ entry.name }} · {{ fmt(entry.totals.calories) }} kcal</label>
        </template>
        <template v-else-if="sheet === 'template'"><label>整餐名称<input v-model="templateName" required maxlength="60"></label><p>保存自己的份量，下次可一键加入指定餐次。</p></template>
        <template v-else-if="sheet === 'useTemplate'"><p>{{ selectedTemplate.name }}</p><label>加入哪一餐<select v-model="mealDraft.meal"><option v-for="meal in meals" :key="meal.key" :value="meal.key">{{ meal.label }}</option></select></label></template>
        <p v-else-if="sheet === 'restart'">将从今天重新进行 7 天校准，清除当前参考目标。已有餐食、晨重和历史记录都会保留。</p>
        <p v-else-if="sheet === 'deleteEntry'">确认撤销这餐？{{ selectedEntry.shared ? '两人的该餐记录会一起撤销。' : '' }} 当天需重新确认完整饮食。</p>
        <p v-else-if="sheet === 'deleteFood'">删除自定义食品「{{ selectedFood.name }}」？已保存餐食与模板中的营养快照会保留。</p>
        <p v-else-if="sheet === 'deleteTemplate'">移除整餐「{{ selectedTemplate.name }}」？历史饮食记录会保留。</p>
        <footer class="n-sheet-footer"><button class="n-primary" :disabled="busy || (sheet === 'meal' && !mealDraft.items.length) || (sheet === 'copy' && !copyIds.length)">{{ busy ? '正在保存…' : sheetSubmitLabel }}</button><button type="button" :disabled="busy" @click="closeSheet">取消</button></footer>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import FeatureHeader from '../components/FeatureHeader.vue'
import NutritionTrend from '../components/NutritionTrend.vue'
import { useWebSocket } from '../composables/useWebSocket.js'
import { CONFIG } from '../utils/config.js'
import { meals, categories, weightTypes, goals, fmt, profileForm, previewTotal, walkRemaining } from '../utils/nutrition.js'
import '../styles/nutrition.css'
const router = useRouter(), { onMessage } = useWebSocket()
const data = ref(null), loading = ref(true), error = ref(''), notice = ref(''), busy = ref(false), active = ref('today'), date = ref('')
const form = ref(profileForm(null)), editingProfile = ref(false), dialog = ref(null), sheet = ref(''), sheetError = ref('')
const search = ref(''), category = ref('all'), libraryScope = ref('all'), sheetSearch = ref(''), mealDraft = ref({ meal: 'dinner', name: '', shared: false, items: [] })
const measureDraft = ref({}), custom = ref({}), selectedEntry = ref(null), selectedTemplate = ref(null), selectedFood = ref(null), editAmounts = ref([]), templateName = ref(''), copyIds = ref([])
const now = ref(Date.now()), tabs = [{ key: 'today', label: '今天' }, { key: 'food', label: '饮食' }, { key: 'trend', label: '趋势' }, { key: 'plan', label: '我的计划' }]
const privacyLabels = { completion: '饮食记录完成状态', calories: '每日已记录总热量', foods: '餐食与份量明细', weight: '晨重', waist: '腰围', thigh: '大腿围' }
const nutrientLabels = { calories: '热量', protein: '蛋白质', carbs: '碳水化合物', fat: '脂肪', fiber: '膳食纤维' }
const customCategories = Object.fromEntries(Object.entries(categories).filter(([key]) => key !== 'all'))
const libraryScopes = { all: '全部', favorites: '常用', recent: '最近', custom: '自定义' }
watch(active, () => { if (data.value && date.value !== data.value.today) { date.value = data.value.today; load() } })
let requestId = '', requestSignature = '', copyRequestIds = {}, invoker = null, unsubscribe, timer, loadGeneration = 0, refreshPending = false
const mealLabel = key => meals.find(meal => meal.key === key)?.label || key
const entriesFor = key => data.value.day.entries.filter(entry => entry.meal === key)
const mealProtein = key => entriesFor(key).reduce((sum, entry) => sum + entry.totals.protein, 0)
const walkFor = key => data.value.day.walks.find(walk => walk.meal === key)
const remaining = key => walkFor(key) ? walkRemaining(walkFor(key).startedAt, now.value) : 0
function walkLabel(key) { const walk = walkFor(key); if (!walk) return '饭后走一走 · 开始 10 分钟'; if (walk.completedAt) return '✓ 饭后活动已完成'; const seconds = remaining(key); return seconds ? `散步进行中 · 还剩 ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '已满 10 分钟 · 确认活动完成' }
const isFavorite = id => data.value.profile.favorites?.includes(id)
const filteredFoods = computed(() => (data.value?.foods || []).filter(food => food.name.includes(search.value.trim()) && (category.value === 'all' || food.category === category.value) && (libraryScope.value === 'all' || (libraryScope.value === 'favorites' && isFavorite(food.id)) || (libraryScope.value === 'recent' && data.value.recentFoodIds.includes(food.id)) || (libraryScope.value === 'custom' && food.custom))))
const pickerFoods = computed(() => (data.value?.foods || []).filter(food => food.name.includes(sheetSearch.value.trim())).sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id))).slice(0, 12))
const macroMetrics = computed(() => [{ key: 'protein', label: '蛋白质', target: data.value.profile.protein }, { key: 'fiber', label: '膳食纤维', target: data.value.profile.fiber }, { key: 'carbs', label: '碳水化合物' }, { key: 'fat', label: '脂肪' }])
const calibrationDay = computed(() => Math.max(1, Math.floor((Date.parse(data.value.date) - Date.parse(data.value.profile.calibrationStart)) / 86400000) + 1))
const energyNote = computed(() => !data.value.day.entries.length ? '从第一餐开始。零食、饮料和烹调油也值得记下来。' : data.value.profile.targetCalories && data.value.day.totals.calories > data.value.profile.targetCalories ? '今天比参考目标多一些也没关系，不需要补偿性禁食。' : '这些是已记录的份量，记全后再确认完整饮食日。')
const weekChange = computed(() => data.value.week.weightDays < 5 || data.value.previousWeek.weightDays < 5 ? '两周各有 5 次晨重后比较变化' : `比前 7 日 ${fmt(data.value.week.weight - data.value.previousWeek.weight)} kg`)
const sheetTitle = computed(() => ({ meal: '记录这一餐', measure: '记录晨重与围度', custom: '自定义食品', edit: '调整实际份量', copy: '复制前一天', template: '保存整餐', useTemplate: '加入整餐', restart: '重新校准', deleteEntry: '撤销餐食', deleteFood: '删除食物', deleteTemplate: '移除整餐' }[sheet.value]))
const sheetSubmitLabel = computed(() => sheet.value === 'meal' && mealDraft.value.shared ? `加入两人的${mealLabel(mealDraft.value.meal)}` : ['restart', 'deleteEntry', 'deleteFood', 'deleteTemplate'].includes(sheet.value) ? '确认' : '保存记录')
async function api(path = '', options = {}) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(`${CONFIG.API_URL}/nutrition${path}`, { ...options, signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: options.body ? JSON.stringify(options.body) : undefined })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '同步失败，请重试')
    return body
  } catch (e) { if (e instanceof TypeError || e.name === 'AbortError') throw new Error('网络连接超时或中断，输入已保留，请重试'); throw e } finally { clearTimeout(timeout) }
}
async function load(silent = false) {
  const generation = ++loadGeneration
  if (!silent) loading.value = true
  try {
    const result = await api(date.value ? `?date=${encodeURIComponent(date.value)}` : '')
    if (generation !== loadGeneration) return
    const initial = !data.value
    data.value = result; date.value = result.date; error.value = ''
    if (initial) form.value = profileForm(result.profile, result.seed)
  } catch (e) { if (generation === loadGeneration) error.value = e.message } finally { if (generation === loadGeneration) loading.value = false }
}
async function mutate(path, method, body, close = false) {
  if (busy.value) return false
  busy.value = true; sheetError.value = ''; error.value = ''; notice.value = ''
  try {
    await api(path, { method, body })
    if (close) closeSheet(true)
    await load(true)
    notice.value = '已保存。按自己的节奏继续。'
    return true
  } catch (e) { if (sheet.value) sheetError.value = e.message; else error.value = e.message; return false }
  finally { busy.value = false; if (refreshPending) { refreshPending = false; load(true) } }
}
async function saveProfile() { if (await mutate('/profile', 'PUT', form.value)) editingProfile.value = false }
function editProfile() { form.value = profileForm(data.value.profile); editingProfile.value = true }
const saveDay = body => mutate('/day', 'PATCH', { date: date.value, fingerprint: data.value.day.fingerprint, ...body })
const planAction = action => mutate('/plan', 'POST', { action, revision: data.value.profile.revision, target: action === 'adopt' ? data.value.calibration.target : data.value.suggestion.target })
const favorite = food => mutate('/favorites', 'PUT', { foodId: food.id, favorite: !isFavorite(food.id) })
const walk = meal => mutate('/walk', 'POST', { date: date.value, meal, action: walkFor(meal) ? 'finish' : 'start' })
async function openSheet(kind) { invoker = document.activeElement; sheet.value = kind; sheetError.value = ''; requestId = ''; requestSignature = ''; await nextTick(); dialog.value.showModal(); document.body.style.overflow = 'hidden' }
function closeSheet(force = false) { if (busy.value && !force) return; dialog.value?.close() }
function onCancel(event) { if (busy.value) event.preventDefault() }
function onClosed() { sheet.value = ''; document.body.style.overflow = ''; invoker?.focus() }
function openMeal(meal, shared = false, food = null) { mealDraft.value = { meal, name: '', shared: shared && data.value.partner.allowSharedMeals, items: [] }; sheetSearch.value = ''; if (food) addFood(food); openSheet('meal') }
function addFood(food) { if (mealDraft.value.items.length < 30) mealDraft.value.items.push({ food, amount: '', partnerAmount: '' }) }
function openMeasurements() { measureDraft.value = Object.fromEntries(['weight', 'waist', 'thigh'].map(key => [key, data.value.day[key] ?? ''])); openSheet('measure') }
function openCustom() { custom.value = { name: '', unit: 'g', weightType: 'ready', category: 'other', per100: { calories: '', protein: '', carbs: '', fat: '', fiber: '' } }; openSheet('custom') }
function openCopy() { copyIds.value = data.value.yesterday.map(entry => entry.id); copyRequestIds = {}; openSheet('copy') }
function openEdit(entry) { selectedEntry.value = entry; editAmounts.value = entry.foods.map((food, i) => ({ mine: food.amount, partner: entry.sharedAmounts?.[i] ?? '' })); openSheet('edit') }
function openTemplate(entry) { selectedEntry.value = entry; templateName.value = entry.name; openSheet('template') }
function openUseTemplate(template) { selectedTemplate.value = template; mealDraft.value.meal = 'lunch'; openSheet('useTemplate') }
function openDeleteTemplate(template) { selectedTemplate.value = template; openSheet('deleteTemplate') }
function openDeleteFood(food) { selectedFood.value = food; openSheet('deleteFood') }
function openRestart() { openSheet('restart') }
function withRequest(body) { const signature = JSON.stringify(body); if (signature !== requestSignature) { requestId = crypto.randomUUID(); requestSignature = signature } return { ...body, requestId } }
async function submitSheet() {
  if (sheet.value === 'meal') return mutate('/entries', 'POST', withRequest({ date: date.value, meal: mealDraft.value.meal, shared: mealDraft.value.shared, name: mealDraft.value.name || `${mealLabel(mealDraft.value.meal)}记录`, items: mealDraft.value.items.map(item => ({ foodId: item.food.id, amount: item.amount, ...(mealDraft.value.shared ? { partnerAmount: item.partnerAmount } : {}) })) }), true)
  if (sheet.value === 'measure') return mutate('/day', 'PATCH', { date: date.value, ...Object.fromEntries(Object.entries(measureDraft.value).map(([key, value]) => [key, value === '' ? null : value])) }, true)
  if (sheet.value === 'custom') return mutate('/foods', 'POST', custom.value, true)
  if (sheet.value === 'edit' || sheet.value === 'deleteEntry') return mutate(`/entries/${selectedEntry.value.id}`, 'PATCH', { revision: selectedEntry.value.revision, ...(sheet.value === 'deleteEntry' ? { deleted: true } : { amounts: editAmounts.value }) }, true)
  if (sheet.value === 'template') return mutate('/templates', 'POST', { name: templateName.value, entryId: selectedEntry.value.id }, true)
  if (sheet.value === 'useTemplate') return mutate('/entries', 'POST', withRequest({ date: date.value, meal: mealDraft.value.meal, templateId: selectedTemplate.value.id, name: selectedTemplate.value.name }), true)
  if (sheet.value === 'deleteTemplate') return mutate(`/templates/${selectedTemplate.value.id}`, 'DELETE', undefined, true)
  if (sheet.value === 'deleteFood') return mutate(`/foods/${selectedFood.value.id}`, 'DELETE', undefined, true)
  if (sheet.value === 'restart') return mutate('/plan', 'POST', { action: 'restart', revision: data.value.profile.revision }, true)
  if (sheet.value === 'copy') {
    if (busy.value) return
    busy.value = true; sheetError.value = ''
    try {
      for (const id of [...copyIds.value]) {
        const entry = data.value.yesterday.find(item => item.id === id)
        copyRequestIds[id] ||= crypto.randomUUID()
        await api('/entries', { method: 'POST', body: { date: date.value, meal: entry.meal, name: entry.name, copyId: id, requestId: copyRequestIds[id] } })
        copyIds.value = copyIds.value.filter(value => value !== id)
      }
      closeSheet(true); notice.value = '已复制所选餐食，请核对今天的实际份量。'
    } catch (e) { sheetError.value = e.message + '；已成功的餐食不会重复加入。' }
    finally { await load(true); busy.value = false }
  }
}
function refresh() { if (busy.value) refreshPending = true; else load(true) }
onMounted(() => { load(); timer = setInterval(() => { now.value = Date.now() }, 1000); unsubscribe = onMessage(message => { if (['nutritionSync', 'fitnessSync'].includes(message.type)) refresh() }); window.addEventListener('focus', refresh) })
onUnmounted(() => { loadGeneration++; clearInterval(timer); unsubscribe?.(); window.removeEventListener('focus', refresh); if (sheet.value) document.body.style.overflow = '' })
</script>
