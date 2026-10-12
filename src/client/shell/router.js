import { createRouter, createWebHistory } from 'vue-router'
import ComponentsPage from './pages/ComponentsPage.vue'
import ComponentPage from './pages/ComponentPage.vue'
import ExperimentsPage from './pages/ExperimentsPage.vue'
import ExperimentPage from './pages/ExperimentPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/components' },
    { path: '/components', component: ComponentsPage },
    { path: '/components/:id(.*)', component: ComponentPage, props: true },
    { path: '/experiments', component: ExperimentsPage },
    { path: '/experiments/:id(.*)', component: ExperimentPage, props: true },
  ],
})
