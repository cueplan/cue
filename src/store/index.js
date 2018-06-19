import automerge from 'automerge'
import lodash from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'
// const oldStorageFile = 'todolists.json'
const listsFile = 'lists.json'
const dataVersionFile = 'version.json'

var blockstack = require('blockstack')

var debouncedSaveLists = lodash.debounce((dispatch) => {
  dispatch('saveLists')
}, 2000, { maxWait: 30000 })

var debouncedSavePrimaryList = lodash.debounce((dispatch) => {
  dispatch('savePrimaryList')
}, 2000, { maxWait: 30000 })

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
      return state.lists.lists[state.lists.collections[state.collection][listIndex]]
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

    setListsSaved (state, value) {
      state.listsSaved = value
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
    },

    deleteTodo (state, todoId) {
      state.primaryList = automerge.change(state.primaryList, 'Delete a todo', ll => {
        ll.todos.splice(todoId, 1)
        if (ll.todos.length === 0) {
          ll.todos.splice(0, 0, { id: 0, text: '', status: 'incomplete' })
        }
      })
    },

    completeTodo (state, { todoId, value }) {
      state.primaryList = automerge.change(state.primaryList, 'Complete a todo', ll => {
        ll.todos[todoId].status = value ? 'completed' : 'incomplete'
      })
    },

    changeTodoText (state, { todoId, value }) {
      state.primaryList = automerge.change(state.primaryList, 'Change todo text', ll => {
        ll.todos[todoId].text = value
      })
    },

    insertTodoAfter (state, { todoId, value }) {
      state.primaryList = automerge.change(state.primaryList, 'Insert todo', ll => {
        ll.todos.splice(todoId + 1, 0, { id: ll.todos.length + 1, text: value || '', status: 'incomplete' })
      })
    },

    reorderTodos (state, { oldIndex, newIndex }) {
      state.primaryList = automerge.change(state.primaryList, 'Moving a todo', ll => {
        ll.todos.splice(newIndex, 0, ll.todos.splice(oldIndex, 1)[0])
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

    saveLists ({ commit, state }) {
      commit('setListsSaved', false)
      return state.blockstack.putFile(listsFile, JSON.stringify(state.lists), { encrypt: true })
      .then(() => {
        commit('setListsSaved', true)
        return Promise.resolve()
      })
    },

    archiveList ({ commit, dispatch }) {
      commit('archiveList')
      debouncedSaveLists(dispatch)
      // TODO: handle dispatch failure
    },

    reorderList ({ commit, dispatch }, { oldIndex, newIndex }) {
      console.log(oldIndex, newIndex)
      commit('reorderList', { oldIndex, newIndex })
      debouncedSaveLists(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    savePrimaryList ({ commit, state }) {
      commit('setListsSaved', false)
      return state.blockstack.putFile('/lists/' + state.primaryList.id + '.json', automerge.save(state.primaryList), { encrypt: true })
      .then(() => {
        commit('setListsSaved', true)
        return Promise.resolve()
      })
    },

    switchPrimaryList ({ commit, state, getters }, { listIndex, force }) {
      if (state.listIndex === listIndex && !force) {
        return Promise.resolve()
      }

      return (debouncedSavePrimaryList.flush() || Promise.resolve())
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
      return (debouncedSavePrimaryList.flush() || Promise.resolve)
      .then(() => {
        commit('newList')

        debouncedSaveLists(dispatch)
        debouncedSavePrimaryList(dispatch)
      })
      // TODO: handle dispatch failure (i.e. rollback)
    },

    changeListName ({ commit, dispatch }, newName) {
      if (!newName) {
        return Promise.reject()
      }

      commit('changeListName', newName)

      debouncedSaveLists(dispatch)
      debouncedSavePrimaryList(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    deleteTodo ({ commit, dispatch }, todoId) {
      commit('deleteTodo', todoId)
      debouncedSavePrimaryList(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    completeTodo ({ commit, dispatch }, { todoId, value }) {
      commit('completeTodo', { todoId, value })
      debouncedSavePrimaryList(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    changeTodoText ({ commit, dispatch }, { todoId, value }) {
      commit('changeTodoText', { todoId, value })
      debouncedSavePrimaryList(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    insertTodoAfter ({ commit, dispatch }, todoId) {
      commit('insertTodoAfter', todoId)
      debouncedSavePrimaryList(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    reorderTodos ({ commit, dispatch }, { oldIndex, newIndex }) {
      commit('reorderTodos', { oldIndex, newIndex })
      debouncedSavePrimaryList(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    }
  },

  strict: debug
})
