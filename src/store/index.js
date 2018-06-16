import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'
// const oldStorageFile = 'todolists.json'
const listsFile = 'lists.json'
const dataVersionFile = 'version.json'

var blockstack = require('blockstack')

export default new Vuex.Store({
  state () {
    return {
      blockstack: blockstack,
      user: null,
      isSignedOut: !blockstack.isUserSignedIn() && !blockstack.isSignInPending(),
      dataVersion: 0,
      lists: {}
    }
  },

  getters: {
    activeLists: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.collections === 'undefined') {
        return []
      }
      return state.lists.collections.active.map(l => state.lists.lists[l].name)
    },
    archiveLists: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.collections === 'undefined') {
        return []
      }
      return state.lists.collections.archive.map(l => state.lists.lists[l].name)
    }
  },

  mutations: {
    signIn (state, user) {
      state.user = user
      state.isSignedOut = false
    },

    loadLists (state, lists) {
      state.lists = lists
    }
  },

  actions: {
    signIn ({ commit, state }) {
      if (state.blockstack.isUserSignedIn()) {
        var userData = state.blockstack.loadUserData()
        var user = new state.blockstack.Person(userData.profile)
        user.username = userData.username
        commit('signIn', user)
      } else if (state.blockstack.isSignInPending()) {
        return state.blockstack.handlePendingSignIn()
        .then((userData) => {
          var user = new state.blockstack.Person(userData.profile)
          user.username = userData.username
          commit('signIn', user)
          return Promise.resolve()
        })
      }

      return Promise.resolve()
    },

    loadLists ({ dispatch, state }) {
      return state.blockstack.getFile(dataVersionFile, {decrypt: false})
      .then((contents) => {
        if (contents) {
          // var dataVersion = JSON.parse(contents || 0)
          // if (dataVersion < 2) {
          //   return this.upgradeData()
          // }
          return Promise.resolve()
        } else {
          return dispatch('initializeLists')
        }
      })
      .then(() => {
        return dispatch('loadListsVersion2')
      })
    },

    loadListsVersion2 ({ commit, state }) {
      return state.blockstack.getFile(listsFile, { decrypt: true })
      .then((listsText) => {
        var lists = JSON.parse(listsText || {})
        commit('loadLists', lists)
        return Promise.resolve()
      })
    }
  },
  strict: debug
})
