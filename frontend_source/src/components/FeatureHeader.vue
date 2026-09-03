<template>
  <header class="gf-detail-header">
    <button class="gf-detail-back" type="button" :aria-label="backLabel" @click="goBack">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
    <div class="gf-detail-masthead">
      <strong>{{ title }}</strong>
    </div>
    <slot name="action">
      <span class="gf-detail-glyph" :class="`glyph-${kind}`" :data-chapter="chapter" aria-hidden="true">
        <i></i><b></b><em></em>
      </span>
    </slot>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  chapter: { type: String, default: '' },
  kind: { type: String, required: true },
  backTo: { type: String, default: '/home' },
  backLabel: { type: String, default: '返回首页' }
})

const router = useRouter()

function goBack() {
  if (props.backTo === '/home') {
    router.push('/home')
    return
  }
  router.push(props.backTo)
}
</script>

<style scoped>
.gf-detail-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 17px 10px;
  color: var(--fellow-ink, #20202a);
  background: var(--fellow-paper, #fffaf5);
  border-bottom: 3px solid var(--fellow-ink, #20202a);
}

.gf-detail-back,
:slotted(button) {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--fellow-ink, #20202a);
  background: var(--fellow-white, #fff);
  border: 3px solid currentColor;
  border-radius: 10px;
  box-shadow: 3px 3px 0 currentColor;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.gf-detail-back:active,
:slotted(button:active) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 currentColor;
}

.gf-detail-back svg,
:slotted(button svg) {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.gf-detail-masthead {
  min-width: 0;
  text-align: left;
}

.gf-detail-masthead strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gf-detail-masthead strong {
  color: var(--fellow-ink, #20202a);
  font: 950 24px/1.15 var(--fellow-font-display);
  letter-spacing: -0.055em;
}

.gf-detail-glyph {
  position: relative;
  display: inline-block;
  justify-self: end;
  width: 44px;
  height: 44px;
  border: 3px solid var(--fellow-ink, #20202a);
  border-radius: 12px;
  background: var(--fellow-yellow, #ffd94a);
  box-shadow: 3px 3px 0 var(--fellow-ink, #20202a);
}

.gf-detail-glyph i,
.gf-detail-glyph b,
.gf-detail-glyph em {
  position: absolute;
  display: block;
  box-sizing: border-box;
  border: 2.5px solid var(--fellow-ink, #20202a);
}

.glyph-mood { background: var(--fellow-pink, #ff7fa5); }
.glyph-album { background: var(--fellow-mint, #75dfc1); }
.glyph-study { background: var(--fellow-blue, #58c8f5); }
.glyph-plan { background: var(--fellow-orange, #ff8b4a); }
.glyph-health { background: var(--fellow-pink, #ff7fa5); }
.glyph-parcel { background: var(--fellow-yellow, #ffd94a); }
.glyph-cosmetics { background: var(--fellow-pink, #ff7fa5); }
.glyph-ledger { background: var(--fellow-blue, #58c8f5); }
.glyph-wishes { background: var(--fellow-yellow, #ffd94a); }

.glyph-mood i { inset: 6px; border-radius: 55% 45% 52% 48%; background: #fff; transform: rotate(-8deg); }
.glyph-mood b { top: 15px; left: 13px; width: 5px; height: 7px; border-radius: 50%; background: var(--gf-ink, #25242d); }
.glyph-mood em { top: 15px; right: 12px; width: 5px; height: 7px; border-radius: 50%; background: var(--gf-ink, #25242d); }
.glyph-album i { inset: 7px 4px 8px 7px; border-radius: 7px; background: #fff; transform: rotate(-5deg); }
.glyph-album b { right: 3px; bottom: 4px; width: 19px; height: 15px; border-radius: 5px; background: var(--gf-yellow, #fff1a8); transform: rotate(7deg); }
.glyph-album em { top: 11px; left: 11px; width: 7px; height: 7px; border-radius: 50%; background: #fff; }
.glyph-study i { inset: 6px 7px; border-radius: 4px 11px 4px 8px; background: #fff; }
.glyph-study b { top: 5px; right: 6px; width: 8px; height: 28px; background: var(--gf-orange, #ff9d46); transform: rotate(14deg); }
.glyph-study em { bottom: 9px; left: 8px; width: 22px; height: 5px; background: var(--gf-blue, #69cfee); }
.glyph-plan i { top: 9px; left: 5px; width: 32px; height: 28px; border-radius: 7px; background: #fff; }
.glyph-plan b { top: 2px; left: 10px; width: 7px; height: 11px; border-radius: 4px; background: var(--gf-pink, #f77ea4); }
.glyph-plan em { right: 7px; bottom: 10px; width: 15px; height: 8px; border-width: 0 0 3px 3px; transform: rotate(-45deg); }
.glyph-health i { top: 5px; left: 9px; width: 24px; height: 32px; border-radius: 14px 14px 7px 7px; background: #fff; }
.glyph-health b { top: 10px; left: 16px; width: 6px; height: 19px; border: 0; background: #fff; }
.glyph-health em { top: 16px; left: 10px; width: 19px; height: 6px; border: 0; background: #fff; }
.glyph-parcel i { inset: 9px 5px 5px; background: #fff; transform: rotate(-3deg); }
.glyph-parcel b { top: 4px; left: 15px; width: 8px; height: 30px; background: var(--gf-orange, #ff9d46); }
.glyph-parcel em { top: 13px; left: 8px; width: 23px; height: 3px; border: 0; background: var(--gf-ink, #25242d); }
.glyph-cosmetics i { top: 9px; left: 11px; width: 20px; height: 29px; border-radius: 8px 8px 5px 5px; background: #fff; }
.glyph-cosmetics b { top: 1px; left: 12px; width: 14px; height: 8px; border-radius: 4px; background: var(--gf-yellow, #fff1a8); }
.glyph-cosmetics em { top: 4px; right: 1px; width: 8px; height: 8px; border-radius: 50%; background: var(--gf-blue, #69cfee); }
.glyph-ledger i { top: 8px; left: 6px; width: 31px; height: 27px; border-radius: 6px; background: #fff; }
.glyph-ledger b { top: 12px; right: 1px; width: 20px; height: 16px; border-radius: 5px; background: var(--gf-yellow, #fff1a8); }
.glyph-ledger em { top: 17px; right: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--gf-ink, #25242d); }
.glyph-wishes i { top: 6px; left: 7px; width: 29px; height: 30px; border-radius: 4px; background: #fff; transform: rotate(-4deg); }
.glyph-wishes b { top: 0; left: 16px; width: 8px; height: 8px; border-radius: 50%; background: var(--gf-pink, #f77ea4); }
.glyph-wishes em { top: 14px; left: 12px; width: 15px; height: 9px; border-width: 0 0 3px 3px; transform: rotate(-45deg); }

@media (max-width: 340px) {
  .gf-detail-header {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    gap: 6px;
    padding-right: 12px;
    padding-left: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gf-detail-back,
  :slotted(button) { transition: none; }
}
</style>
