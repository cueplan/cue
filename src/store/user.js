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
    redirectToSignIn ({ commit, rootState }, useBlockstack) {
      commit('useBlockstack', useBlockstack, { root: true })
      rootState.api.redirectToSignIn()
    },

    async handlePendingSignIn ({ rootState }) {
      await rootState.api.handlePendingSignIn()
    },

    async signIn ({ commit, rootState }) {
      if (await rootState.api.isUserSignedIn()) {
        commit('useBlockstack', rootState.api.isUserSignedInWithBlockstack(), { root: true })
        var user = { username: '', avatarUrl: null }
        try {
          user = await rootState.api.getUser()
        } catch (err) {
        }
        commit('signIn', user)
      }

      return Promise.resolve()
    },

    signOut ({ commit, rootState }) {
      commit('signOut')
      rootState.api.signUserOut()
    }
  },

  getters: {
    userAvatarUrl: (state) => {
      if (typeof state.user === 'undefined') {
        return null
      }

      if (state.user !== null) {
        return state.user.avatarUrl
      }

      return null
    }
  }
}

export default userModule
