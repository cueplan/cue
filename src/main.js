// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import Draggable from 'vuedraggable'
import VueRouter from 'vue-router'

import App from './components/App'
import ImplicitCallBack from './components/ImplicitCallback'
import Login from './components/Login'
import store from './store'

Vue.use(BootstrapVue)
Vue.use(Draggable)
Vue.use(VueRouter)

Vue.config.productionTip = false

const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', component: App },
    { path: '/implicit/callback', component: ImplicitCallBack },
    { path: '/login', component: Login }
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
