import automerge from 'automerge'
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
      lists: {},
      collection: 'active',
      listIndex: 0,
      listsSaved: true,
      primaryList: {}
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
    },

    listMeta: (state) => (listIndex) => {
      return state.lists.lists[state.lists.collections[state.collection][listIndex || state.listIndex]]
    },

    userAvatarUrl: (state) => {
      if (state.blockstack.isUserSignedIn()) {
        var userData = state.blockstack.loadUserData()
        var user = new state.blockstack.Person(userData.profile)
        return user.avatarUrl()
      }

      return null
    }
  },

  mutations: {
    signIn (state, user) {
      state.user = user
      state.isSignedOut = false
    },

    loadLists (state, lists) {
      state.lists = lists
      state.listsSaved = true
    },

    setListsSaved (state) {
      state.listsSaved = true
    },

    archiveList (state) {
      var archived = state.lists.collections[state.collection].splice(state.listIndex, 1)
      state.lists.collections.archive.push(archived)

      if (state.listIndex >= state.lists.collections[state.collection].length) {
        state.listIndex--
      }

      state.listsSaved = false
    },

    setCollection (state, collection) {
      state.collection = collection
    },

    reorderList (state, { oldIndex, newIndex }) {
      state.lists.collections[state.collection].splice(newIndex, 0, state.lists.collections[state.collection].splice(oldIndex, 1)[0])
      if (state.listIndex > oldIndex && state.listIndex <= newIndex) {
        state.listIndex--
      } else if (state.listIndex >= newIndex && state.listIndex < oldIndex) {
        state.listIndex++
      } else if (state.listIndex === oldIndex) {
        state.listIndex = newIndex
      }
      state.listsSaved = false
    },

    setPrimaryList (state, { primaryList, listIndex }) {
      state.listIndex = listIndex
      state.primaryList = primaryList
    },

    newList (state) {
      const listId = Date.now()
      const today = new Date()
      var listName = today.toLocaleDateString()

      state.lists.lists.push({ name: listName, id: listId })
      state.lists.collections[state.collection].push(state.lists.lists.length - 1)
      state.primaryList = automerge.init()
      state.primaryList = automerge.change(state.primaryList, 'New empty list', ll => {
        ll.name = listName
        ll.id = listId
        ll.todos = [ { id: 0, text: '', status: 'incomplete' } ]
      })

      state.listIndex = state.lists.collections[state.collection].length - 1
    },

    changeListName (state, newName) {
      state.lists.lists[state.lists.collections[state.collection][state.listIndex]].name = newName
      state.primaryList = automerge.change(state.primaryList, 'Changing list name', ll => {
        ll.name = newName
      })
    }
  },

  actions: {
    redirectToSignIn ({ state }) {
      state.blockstack.redirectToSignIn()
    },

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

    signOut ({ state }) {
      state.blockstack.signUserOut(window.location.href)
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
    },

    saveLists ({ state }) {
      return state.blockstack.putFile(listsFile, JSON.stringify(state.lists), { encrypt: true })
    },

    archiveList ({ commit, dispatch }) {
      commit('archiveList')
      return dispatch('saveLists')
      .then(() => {
        commit('setListsSaved')
        return Promise.resolve()
      })
      // TODO: handle dispatch failure
    },

    reorderList ({ commit, dispatch }, { oldIndex, newIndex }) {
      console.log(oldIndex, newIndex)
      commit('reorderList', { oldIndex, newIndex })
      return dispatch('saveLists')
      .then(() => {
        commit('setListsSaved')
        return Promise.resolve()
      })
      // TODO: handle dispatch failure (i.e. rollback)
    },

    savePrimaryList () {
      console.log('fake save primary list')
      return Promise.resolve()
    },

    switchPrimaryList ({ commit, dispatch, state, getters }, { listIndex, force }) {
      if (state.listIndex === listIndex && !force) {
        return Promise.resolve()
      }

      return dispatch('savePrimaryList')
      .then(() => {
        console.log(listIndex)
        if (listIndex === -1) {
          return Promise.reject()
        }
        return state.blockstack.getFile('/lists/' + getters.listMeta(listIndex).id + '.json', { decrypt: true })
      })
      .then((contents) => {
        var primaryList = automerge.load(contents) || automerge.init()
        commit('setPrimaryList', { primaryList: primaryList, listIndex: listIndex })
        return Promise.resolve()
      })
      .catch((error) => {
        console.log(error)
      })
    },

    newList ({ commit, dispatch }) {
      commit('newList')
      return dispatch('saveLists')
      .then(() => {
        return dispatch('savePrimaryList')
      })
      .then(() => {
        commit('setListsSaved')
        return Promise.resolve()
      })
      // TODO: handle dispatch failure (i.e. rollback)
    },

    changeListName ({ commit, dispatch, state }, newName) {
      if (!newName || state.lists.lists.find(l => l.name === newName)) {
        return Promise.reject()
      }

      commit('changeListName', newName)

      return dispatch('saveLists')
      .then(() => {
        dispatch('savePrimaryList')
      })
      .then(() => {
        commit('setListsSaved')
        return Promise.resolve()
      })
      // TODO: handle dispatch failure (i.e. rollback)
    }
  },

  strict: debug
})
