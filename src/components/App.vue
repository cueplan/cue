<template>
  <div id="app">
    <landing v-if="isSignedOut"></landing>
    <dashboard v-if="user"></dashboard>
  </div>
</template>

<script>

import Landing from './Landing.vue'
import Dashboard from './Dashboard.vue'
import { createNamespacedHelpers } from 'vuex'

const { mapState, mapActions } = createNamespacedHelpers('user')

export default {
  name: 'app',
  components: {Landing, Dashboard},
  created () {
    this.signIn()
    .catch((err) => {
      console.log('catching ' + err)
      window.location = window.location.origin
    })
  },
  computed: mapState([
    'user',
    'isSignedOut'
  ]),
  methods: mapActions([
    'signIn'
  ])
}
</script>

<style src="../assets/sass/app.scss" lang="scss"></style>
