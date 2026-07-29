<template>
  <section class="cycle-board" :class="board.tone" aria-label="月经周期记录">
    <header class="cycle-board__header">
      <div>
        <span>CYCLE RECORD</span>
        <h3>{{ board.title || '周期记录' }}</h3>
      </div>
      <div v-if="board.primary" class="cycle-board__primary">
        <span>{{ board.primary.label }}</span>
        <strong>{{ board.primary.value }}</strong>
        <small v-if="board.primary.meta">{{ board.primary.meta }}</small>
      </div>
    </header>

    <div class="cycle-board__progress" aria-hidden="true">
      <span :style="{ width: Math.max(0, Math.min(100, Number(board.progressPercent) || 0)) + '%' }"></span>
    </div>

    <div v-if="board.window" class="cycle-board__window">
      <span>{{ board.window.start }}</span>
      <strong>{{ board.window.label }}</strong>
      <span>{{ board.window.end }}</span>
    </div>

    <dl v-if="board.metrics?.length" class="cycle-board__metrics">
      <div v-for="metric in board.metrics" :key="metric.label">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<script>
export default {
  name: 'CycleForecastBoard',
  props: {
    board: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.cycle-board {
  margin: 10px 0 14px;
  padding: 14px;
  color: #20202a;
  background: #fff;
  border: 3px solid #20202a;
  border-radius: 12px;
  box-shadow: 3px 4px 0 #20202a;
}

.cycle-board.ongoing { background: #fff0f5; }
.cycle-board.warning { background: #fff4e9; }
.cycle-board.stable { background: #eafff8; }
.cycle-board.today { background: #fff8d5; }

.cycle-board__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(92px, auto);
  align-items: center;
  gap: 12px;
}

.cycle-board__header > div:first-child > span,
.cycle-board__primary span,
.cycle-board__primary small,
.cycle-board__metrics dt {
  display: block;
  color: #62616b;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .08em;
}

.cycle-board h3 {
  margin: 4px 0 0;
  font-size: 19px;
  font-weight: 950;
  line-height: 1.18;
  letter-spacing: -.04em;
}

.cycle-board__primary {
  padding-left: 12px;
  border-left: 2px solid #20202a;
  text-align: right;
}

.cycle-board__primary strong {
  display: block;
  margin: 3px 0;
  font-size: 17px;
  font-weight: 950;
}

.cycle-board__progress {
  height: 9px;
  margin-top: 13px;
  overflow: hidden;
  background: #fff;
  border: 2px solid #20202a;
  border-radius: 999px;
}

.cycle-board__progress span {
  display: block;
  height: 100%;
  background: #ff7fa5;
  border-right: 2px solid #20202a;
}

.cycle-board__window {
  display: grid;
  grid-template-columns: minmax(58px, auto) minmax(0, 1fr) minmax(58px, auto);
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  font-size: 10px;
}

.cycle-board__window strong { text-align: center; font-weight: 950; }
.cycle-board__window span:last-child { text-align: right; }

.cycle-board__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
  margin: 12px 0 0;
  padding-top: 11px;
  border-top: 2px solid #20202a;
}

.cycle-board__metrics dd {
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 950;
}

@media (max-width: 340px) {
  .cycle-board__header { grid-template-columns: 1fr; }
  .cycle-board__primary { padding: 9px 0 0; border-top: 2px solid #20202a; border-left: 0; text-align: left; }
  .cycle-board__window { grid-template-columns: 1fr; }
  .cycle-board__window strong,.cycle-board__window span:last-child { text-align: left; }
}
</style>
