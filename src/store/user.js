const userModule = {
  namespaced: true,

  state () {
    return {
      user: null,
      isSignedOut: false
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
    async signIn ({ commit, rootState }) {
      if (await rootState.api.isUserSignedIn()) {
        var user = { username: '', avatarUrl: null }
        try {
          user = await rootState.api.getUser()
        } catch (err) {
        }
        commit('signIn', user)
      } else {
        commit('signOut')
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
