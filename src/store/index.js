import automerge from 'automerge'
import lodash from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
import userModule from './user.js'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'
const listsFile = 'lists.json'
const dataVersionFile = 'version.json'

var blockstack = require('blockstack')

var debouncedSaveLists = lodash.debounce((dispatch) => {
  dispatch('saveLists')
}, 2000, { maxWait: 30000 })

var debouncedSavePrimaryList = lodash.debounce((dispatch) => {
  dispatch('savePrimaryList')
}, 2000, { maxWait: 30000 })

var removeObjectIds = function myself (obj) {
  console.log(obj)
  for (var p in obj) {
    if (p.startsWith('_objectId')) {
      delete obj[p]
    } else if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
      myself(obj[p])
    }
  }

  return obj
}

var readFile = function (file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.onabort = () => {
      reject(reader.result)
    }
    reader.onerror = () => {
      reject(reader.result)
    }
    reader.readAsText(file)
  })
}

var setupDateChangeCheck = lodash.once((dispatch) => {
  setInterval(() => {
    dispatch('dateChangeCheck')
  }, 1000 * 60)
})

export default new Vuex.Store({
  modules: {
    user: userModule
  },

  state () {
    return {
      blockstack: blockstack,
      dataVersion: 0,
      lists: {},
      listsSaved: true,
      primaryList: {}
    }
  },

  getters: {
    activeLists: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.collections === 'undefined') {
        return []
      }
      return { collection: 'active', lists: state.lists.collections.active.map(l => { return { name: state.lists.lists[l].name, id: state.lists.lists[l].id } }) }
    },

    archiveLists: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.collections === 'undefined') {
        return []
      }
      return { collection: 'archive', lists: state.lists.collections.archive.map(l => { return { name: state.lists.lists[l].name, id: state.lists.lists[l].id } }) }
    },

    currentDayPlanId: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.currentDayPlans === 'undefined') {
        return null
      }
      return state.lists.lists[state.lists.currentDayPlans.days[0].list].id
    },

    currentDayPlanDate: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.currentDayPlans === 'undefined') {
        return null
      }
      return new Date(state.lists.currentDayPlans.days[0].date)
    },

    dayPlanIsCurrent: (state, getters) => {
      if (getters.currentDayPlanDate === null) {
        return false
      }
      var dayPlanDate = getters.currentDayPlanDate
      var yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return dayPlanDate > yesterday
    },

    tomorrowDayPlanId: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.currentDayPlans === 'undefined' || state.lists.currentDayPlans.days.length < 2) {
        return null
      }
      console.log(state.lists.currentDayPlans.days.length)
      return state.lists.lists[state.lists.currentDayPlans.days[1].list].id
    },

    primaryListId: (state) => {
      return state.primaryList.id
    }
  },

  mutations: {
    loadLists (state, lists) {
      state.lists = lists
      state.listsSaved = true
    },

    setListsSaved (state, value) {
      state.listsSaved = value
    },

    reorderList (state, { collection, oldIndex, newIndex }) {
      state.lists.collections[collection].splice(newIndex, 0, state.lists.collections[collection].splice(oldIndex, 1)[0])
      state.listsSaved = false
    },

    newList (state, collection) {
      const listId = Date.now()
      const today = new Date()
      var listName = today.toLocaleDateString()

      state.lists.lists.push({ name: listName, id: listId })
      state.lists.collections[collection].push(state.lists.lists.length - 1)
      state.primaryList = automerge.init()
      state.primaryList = automerge.change(state.primaryList, 'New empty list', ll => {
        ll.name = listName
        ll.id = listId
        ll.todos = [ { id: 0, text: '', status: 'incomplete' } ]
      })

      state.listsSaved = false
    },

    startDayPlan (state) {
      const listId = Date.now()
      const today = new Date()
      var dayToPlan = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      if (typeof state.lists.currentDayPlans === 'undefined') {
        state.lists.currentDayPlans = { days: [] }
      } else {
        var currentPlanDate = new Date(state.lists.currentDayPlans.days[state.lists.currentDayPlans.days.length - 1].date)
        if (currentPlanDate >= dayToPlan) {
          dayToPlan.setDate(currentPlanDate.getDate() + 1)
        }
      }

      dayToPlan = new Date(dayToPlan.getFullYear(), dayToPlan.getMonth(), dayToPlan.getDate())
      var listName = dayToPlan.toLocaleDateString()

      state.lists.lists.push({ name: listName, id: listId })
      state.lists.currentDayPlans.days.push({ list: state.lists.lists.length - 1, date: dayToPlan })
      state.primaryList = automerge.init()
      state.primaryList = automerge.change(state.primaryList, 'New empty daily plan', ll => {
        ll.name = listName
        ll.id = listId
        ll.todos = [ { id: 0, text: '', status: 'incomplete' } ]
        ll.date = dayToPlan
      })

      state.listsSaved = false
    },

    dateChange (state) {
      if (state.lists.currentDayPlans.days.length > 1) {
        // Move current day plan to archive, and tomorrow day plan to today
        state.lists.collections.archive.unshift(state.lists.currentDayPlans.days[0].list)
        state.lists.currentDayPlans.days.splice(0, 1)

        state.listsSaved = false
      }
    },

    setPrimaryList (state, primaryList) {
      state.primaryList = primaryList
    },

    changeListName (state, newName) {
      state.lists.lists.find(l => l.id === state.primaryList.id).name = newName
      state.primaryList = automerge.change(state.primaryList, 'Changing list name', ll => {
        ll.name = newName
      })
      state.listsSaved = false
    },

    decrementListDate (state) {
      var dayPlan = state.lists.currentDayPlans.days.find(l => state.lists.lists[l.list].id === state.primaryList.id)
      if (dayPlan == null) {
        return
      }

      var newDate = new Date(dayPlan.date)
      newDate.setDate(newDate.getDate() - 1)
      dayPlan.date = newDate
      state.primaryList = automerge.change(state.primaryList, 'Decrementing List Date', ll => {
        ll.date = newDate
      })

      state.listsSaved = false
    },

    deleteTodo (state, todoId) {
      state.primaryList = automerge.change(state.primaryList, 'Delete a todo', ll => {
        ll.todos.splice(todoId, 1)
        if (ll.todos.length === 0) {
          ll.todos.splice(0, 0, { id: 0, text: '', status: 'incomplete' })
        }
      })
      state.listsSaved = false
    },

    completeTodo (state, { todoId, value }) {
      state.primaryList = automerge.change(state.primaryList, 'Complete a todo', ll => {
        ll.todos[todoId].status = value ? 'completed' : 'incomplete'
      })
      state.listsSaved = false
    },

    changeTodoText (state, { todoId, value }) {
      state.primaryList = automerge.change(state.primaryList, 'Change todo text', ll => {
        ll.todos[todoId].text = value
      })
      state.listsSaved = false
    },

    insertTodoAfter (state, { todoId, value }) {
      state.primaryList = automerge.change(state.primaryList, 'Insert todo', ll => {
        ll.todos.splice(todoId + 1, 0, { id: ll.todos.length + 1, text: value || '', status: 'incomplete' })
      })
      state.listsSaved = false
    },

    reorderTodos (state, { oldIndex, newIndex }) {
      state.primaryList = automerge.change(state.primaryList, 'Moving a todo', ll => {
        ll.todos.splice(newIndex, 0, ll.todos.splice(oldIndex, 1)[0])
      })
      state.listsSaved = false
    }
  },

  actions: {
    // Meta specific
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
      .then(() => {
        setupDateChangeCheck(dispatch)
        return dispatch('dateChangeCheck')
      })
    },

    initializeLists ({ dispatch, commit }) {
      commit('loadLists', {
        lists: [],
        collections: { active: [], archive: [] }
      })
      return dispatch('newList', 'active')
      .then(() => {
        return debouncedSaveLists.flush() || Promise.resolve()
      })
      .then(() => {
        return debouncedSavePrimaryList.flush() || Promise.resolve()
      })
    },

    loadListsVersion2 ({ dispatch, commit, state }) {
      return state.blockstack.getFile(listsFile, { decrypt: true })
      .then((listsText) => {
        var lists = JSON.parse(listsText || {})
        commit('loadLists', lists)
        if (typeof lists.currentDayPlans === 'undefined') {
          return dispatch('startDayPlan')
          .then(() => {
            return debouncedSaveLists.flush() || Promise.resolve()
          })
          .then(() => {
            return debouncedSavePrimaryList.flush() || Promise.resolve()
          })
        }
        return Promise.resolve()
      })
    },

    dateChangeCheck ({ dispatch, commit, state, getters }) {
      if (!getters.dayPlanIsCurrent && state.lists.currentDayPlans.days.length > 1) {
        // Move current day plan to archive, and tomorrow day plan to today
        commit('dateChange')
        if (!state.listsSaved) {
          return debouncedSaveLists(dispatch)
        }
      }
      return Promise.resolve()
    },

    saveLists ({ commit, state }) {
      commit('setListsSaved', false)
      return state.blockstack.putFile(listsFile, JSON.stringify(state.lists), { encrypt: true })
      .then(() => {
        commit('setListsSaved', true)
        return Promise.resolve()
      })
    },

    reorderList ({ commit, dispatch }, { collection, oldIndex, newIndex }) {
      commit('reorderList', { collection, oldIndex, newIndex })
      debouncedSaveLists(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    // List + meta
    switchPrimaryList ({ commit, state }, listId) {
      if (state.primaryList !== null && state.primaryList.id === listId) {
        return Promise.resolve()
      }

      return (debouncedSavePrimaryList.flush() || Promise.resolve())
      .then(() => {
        if (listId === -1) {
          return Promise.reject()
        }
        return state.blockstack.getFile('/lists/' + listId + '.json', { decrypt: true })
      })
      .then((contents) => {
        var primaryList = automerge.load(contents) || automerge.init()
        commit('setPrimaryList', primaryList)
        return Promise.resolve()
      })
      .catch((error) => {
        console.log(error)
      })
    },

    newList ({ commit, dispatch }, collection) {
      return (debouncedSavePrimaryList.flush() || Promise.resolve())
      .then(() => {
        commit('newList', collection)

        debouncedSaveLists(dispatch)
        debouncedSavePrimaryList(dispatch)
      })
      // TODO: handle dispatch failure (i.e. rollback)
    },

    startDayPlan ({ commit, dispatch, getters, state }) {
      return (debouncedSavePrimaryList.flush() || Promise.resolve())
      .then(() => {
        commit('startDayPlan')

        if (!getters.dayPlanIsCurrent && state.lists.currentDayPlans.days.length > 1) {
          // Move current day plan to archive, and tomorrow day plan to today
          commit('dateChange')
        }

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

    decrementListDate ({ commit, dispatch }) {
      commit('decrementListDate')

      debouncedSaveLists(dispatch)
      debouncedSavePrimaryList(dispatch)
      // TODO: handle dispatch failure (i.e. rollback)
    },

    // List specific
    savePrimaryList ({ commit, state }) {
      commit('setListsSaved', false)
      return state.blockstack.putFile('/lists/' + state.primaryList.id + '.json', automerge.save(state.primaryList), { encrypt: true })
      .then(() => {
        commit('setListsSaved', true)
        return Promise.resolve()
      })
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
    },

    // Backup/Restore
    backupData ({ dispatch, state }) {
      var listsToBackup = []
      listsToBackup.push({
        contents: JSON.parse(JSON.stringify(state.lists)),
        encrypt: true,
        path: listsFile,
        automerge: false
      })
      listsToBackup.push({
        path: dataVersionFile,
        contents: state.dataVersion,
        encrypt: false,
        automerge: false
      })
      listsToBackup.currentList = 0

      return dispatch('backupOneList', listsToBackup)
    },

    backupOneList ({ dispatch, state }, lists) {
      console.log(lists[0].contents)
      if (lists.currentList >= lists[0].contents.lists.length) {
        delete lists.currentList
        return Promise.resolve(lists)
      }

      var listPath = '/lists/' + lists[0].contents.lists[lists.currentList].id + '.json'
      return state.blockstack.getFile(listPath, {decrypt: true})
      .then((currentList) => {
        lists.push({
          contents: removeObjectIds(JSON.parse(JSON.stringify(automerge.load(currentList)))),
          encrypt: true,
          automerge: true,
          path: listPath
        })
        lists.currentList++
        return dispatch('backupOneList', lists)
      })
      .catch(() => {
        lists.currentList++
        return dispatch('backupOneList', lists)
      })
    },

    restoreBackup ({ state }, file) {
      return readFile(file)
      .then((contents) => {
        var lists = JSON.parse(contents)
        return Promise.all(lists.map((l) => {
          var contents
          if (l.automerge) {
            contents = automerge.init()
            contents = automerge.save(automerge.change(contents, 'restoring backup', c => {
              for (var p in l.contents) {
                if (!p.startsWith('_')) {
                  c[p] = l.contents[p]
                }
              }
            }))
          } else {
            contents = JSON.stringify(l.contents)
          }
          console.log(contents)
          return state.blockstack.putFile(l.path, contents, {encrypt: l.encrypt})
        }))
      })
    }
  },

  strict: debug
})
