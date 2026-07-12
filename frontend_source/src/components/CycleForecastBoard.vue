<template>
  <section class="cycle-board" :class="board.tone" aria-label="月经周期照顾提示">
    <div class="cycle-board-head">
      <div class="cycle-board-copy">
        <div class="cycle-board-label">身体照顾提醒</div>
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

    <div v-if="board.window" class="cycle-board-window" :class="board.window.status">
      <div class="cycle-window-row">
        <span>{{ board.window.start }}</span>
        <strong>{{ board.window.label }}</strong>
        <span>{{ board.window.end }}</span>
      </div>
      <p v-if="board.window.detail">{{ board.window.detail }}</p>
    </div>

    <div v-if="board.calibration" class="cycle-calibration" :class="board.calibration.level">
      <div class="cycle-calibration-head">
        <div>
          <span>记录完整度</span>
          <strong>{{ board.calibration.statusLabel }}</strong>
        </div>
        <em>{{ board.calibration.progressPercent }}%</em>
      </div>
      <div class="cycle-calibration-progress" aria-hidden="true">
        <span :style="{ width: board.calibration.progressPercent + '%' }"></span>
      </div>
      <div class="cycle-calibration-steps">
        <div
          v-for="item in board.calibration.checkpoints"
          :key="item.id"
          class="cycle-calibration-step"
          :class="item.state"
        >
          <span></span>
          <div>
            <strong>{{ item.label }} · {{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </div>
        </div>
      </div>
      <div class="cycle-calibration-next">
        <strong>{{ board.calibration.nextStep.title }}</strong>
        <p>{{ board.calibration.nextStep.detail }}</p>
      </div>
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
  border-radius: 12px;
  border: 1px solid rgba(126, 58, 85, 0.08);
  background: #fff;
  box-shadow: 0 12px 28px rgba(75, 36, 50, 0.05);
}

.cycle-board.ongoing {
  background: #fff1f4;
}

.cycle-board.warning {
  background: #fff5ed;
}

.cycle-board.stable {
  background: #f3fbf5;
}

.cycle-board.today {
  background: #fff8e2;
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
  color: #7e3a55;
}

.cycle-board h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  color: #2b2430;
  font-weight: 900;
}

.cycle-board p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #5e4c56;
}

.cycle-board-primary {
  min-height: 86px;
  padding: 10px;
  border-radius: 10px;
  background: #fbf0f5;
  color: #4b2a36;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  text-align: center;
}

.cycle-board-primary span,
.cycle-board-primary em {
  font-size: 11px;
  color: #735a66;
  font-style: normal;
  font-weight: 750;
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
  background: #7e3a55;
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

.cycle-board-window {
  margin-top: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: #fdf8fa;
  border: 1px solid rgba(126, 58, 85, 0.08);
}

.cycle-window-row {
  display: grid;
  grid-template-columns: minmax(42px, auto) minmax(0, 1fr) minmax(42px, auto);
  gap: 8px;
  align-items: center;
}

.cycle-window-row span,
.cycle-window-row strong {
  min-width: 0;
  font-size: 11px;
  line-height: 1.25;
}

.cycle-window-row span {
  color: #725e69;
  white-space: nowrap;
}

.cycle-window-row strong {
  color: #2b2430;
  font-weight: 850;
  text-align: center;
  overflow-wrap: anywhere;
}

.cycle-board-window p {
  margin-top: 5px;
  color: #5e4c56;
  font-size: 11px;
}

.cycle-board-window.after {
  background: rgba(255, 247, 237, 0.9);
  border-color: rgba(194, 65, 12, 0.18);
}

.cycle-board-window.peak,
.cycle-board-window.inside_before_peak,
.cycle-board-window.inside_after_peak {
  background: #fdf8fa;
}

.cycle-calibration {
  margin-top: 10px;
  padding: 11px 0 0;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.cycle-calibration-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.cycle-calibration-head span,
.cycle-calibration-head em {
  display: block;
  color: #725e69;
  font-size: 10px;
  line-height: 1.2;
  font-style: normal;
  font-weight: 800;
}

.cycle-calibration-head strong {
  display: block;
  margin-top: 2px;
  color: #2b2430;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 850;
}

.cycle-calibration-progress {
  height: 5px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
}

.cycle-calibration-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #7e3a55;
}

.cycle-calibration.watch .cycle-calibration-progress span {
  background: #c2410c;
}

.cycle-calibration.stable .cycle-calibration-progress span {
  background: #15803d;
}

.cycle-calibration-steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;
  margin-top: 10px;
}

.cycle-calibration-step {
  min-width: 0;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 7px;
}

.cycle-calibration-step > span {
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 50%;
  background: #a89aa2;
}

.cycle-calibration-step.done > span {
  background: #7e3a55;
}

.cycle-calibration-step.active > span {
  background: #c2415f;
}

.cycle-calibration-step strong,
.cycle-calibration-step small {
  display: block;
  min-width: 0;
}

.cycle-calibration-step strong {
  color: #2b2430;
  font-size: 11px;
  line-height: 1.25;
  font-weight: 850;
}

.cycle-calibration-step small {
  margin-top: 2px;
  color: #655660;
  font-size: 10px;
  line-height: 1.3;
}

.cycle-calibration-next {
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  background: #fbf0f5;
}

.cycle-calibration.watch .cycle-calibration-next {
  background: rgba(194, 65, 12, 0.08);
}

.cycle-calibration-next strong {
  display: block;
  color: #2b2430;
  font-size: 12px;
  line-height: 1.25;
}

.cycle-calibration-next p {
  margin-top: 3px;
  font-size: 11px;
}

.cycle-board-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.cycle-board-metric {
  min-width: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  text-align: left;
}

.cycle-board-metric span {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  color: #725e69;
  font-weight: 750;
}

.cycle-board-metric strong {
  display: block;
  font-size: 12px;
  color: #2b2430;
  font-weight: 850;
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
  border-radius: 10px;
  background: #fbf0f5;
}

.cycle-board-action.primary {
  background: #f7e5ed;
}

.cycle-board-action.warning {
  background: rgba(255, 247, 237, 0.94);
}

.action-mark {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: #7e3a55;
  flex: 0 0 auto;
}

.cycle-board-action.primary .action-mark {
  background: #7e3a55;
}

.cycle-board-action.warning .action-mark {
  background: #c2410c;
}

.cycle-board-action strong {
  display: block;
  font-size: 12px;
  color: #2b2430;
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
  background: #fbf0f5;
  color: #7e3a55;
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

  .cycle-calibration-steps {
    grid-template-columns: 1fr;
  }

  .cycle-window-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .cycle-window-row strong {
    text-align: left;
  }
}
</style>
