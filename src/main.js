import Vue from 'vue'

import BootstrapVue from 'bootstrap-vue'
import Draggable from './plugins/Draggable.js'
import VueRouter from 'vue-router'

import App from './components/App'
import Auth from './components/Auth'
import store from './store'

Vue.use(BootstrapVue)
Vue.use(Draggable)
Vue.use(VueRouter)

Vue.config.productionTip = false

const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', component: App },
    { path: '/auth', component: Auth }
  ]
})

/* eslint-disable no-new */
new Vue({
  el: '#app',
  store,
  router,
  template: '<router-view/>',
  components: { App }
})
