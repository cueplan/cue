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
      state.isSignedOut = user === null
    },

    signOut (state) {
      state.user = null
      state.isSignedOut = true
    }
  },

  actions: {
    async signIn ({ commit, rootState }) {
      await rootState.api.listenAuthChange((user) => {
        commit('signIn', user)
      })
    },

    signOut ({ commit, rootState }) {
      rootState.api.signUserOut()
    }
  }
}

export default userModule
