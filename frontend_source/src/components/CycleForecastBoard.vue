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

    <div v-if="board.forecastSupport" class="cycle-forecast-support" :class="board.forecastSupport.level">
      <div class="cycle-support-copy">
        <span>{{ board.forecastSupport.title }}</span>
        <p>{{ board.forecastSupport.detail }}</p>
      </div>
      <div class="cycle-support-signals" aria-label="预测依据">
        <div
          v-for="signal in board.forecastSupport.signals"
          :key="signal.id"
          class="cycle-support-signal"
          :class="signal.tone"
        >
          <span>{{ signal.label }}</span>
          <strong>{{ signal.value }}</strong>
          <small>{{ signal.detail }}</small>
        </div>
      </div>
      <div class="cycle-support-boundary" :class="board.forecastSupport.boundary.tone">
        <strong>{{ board.forecastSupport.boundary.title }}</strong>
        <p>{{ board.forecastSupport.boundary.detail }}</p>
        <ul>
          <li v-for="item in board.forecastSupport.boundary.items" :key="item">{{ item }}</li>
        </ul>
      </div>
      <p class="cycle-support-note">{{ board.forecastSupport.note }}</p>
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
  --cycle-ink: var(--text-primary, #261f24);
  --cycle-muted: var(--text-secondary, #5f535b);
  --cycle-soft: var(--color-primary-soft, #f7dde8);
  --cycle-primary: var(--color-primary, #a24363);
  --cycle-deep: var(--color-primary-deep, #321b26);
  --cycle-leaf: var(--color-secondary, #526f5c);
  --cycle-warning: var(--color-warning, #8a4b16);
  --cycle-danger: var(--color-danger, #9a332a);
  margin: 10px 0 14px;
  padding: 16px;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid rgba(50, 27, 38, 0.09);
  background: linear-gradient(180deg, #fffefd 0%, rgba(255, 250, 253, 0.94) 100%);
  color: var(--cycle-ink);
  font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif);
  box-shadow: 0 14px 30px rgba(50, 27, 38, 0.06);
}

.cycle-board.ongoing {
  background: linear-gradient(180deg, #fff8fb 0%, #fffefd 100%);
}

.cycle-board.warning {
  background: linear-gradient(180deg, #fff8f0 0%, #fffefd 100%);
}

.cycle-board.stable {
  background: linear-gradient(180deg, #f8fcf7 0%, #fffefd 100%);
}

.cycle-board.today {
  background: linear-gradient(180deg, #fff9ed 0%, #fffefd 100%);
}

.cycle-board-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(92px, 116px);
  gap: 14px;
  align-items: stretch;
}

.cycle-board-copy {
  min-width: 0;
}

.cycle-board-label {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 850;
  color: var(--cycle-primary);
}

.cycle-board h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  color: var(--cycle-deep);
  font-family: var(--font-display, var(--font-ui, sans-serif));
  font-weight: 900;
}

.cycle-board p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--cycle-muted);
}

.cycle-board-primary {
  min-height: 86px;
  padding: 2px 0 2px 14px;
  border-left: 1px solid rgba(50, 27, 38, 0.11);
  color: var(--cycle-deep);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  text-align: center;
}

.cycle-board-primary span,
.cycle-board-primary em {
  font-size: 11px;
  color: var(--cycle-muted);
  font-style: normal;
  font-weight: 750;
}

.cycle-board-primary strong {
  font-size: 18px;
  line-height: 1.2;
  font-family: var(--font-number, var(--font-ui, sans-serif));
}

.cycle-board-progress {
  height: 6px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(50, 27, 38, 0.08);
}

.cycle-board-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--cycle-primary);
}

.cycle-board.ongoing .cycle-board-progress span {
  background: var(--cycle-primary);
}

.cycle-board.warning .cycle-board-progress span {
  background: var(--cycle-warning);
}

.cycle-board.stable .cycle-board-progress span {
  background: var(--cycle-leaf);
}

.cycle-board-window {
  margin-top: 12px;
  padding: 10px 0 0;
  border-top: 1px solid rgba(50, 27, 38, 0.1);
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
  color: var(--cycle-muted);
  white-space: nowrap;
}

.cycle-window-row strong {
  color: var(--cycle-deep);
  font-weight: 850;
  text-align: center;
  overflow-wrap: anywhere;
}

.cycle-board-window p {
  margin-top: 5px;
  color: var(--cycle-muted);
  font-size: 11px;
}

.cycle-board-window.after {
  border-top-color: rgba(138, 75, 22, 0.22);
}

.cycle-board-window.peak,
.cycle-board-window.inside_before_peak,
.cycle-board-window.inside_after_peak {
  border-top-color: rgba(162, 67, 99, 0.18);
}

.cycle-forecast-support {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(50, 27, 38, 0.1);
}

.cycle-support-copy span {
  display: block;
  color: var(--cycle-primary);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 850;
}

.cycle-support-copy p {
  margin-top: 4px;
  color: var(--cycle-ink);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 650;
}

.cycle-support-signals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.cycle-support-signal {
  min-width: 0;
  padding-left: 9px;
  border-left: 2px solid rgba(50, 27, 38, 0.12);
}

.cycle-support-signal.good {
  border-left-color: var(--cycle-leaf);
}

.cycle-support-signal.watch {
  border-left-color: var(--cycle-warning);
}

.cycle-support-signal.building {
  border-left-color: var(--cycle-primary);
}

.cycle-support-signal span,
.cycle-support-signal strong,
.cycle-support-signal small {
  display: block;
  min-width: 0;
}

.cycle-support-signal span {
  color: var(--cycle-muted);
  font-size: 10px;
  line-height: 1.2;
  font-weight: 750;
}

.cycle-support-signal strong {
  margin-top: 3px;
  color: var(--cycle-deep);
  font-size: 12px;
  line-height: 1.25;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.cycle-support-signal small {
  margin-top: 3px;
  color: var(--cycle-muted);
  font-size: 10px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.cycle-support-boundary {
  margin-top: 12px;
  padding: 10px 11px;
  border-radius: var(--radius-md, 10px);
  background: rgba(246, 241, 244, 0.72);
}

.cycle-support-boundary.watch {
  background: rgba(255, 244, 232, 0.92);
}

.cycle-support-boundary strong {
  display: block;
  color: var(--cycle-deep);
  font-size: 12px;
  line-height: 1.25;
  font-weight: 850;
}

.cycle-support-boundary p {
  margin-top: 3px;
  font-size: 11px;
}

.cycle-support-boundary ul {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 7px 0 0;
  padding: 0;
  list-style: none;
}

.cycle-support-boundary li {
  position: relative;
  padding-left: 10px;
  color: var(--cycle-muted);
  font-size: 11px;
  line-height: 1.35;
}

.cycle-support-boundary li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}

.cycle-support-note {
  margin-top: 8px;
  color: var(--text-tertiary, #756872);
  font-size: 10px;
  line-height: 1.35;
}

.cycle-calibration {
  margin-top: 14px;
  padding: 12px 0 0;
  border-top: 1px solid rgba(50, 27, 38, 0.1);
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
  color: var(--cycle-muted);
  font-size: 10px;
  line-height: 1.2;
  font-style: normal;
  font-weight: 800;
}

.cycle-calibration-head strong {
  display: block;
  margin-top: 2px;
  color: var(--cycle-deep);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 850;
}

.cycle-calibration-progress {
  height: 5px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(50, 27, 38, 0.08);
}

.cycle-calibration-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--cycle-primary);
}

.cycle-calibration.watch .cycle-calibration-progress span {
  background: var(--cycle-warning);
}

.cycle-calibration.stable .cycle-calibration-progress span {
  background: var(--cycle-leaf);
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
  background: rgba(50, 27, 38, 0.24);
}

.cycle-calibration-step.done > span {
  background: var(--cycle-primary);
}

.cycle-calibration-step.active > span {
  background: var(--cycle-primary);
}

.cycle-calibration-step strong,
.cycle-calibration-step small {
  display: block;
  min-width: 0;
}

.cycle-calibration-step strong {
  color: var(--cycle-deep);
  font-size: 11px;
  line-height: 1.25;
  font-weight: 850;
}

.cycle-calibration-step small {
  margin-top: 2px;
  color: var(--cycle-muted);
  font-size: 10px;
  line-height: 1.3;
}

.cycle-calibration-next {
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-md, 10px);
  background: rgba(247, 221, 232, 0.58);
}

.cycle-calibration.watch .cycle-calibration-next {
  background: rgba(255, 244, 232, 0.94);
}

.cycle-calibration-next strong {
  display: block;
  color: var(--cycle-deep);
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
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(50, 27, 38, 0.08);
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
  color: var(--cycle-muted);
  font-weight: 750;
}

.cycle-board-metric strong {
  display: block;
  font-size: 12px;
  color: var(--cycle-deep);
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cycle-board-actions {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 14px;
}

.cycle-board-action {
  display: flex;
  gap: 8px;
  padding: 10px 11px;
  border-radius: var(--radius-md, 10px);
  background: rgba(247, 221, 232, 0.5);
}

.cycle-board-action.primary {
  background: rgba(247, 221, 232, 0.78);
}

.cycle-board-action.warning {
  background: rgba(255, 244, 232, 0.94);
}

.action-mark {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--cycle-primary);
  flex: 0 0 auto;
}

.cycle-board-action.primary .action-mark {
  background: var(--cycle-primary);
}

.cycle-board-action.warning .action-mark {
  background: var(--cycle-warning);
}

.cycle-board-action strong {
  display: block;
  font-size: 12px;
  color: var(--cycle-deep);
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
  border-radius: var(--radius-sm, 8px);
  background: rgba(247, 221, 232, 0.62);
  color: var(--cycle-deep);
  font-size: 11px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 360px) {
  .cycle-board-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .cycle-board-primary {
    min-height: auto;
    padding: 10px 0 0;
    border-left: 0;
    border-top: 1px solid rgba(50, 27, 38, 0.1);
    text-align: left;
    align-items: baseline;
  }

  .cycle-support-signals {
    grid-template-columns: 1fr;
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
