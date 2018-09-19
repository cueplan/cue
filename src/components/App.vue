<template>
  <div id="app">
    <landing v-if="isSignedOut"></landing>
    <dashboard v-if="user"></dashboard>
    <!-- TODO: Add a loading screen for when (!isSignedOut && !user) -->
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
      console.error(err)
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
