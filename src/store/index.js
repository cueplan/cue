import automerge from 'automerge'
import lodash from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
import userModule from './user.js'
import listModule from './list.js'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'
const listsFile = 'lists.json'
const dataVersionFile = 'version.json'

var blockstack = require('blockstack')

var debouncedSave = lodash.debounce((dispatch) => {
  return dispatch('save')
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
    user: userModule,
    primaryList: listModule
  },

  state () {
    return {
      blockstack: blockstack,
      dataVersion: 0,
      lists: {},
      listsSaved: true,
      isDirty: false
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

    nextPlanDate: (state) => () => {
      const today = new Date()
      var dayToPlan = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      if (!(typeof state.lists.currentDayPlans === 'undefined')) {
        var currentPlanDate = new Date(state.lists.currentDayPlans.days[state.lists.currentDayPlans.days.length - 1].date)
        if (currentPlanDate >= dayToPlan) {
          dayToPlan.setDate(currentPlanDate.getDate() + 1)
        }
      }

      return new Date(dayToPlan.getFullYear(), dayToPlan.getMonth(), dayToPlan.getDate())
    }
  },

  mutations: {
    setDirty (state, value) {
      state.isDirty = value
    },

    setListsSaved (state, value) {
      state.listsSaved = value
    },

    initializeLists (state) {
      state.lists = {
        lists: [],
        collections: { active: [], archive: [] }
      }
      state.listsSaved = false
    },

    loadLists (state, lists) {
      state.lists = lists
      state.listsSaved = true
    },

    reorderList (state, { collection, oldIndex, newIndex }) {
      state.lists.collections[collection].splice(newIndex, 0, state.lists.collections[collection].splice(oldIndex, 1)[0])
      state.listsSaved = false
    },

    newList (state, { id, name, collection }) {
      state.lists.lists.push({ name: name, id: id })
      state.lists.collections[collection].push(state.lists.lists.length - 1)
      state.listsSaved = false
    },

    startDayPlan (state, { id, name, date }) {
      if (typeof state.lists.currentDayPlans === 'undefined') {
        state.lists.currentDayPlans = { days: [] }
      }
      state.lists.lists.push({ name, id })
      state.lists.currentDayPlans.days.push({ list: state.lists.lists.length - 1, date })
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

    changeListName (state, { listId, name }) {
      state.lists.lists.find(l => l.id === listId).name = name
      state.listsSaved = false
    },

    changeListDate (state, { listId, date }) {
      var dayPlan = state.lists.currentDayPlans.days.find(l => state.lists.lists[l.list].id === listId)
      if (dayPlan === null) {
        return
      }

      dayPlan.date = date.toISOString()
      state.listsSaved = false
    }
  },

  actions: {
    dirty ({ commit, dispatch }) {
      commit('setDirty', true)
      debouncedSave(dispatch)
    },

    forceSave () {
      return debouncedSave.flush() || Promise.resolve()
    },

    save ({ commit, dispatch }) {
      return dispatch('saveLists')
      .then(() => {
        return dispatch('primaryList/saveList')
      })
      .then(() => {
        commit('setDirty', false)
        return Promise.resolve()
      })
    },

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
      commit('initializeLists')
      return dispatch('startDayPlan')
      .then(() => {
        return dispatch('forceSave')
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
            return dispatch('forceSave')
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
          return dispatch('dirty')
        }
      }
      return Promise.resolve()
    },

    saveLists ({ commit, state }) {
      if (state.listsSaved) {
        return Promise.resolve()
      }

      return state.blockstack.putFile(listsFile, JSON.stringify(state.lists), { encrypt: true })
      .then(() => {
        commit('setListsSaved', true)
        return Promise.resolve()
      })
    },

    reorderList ({ commit, dispatch }, { collection, oldIndex, newIndex }) {
      commit('reorderList', { collection, oldIndex, newIndex })
      return dispatch('dirty')
    },

    switchPrimaryList ({ dispatch, getters }, listId) {
      if (getters['primaryList/id'] === listId) {
        return Promise.resolve()
      }
      return dispatch('primaryList/load', listId)
    },

    newList ({ commit, dispatch, getters }, collection) {
      var name = new Date().toLocaleDateString()

      return dispatch('primaryList/newList', { name, date: null })
      .then(() => {
        commit('newList', { id: getters['primaryList/id'], name, collection })
        return dispatch('dirty')
      })
    },

    startDayPlan ({ commit, dispatch, getters, state }) {
      var date = getters.nextPlanDate()
      var name = date.toLocaleDateString()
      return dispatch('primaryList/newList', { name, date })
      .then(() => {
        commit('startDayPlan', { id: getters['primaryList/id'], name, date })
        if (!getters.dayPlanIsCurrent && state.lists.currentDayPlans.days.length > 1) {
          // Move current day plan to archive, and tomorrow day plan to today
          commit('dateChange')
        }
        return dispatch('dirty')
      })
    },

    changeListName ({ commit, dispatch }, {listId, name}) {
      if (!name) {
        return Promise.reject()
      }

      commit('changeListName', { listId, name })
      return dispatch('dirty')
    },

    changeListDate ({ commit, dispatch }, { listId, date }) {
      commit('changeListDate', { listId, date })
      return dispatch('dirty')
    },

    // List specific
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
