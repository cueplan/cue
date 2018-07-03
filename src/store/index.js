import automerge from 'automerge'
import lodash from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
import userModule from './user.js'
import listModule from './list.js'
import { planName } from '../helpers/dates.js'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'
const listsFile = 'lists.json'
const dataVersionFile = 'version.json'

var blockstack = require('blockstack')

var debouncedSave = lodash.debounce((dispatch) => {
  return dispatch('save')
}, 2000, { maxWait: 30000 })

var removeObjectIds = function myself (obj) {
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

var getTodaysDate = function (date) {
  var today = date || new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

export default new Vuex.Store({
  modules: {
    user: userModule,
    primaryList: listModule,
    secondaryList: listModule
  },

  state () {
    return {
      blockstack: blockstack,
      dataVersion: 0,
      lists: {},
      listsSaved: true,
      isDirty: false,
      currentDate: getTodaysDate()
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

    currentDayPlanName: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.currentDayPlans === 'undefined') {
        return null
      }
      var currentDayPlan = state.lists.currentDayPlans.days[0]
      return planName(currentDayPlan.date, state.currentDate, state.lists.lists[currentDayPlan.list].name)
    },

    tomorrowDayPlanName: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.currentDayPlans === 'undefined' || state.lists.currentDayPlans.days.length < 2) {
        return null
      }
      var tomorrowDayPlan = state.lists.currentDayPlans.days[1]
      return planName(tomorrowDayPlan.date, state.currentDate, state.lists.lists[tomorrowDayPlan.list].name)
    },

    dayPlanIsCurrent: (state, getters) => {
      if (getters.currentDayPlanDate === null) {
        return false
      }
      var dayPlanDate = getters.currentDayPlanDate
      var yesterday = new Date(state.currentDate)
      yesterday.setDate(yesterday.getDate() - 1)
      return dayPlanDate > yesterday
    },

    tomorrowDayPlanId: (state) => {
      if (typeof state.lists.lists === 'undefined' || typeof state.lists.currentDayPlans === 'undefined' || state.lists.currentDayPlans.days.length < 2) {
        return null
      }
      return state.lists.lists[state.lists.currentDayPlans.days[1].list].id
    },

    nextPlanDate: (state) => {
      var dayToPlan = getTodaysDate(new Date(state.currentDate))

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
      state.lists.currentDayPlans.planning = state.lists.currentDayPlans.days.length - 1
      state.listsSaved = false
    },

    finishDayPlan (state) {
      state.lists.currentDayPlans.planning = null
      state.listsSaved = false
    },

    dateChange (state) {
      state.currentDate = getTodaysDate()
    },

    shiftDayPlans (state) {
      if (state.lists.currentDayPlans.days.length > 1 && state.lists.currentDayPlans.planning == null) {
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
    },

    // Debug
    debugAction (state) {
      var today = new Date()
      state.currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
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
        return dispatch('secondaryList/saveList')
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

    loadListsVersion2 ({ dispatch, commit, state, getters }) {
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
      .then(() => {
        return dispatch('switchList', { namespace: 'primaryList', listId: getters.currentDayPlanId })
      })
      .then(() => {
        if (state.lists.currentDayPlans.planning != null) {
          var listId = state.lists.lists[state.lists.currentDayPlans.days[state.lists.currentDayPlans.planning].list].id
          return dispatch('switchList', { namespace: 'secondaryList', listId })
        }
        return Promise.resolve()
      })
    },

    dateChangeCheck ({ dispatch, commit, state, getters }) {
      var yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (state.currentDate < yesterday) {
        commit('dateChange')
      }

      if (!getters.dayPlanIsCurrent && state.lists.currentDayPlans.days.length > 1) {
        // Move current day plan to archive, and tomorrow day plan to today
        commit('shiftDayPlans')
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

    switchList ({ dispatch, getters }, { namespace, listId }) {
      if (getters['primaryList/id'] === listId || getters['secondaryList/id'] === listId) {
        return Promise.resolve()
      }
      return dispatch(namespace + '/load', listId)
    },

    newList ({ commit, dispatch, getters }, collection) {
      var name = 'Untitled List'

      return dispatch('primaryList/newList', { name, date: null })
      .then(() => {
        commit('newList', { id: getters['primaryList/id'], name, collection })
        return dispatch('dirty')
      })
    },

    startDayPlan ({ commit, dispatch, getters, state }) {
      var date = getters.nextPlanDate
      var name = planName(date, null, date.toLocaleDateString())
      return dispatch('secondaryList/newList', { name, date })
      .then(() => {
        commit('startDayPlan', { id: getters['secondaryList/id'], name, date })
        var lastDayPlan = null
        if (state.lists.currentDayPlans.days.length > 1) {
          lastDayPlan = state.lists.lists[state.lists.currentDayPlans.days[0].list].id
          if (!getters.dayPlanIsCurrent) {
            // Move current day plan to archive, and tomorrow day plan to today
            commit('shiftDayPlans')
          }
        } else {
          // Make sure the instructions are there
        }

        if (lastDayPlan == null) {
          return dispatch('switchList', { namespace: 'primaryList', listId: lastDayPlan })
        }
        return Promise.resolve()
      })
      .then(() => {
        return dispatch('dirty')
      })
    },

    finishDayPlan ({ commit, dispatch, state }) {
      return dispatch('secondaryList/unload')
      .then(() => {
        var listId = state.lists.lists[state.lists.currentDayPlans.days[state.lists.currentDayPlans.days.length - 1].list].id
        return dispatch('switchList', { namespace: 'primaryList', listId })
      })
      .then(() => {
        commit('finishDayPlan')
        return dispatch('dateChangeCheck')
      })
      .then(() => {
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
          return state.blockstack.putFile(l.path, contents, {encrypt: l.encrypt})
        }))
      })
    },

    // Debug
    debugAction ({ commit, dispatch }) {
      commit('debugAction')
      return dispatch('dirty')
    }
  },

  strict: debug
})
