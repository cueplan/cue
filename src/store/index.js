import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'
var blockstack = require('blockstack')
console.log(blockstack.isUserSignedIn())

export default new Vuex.Store({
  state () {
    return {
      blockstack: blockstack,
      user: null,
      isSignedOut: !blockstack.isUserSignedIn() && !blockstack.isSignInPending()
    }
  },
  mutations: {
    signIn (state, user) {
      state.user = user
      state.isSignedOut = false
    }
  },
  actions: {
    signIn ({ commit, state }) {
      if (state.blockstack.isUserSignedIn()) {
        console.log('already signed in')
        var userData = state.blockstack.loadUserData()
        var user = new state.blockstack.Person(userData.profile)
        user.username = userData.username
        commit('signIn', user)
      } else if (state.blockstack.isSignInPending()) {
        console.log('pending sign in')
        return state.blockstack.handlePendingSignIn()
        .then((userData) => {
          console.log('pending sign in done')
          var user = new state.blockstack.Person(userData.profile)
          user.username = userData.username
          commit('signIn', user)
          return Promise.resolve()
        })
      }

      return Promise.resolve()
    }
  },
  strict: debug
})
