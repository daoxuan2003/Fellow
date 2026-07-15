<template>
  <svg
    class="couple-thread"
    viewBox="0 0 248 42"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <path
      class="couple-thread-path warm-half"
      d="M3 28.5 C28 28.5 52 28.1 78 30.3 C97 32.1 111 35 123.5 34 C117.6 29.5 111 23.8 111 16.7 C111 11 114 7.8 118.3 7.9 C122.3 8 124.3 11.6 124.4 15.4"
    />
    <path
      class="couple-thread-path cool-half"
      d="M124.4 15.4 C125 11.5 127.2 8 131 8 C135.3 8.1 137.8 11.8 137.7 16.6 C137.6 23.1 131.4 29.3 123.5 34 C142 34.7 158 31.1 181 29.5 C203 28 225 28.6 245 28.5"
    />
    <circle class="couple-thread-dot warm" cx="3" cy="28.6" r="3.4" />
    <circle class="couple-thread-dot cool" cx="245" cy="28.6" r="3.4" />
  </svg>
</template>

<style scoped>
.couple-thread {
  display: block;
  overflow: visible;
}

.couple-thread-path {
  fill: none;
  stroke-width: 2.15;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.couple-thread-path.warm-half { stroke: var(--thread-warm, #ff6475); }
.couple-thread-path.cool-half { stroke: var(--thread-cool, #5d8cff); }

.couple-thread-dot.warm { fill: var(--thread-warm, #ff6475); }
.couple-thread-dot.cool { fill: var(--thread-cool, #5d8cff); }

.couple-thread-path,
.couple-thread-dot {
  filter: drop-shadow(0 1px 1px oklch(36% 0.04 265 / 0.08));
}
</style>
