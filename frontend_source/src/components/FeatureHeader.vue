<template>
  <header class="gf-detail-header">
    <button class="gf-detail-back" type="button" aria-label="返回首页" @click="router.push('/home')">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
    <div class="gf-detail-masthead">
      <span>{{ eyebrow }}</span>
      <strong>{{ title }}</strong>
    </div>
    <slot name="action">
      <span class="gf-detail-glyph" :class="`glyph-${kind}`" aria-hidden="true">
        <i></i><b></b><em></em>
      </span>
    </slot>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, required: true },
  chapter: { type: String, default: '' },
  kind: { type: String, required: true }
})

const router = useRouter()
</script>

<style scoped>
.gf-detail-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 12px;
  min-height: 70px;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 17px 12px;
  color: #25242d;
  background: rgba(255, 251, 246, 0.88);
  border-bottom: 1px solid rgba(68, 60, 52, 0.08);
  box-shadow: 0 8px 32px rgba(56, 52, 68, 0.055);
  backdrop-filter: blur(18px) saturate(1.2);
}

.gf-detail-back,
:slotted(button) {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  color: #36323a;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 50%;
  box-shadow: 0 8px 21px rgba(47, 46, 59, 0.08);
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

.gf-detail-masthead span,
.gf-detail-masthead strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gf-detail-masthead span {
  color: var(--chapter-deep, #b95054);
  font: 500 8px/1.2 var(--fellow-font-display);
  letter-spacing: 0.17em;
}

.gf-detail-masthead strong {
  margin-top: 2px;
  color: #25222a;
  font: 600 20px/1.25 var(--fellow-font-display);
  letter-spacing: -0.035em;
}

.gf-detail-glyph {
  position: relative;
  display: inline-block;
  justify-self: end;
  width: 39px;
  height: 39px;
  transform: scale(0.9);
}

.gf-detail-glyph i,
.gf-detail-glyph b,
.gf-detail-glyph em {
  position: absolute;
  display: block;
  box-sizing: border-box;
  border: 2.5px solid var(--gf-ink, #25242d);
}

.glyph-mood i { inset: 4px; border-radius: 55% 45% 52% 48%; background: var(--gf-pink, #f77ea4); transform: rotate(-8deg); }
.glyph-mood b { top: 15px; left: 13px; width: 5px; height: 7px; border-radius: 50%; background: var(--gf-ink, #25242d); }
.glyph-mood em { top: 15px; right: 12px; width: 5px; height: 7px; border-radius: 50%; background: var(--gf-ink, #25242d); }
.glyph-album i { inset: 5px 2px 6px 5px; border-radius: 7px; background: var(--gf-blue, #69cfee); transform: rotate(-5deg); }
.glyph-album b { right: 3px; bottom: 4px; width: 19px; height: 15px; border-radius: 5px; background: var(--gf-yellow, #fff1a8); transform: rotate(7deg); }
.glyph-album em { top: 11px; left: 11px; width: 7px; height: 7px; border-radius: 50%; background: #fff; }
.glyph-study i { inset: 4px 5px; border-radius: 4px 11px 4px 8px; background: #fff; }
.glyph-study b { top: 5px; right: 6px; width: 8px; height: 28px; background: var(--gf-orange, #ff9d46); transform: rotate(14deg); }
.glyph-study em { bottom: 9px; left: 8px; width: 22px; height: 5px; background: var(--gf-blue, #69cfee); }
.glyph-plan i { top: 7px; left: 3px; width: 32px; height: 28px; border-radius: 7px; background: #fff; }
.glyph-plan b { top: 2px; left: 10px; width: 7px; height: 11px; border-radius: 4px; background: var(--gf-pink, #f77ea4); }
.glyph-plan em { right: 7px; bottom: 10px; width: 15px; height: 8px; border-width: 0 0 3px 3px; transform: rotate(-45deg); }
.glyph-health i { top: 3px; left: 7px; width: 24px; height: 32px; border-radius: 14px 14px 7px 7px; background: var(--gf-mint, #c8f6e8); }
.glyph-health b { top: 10px; left: 16px; width: 6px; height: 19px; border: 0; background: #fff; }
.glyph-health em { top: 16px; left: 10px; width: 19px; height: 6px; border: 0; background: #fff; }
.glyph-parcel i { inset: 7px 3px 3px; background: var(--gf-yellow, #fff1a8); transform: rotate(-3deg); }
.glyph-parcel b { top: 4px; left: 15px; width: 8px; height: 30px; background: var(--gf-orange, #ff9d46); }
.glyph-parcel em { top: 13px; left: 8px; width: 23px; height: 3px; border: 0; background: var(--gf-ink, #25242d); }
.glyph-cosmetics i { top: 7px; left: 9px; width: 20px; height: 29px; border-radius: 8px 8px 5px 5px; background: var(--gf-pink, #f77ea4); }
.glyph-cosmetics b { top: 1px; left: 12px; width: 14px; height: 8px; border-radius: 4px; background: var(--gf-yellow, #fff1a8); }
.glyph-cosmetics em { top: 4px; right: 1px; width: 8px; height: 8px; border-radius: 50%; background: var(--gf-blue, #69cfee); }
.glyph-ledger i { top: 6px; left: 4px; width: 31px; height: 27px; border-radius: 6px; background: var(--gf-blue, #69cfee); }
.glyph-ledger b { top: 12px; right: 1px; width: 20px; height: 16px; border-radius: 5px; background: var(--gf-yellow, #fff1a8); }
.glyph-ledger em { top: 17px; right: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--gf-ink, #25242d); }
.glyph-wishes i { top: 4px; left: 5px; width: 29px; height: 30px; border-radius: 4px; background: var(--gf-yellow, #fff1a8); transform: rotate(-4deg); }
.glyph-wishes b { top: 0; left: 16px; width: 8px; height: 8px; border-radius: 50%; background: var(--gf-pink, #f77ea4); }
.glyph-wishes em { top: 14px; left: 12px; width: 15px; height: 9px; border-width: 0 0 3px 3px; transform: rotate(-45deg); }

@media (max-width: 340px) {
  .gf-detail-header {
    grid-template-columns: 40px minmax(0, 1fr) 40px;
    gap: 8px;
    padding-right: 12px;
    padding-left: 12px;
  }

  .gf-detail-back,
  :slotted(button) {
    width: 40px;
    height: 40px;
  }
}
</style>
