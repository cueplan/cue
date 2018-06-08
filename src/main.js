// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import Draggable from 'vuedraggable'
import BootstrapVue from 'bootstrap-vue'

window.blockstack = require('blockstack')
window.uuid = require('uuid/v4')

Vue.use(Draggable)
Vue.use(BootstrapVue)
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  template: '<App/>',
  components: { App }
})
