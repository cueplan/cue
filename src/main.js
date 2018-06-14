// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import store from './store'
import Draggable from 'vuedraggable'
import BootstrapVue from 'bootstrap-vue'
import App from './components/App'

window.blockstack = require('blockstack')

Vue.use(Draggable)
Vue.use(BootstrapVue)
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  store,
  template: '<App/>',
  components: { App }
})
