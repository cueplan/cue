<template>
  <div id="app">
    <landing v-if="! blockstack.isUserSignedIn()"></landing>
    <dashboard v-if="user" :user="user"></dashboard>
  </div>
</template>

<script>

import Landing from './Landing.vue'
import Dashboard from './Dashboard.vue'
import { mapState } from 'vuex'

export default {
  name: 'app',
  components: {Landing, Dashboard},
  mounted () {
    // this.$store.dispatch('signIn')
    // .catch((pending) => {
    //   if (pending) {
    //     window.location = window.location.origin
    //   }
    // })
    if (this.blockstack.isUserSignedIn()) {
      this.userData = this.blockstack.loadUserData()
      this.user = new this.blockstack.Person(this.userData.profile)
      this.user.username = this.userData.username
    } else if (this.blockstack.isSignInPending()) {
      this.blockstack.handlePendingSignIn()
      .then((userData) => {
        window.location = window.location.origin
      })
    }
  },
  data () {
    return {
      user: null
    }
  },
  computed: mapState([
    'blockstack'
  ])
}
</script>

<style src="../assets/sass/app.scss" lang="scss"></style>
