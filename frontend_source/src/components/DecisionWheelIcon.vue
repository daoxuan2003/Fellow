<template>
  <svg viewBox="0 0 48 48" aria-hidden="true" class="decision-wheel-icon">
    <circle cx="24" cy="25" r="19" class="icon-mint" />
    <path d="M24 25V6A19 19 0 0 1 43 25Z" class="icon-yellow" />
    <path d="M24 25H43A19 19 0 0 1 24 44Z" class="icon-pink" />
    <path d="M24 25V44A19 19 0 0 1 5 25Z" class="icon-blue" />
    <circle cx="24" cy="25" r="5" class="icon-center" />
    <path d="M20 2H28L24 12Z" class="icon-pointer" />
  </svg>
</template>
<style scoped>
.decision-wheel-icon { display: block; width: 100%; height: 100%; stroke: var(--fellow-ink); stroke-width: 2; stroke-linejoin: round; }
.icon-mint { fill: var(--fellow-mint); } .icon-yellow { fill: var(--fellow-yellow); } .icon-pink { fill: var(--fellow-pink); } .icon-blue { fill: var(--fellow-blue); } .icon-center { fill: var(--fellow-white); } .icon-pointer { fill: var(--fellow-ink); }
</style>
