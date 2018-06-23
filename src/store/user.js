const userModule = {
  namespaced: true,

  state () {
    return {
      user: null,
      isSignedOut: true
    }
  },

  mutations: {
    signIn (state, user) {
      state.user = user
      state.isSignedOut = false
    },

    signOut (state) {
      state.user = null
      state.isSignedOut = true
    }
  },

  actions: {
    redirectToSignIn ({ rootState }) {
      rootState.blockstack.redirectToSignIn()
    },

    signIn ({ commit, rootState }) {
      if (rootState.blockstack.isUserSignedIn()) {
        var userData = rootState.blockstack.loadUserData()
        var user = new rootState.blockstack.Person(userData.profile)
        user.username = userData.username
        commit('signIn', user)
      } else if (rootState.blockstack.isSignInPending()) {
        return rootState.blockstack.handlePendingSignIn()
          .then((userData) => {
            var user = new rootState.blockstack.Person(userData.profile)
            user.username = userData.username
            commit('signIn', user)
            return Promise.resolve()
          })
      }

      return Promise.resolve()
    },

    signOut ({ commit, rootState }) {
      commit('signOut')
      rootState.blockstack.signUserOut()
    }
  },

  getters: {
    userAvatarUrl: (state) => {
      if (typeof state.user === 'undefined') {
        return null
      }

      if (state.user !== null) {
        return state.user.avatarUrl()
      }

      return null
    }
  }
}

export default userModule
