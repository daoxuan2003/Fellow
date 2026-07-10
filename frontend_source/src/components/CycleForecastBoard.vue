<template>
  <section class="cycle-board" :class="board.tone" aria-label="周期预测雷达">
    <div class="cycle-board-head">
      <div class="cycle-board-copy">
        <div class="cycle-board-label">周期雷达</div>
        <h3>{{ board.title }}</h3>
        <p>{{ board.subtitle }}</p>
      </div>
      <div class="cycle-board-primary">
        <span>{{ board.primary.label }}</span>
        <strong>{{ board.primary.value }}</strong>
        <em v-if="board.primary.meta">{{ board.primary.meta }}</em>
      </div>
    </div>

    <div class="cycle-board-progress">
      <span :style="{ width: board.progressPercent + '%' }"></span>
    </div>

    <div class="cycle-board-metrics">
      <div v-for="metric in board.metrics" :key="metric.label" class="cycle-board-metric">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </div>
    </div>

    <div v-if="board.actions.length" class="cycle-board-actions">
      <div v-for="action in board.actions" :key="action.type" class="cycle-board-action" :class="action.level">
        <span class="action-mark"></span>
        <div>
          <strong>{{ action.title }}</strong>
          <p>{{ action.detail }}</p>
        </div>
      </div>
    </div>

    <div v-if="board.chips.length" class="cycle-board-chips">
      <span v-for="chip in board.chips" :key="chip">{{ chip }}</span>
    </div>
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
  margin: 10px 0 12px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.1);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.07);
}

.cycle-board.ongoing {
  border-color: rgba(194, 65, 95, 0.24);
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.9), rgba(255, 255, 255, 0.96));
}

.cycle-board.warning {
  border-color: rgba(194, 65, 12, 0.24);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.92), rgba(255, 255, 255, 0.96));
}

.cycle-board.stable {
  border-color: rgba(21, 128, 61, 0.2);
  background: linear-gradient(135deg, rgba(240, 253, 244, 0.9), rgba(255, 255, 255, 0.96));
}

.cycle-board.today {
  border-color: rgba(180, 83, 9, 0.2);
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.86), rgba(255, 255, 255, 0.96));
}

.cycle-board-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  gap: 12px;
  align-items: start;
}

.cycle-board-copy {
  min-width: 0;
}

.cycle-board-label {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 800;
  color: #0f766e;
}

.cycle-board h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  color: #1e293b;
}

.cycle-board p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.cycle-board-primary {
  min-height: 86px;
  padding: 10px;
  border-radius: 8px;
  background: #1f2937;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  text-align: center;
}

.cycle-board-primary span,
.cycle-board-primary em {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.68);
  font-style: normal;
}

.cycle-board-primary strong {
  font-size: 18px;
  line-height: 1.2;
}

.cycle-board-progress {
  height: 6px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
}

.cycle-board-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0f766e;
}

.cycle-board.ongoing .cycle-board-progress span {
  background: #c2415f;
}

.cycle-board.warning .cycle-board-progress span {
  background: #c2410c;
}

.cycle-board.stable .cycle-board-progress span {
  background: #15803d;
}

.cycle-board-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.cycle-board-metric {
  min-width: 0;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.92);
  text-align: center;
}

.cycle-board-metric span {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  color: #94a3b8;
}

.cycle-board-metric strong {
  display: block;
  font-size: 12px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cycle-board-actions {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 12px;
}

.cycle-board-action {
  display: flex;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(240, 253, 250, 0.88);
}

.cycle-board-action.primary {
  background: rgba(219, 234, 254, 0.84);
}

.cycle-board-action.warning {
  background: rgba(255, 247, 237, 0.94);
}

.action-mark {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: #0f766e;
  flex: 0 0 auto;
}

.cycle-board-action.primary .action-mark {
  background: #2563eb;
}

.cycle-board-action.warning .action-mark {
  background: #c2410c;
}

.cycle-board-action strong {
  display: block;
  font-size: 12px;
  color: #334155;
}

.cycle-board-action p {
  margin-top: 2px;
  font-size: 11px;
}

.cycle-board-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.cycle-board-chips span {
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(51, 65, 85, 0.07);
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 390px) {
  .cycle-board-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .cycle-board-primary {
    min-height: auto;
    text-align: left;
    align-items: baseline;
  }

  .cycle-board-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
