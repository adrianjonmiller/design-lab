<script setup>
const steps = [
  { title: 'Ask for a component', body: 'Prompt your AI tool: "In .design-lab, make a PricingCard with free, pro and team states using our Button."' },
  { title: 'See every state', body: 'It appears under Components with each state from its .lab.js file, live as you edit.' },
  { title: 'Mock up a page', body: 'Ask for an experiment: a full page in experiments/ with mock data, viewable at any width.' },
]
</script>

<template>
  <main class="welcome">
    <p class="eyebrow">design-lab</p>
    <h1>A safe place to play with UI.</h1>
    <p class="lede">
      Everything here lives in <code>.design-lab/</code>. It can use the app's components and styles,
      but never changes the app itself.
    </p>
    <ol class="steps">
      <li v-for="(step, i) in steps" :key="step.title">
        <span class="num">{{ i + 1 }}</span>
        <div>
          <h2>{{ step.title }}</h2>
          <p>{{ step.body }}</p>
        </div>
      </li>
    </ol>
    <p class="note">Delete this file whenever you like. It's only an example.</p>
  </main>
</template>

<style scoped>
.welcome {
  min-height: 100vh;
  padding: clamp(32px, 8vw, 96px) clamp(20px, 6vw, 80px);
  background: linear-gradient(160deg, #f5f3ff 0%, #ffffff 55%);
  font-family: system-ui, sans-serif;
  color: #1f2937;
}
.eyebrow { margin: 0 0 12px; font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #4f46e5; }
h1 { max-width: 14ch; margin: 0; font-size: clamp(32px, 6vw, 56px); line-height: 1.05; letter-spacing: -0.03em; }
.lede { max-width: 52ch; margin: 20px 0 40px; font-size: 18px; line-height: 1.6; color: #4b5563; }
code { padding: 2px 6px; border-radius: 6px; background: #ede9fe; font-size: .9em; }
.steps { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 0; padding: 0; list-style: none; }
.steps li { display: flex; gap: 14px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; }
.num { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #4f46e5; color: #fff; font-weight: 600; font-size: 14px; }
h2 { margin: 2px 0 6px; font-size: 16px; }
.steps p { margin: 0; font-size: 14px; line-height: 1.55; color: #6b7280; }
.note { margin-top: 40px; font-size: 13px; color: #9ca3af; }
</style>
