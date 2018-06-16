<template>
  <div id="app">
    <landing v-if="isSignedOut"></landing>
    <dashboard v-if="user"></dashboard>
  </div>
</template>

<script>

import Landing from './Landing.vue'
import Dashboard from './Dashboard.vue'
import { mapState } from 'vuex'

export default {
  name: 'app',
  components: {Landing, Dashboard},
  created () {
    this.$store.dispatch('signIn')
    .catch(() => {
      window.location = window.location.origin
    })
  },
  computed: mapState([
    'user',
    'isSignedOut'
  ])
}
</script>

<style src="../assets/sass/app.scss" lang="scss"></style>
