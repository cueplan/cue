const userModule = {
  namespaced: true,

  state () {
    return {
      user: null,
      isSignedOut: false
    }
  },

  getters: {
    userAvatarUrl: (state) => {
      if (typeof state.user === 'undefined' || state.user == null) {
        return null
      }

      return state.user.avatarUrl
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
          console.error(err)
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
  }
}

export default userModule
