import lodash from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
import userModule from './user.js'
import listModule from './list.js'
import { planName, getTodaysDate } from '../helpers/dates.js'
import Api from '../helpers/api.js'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'
const listsFile = 'lists.json'
const dataVersionFile = 'version.json'

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

var cleanupObject

var cleanupArray = function (arr) {
  for (var p in arr) {
    if (arr[p] instanceof Array) {
      arr[p] = arr[p][0]
      cleanupObject(arr[p])
    } else if (arr.hasOwnProperty(p) && typeof arr[p] === 'object') {
      cleanupObject(arr[p])
    }
  }

  return arr
}

cleanupObject = function myself (obj) {
  for (var p in obj) {
    if (obj[p] instanceof Array) {
      cleanupArray(obj[p])
    } else if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
      myself(obj[p])
    }
  }

  return obj
}

var setupDateChangeCheck = lodash.once((dispatch) => {
  setInterval(() => {
    dispatch('dateChangeCheck')
  }, 1000 * 60)
})

export default new Vuex.Store({
  modules: {
    user: userModule,
    primaryList: listModule,
    secondaryList: listModule
  },

  state () {
    return {
      api: new Api(),
      dataVersion: 0,
      lists: {},
      listsSaved: true,
      isDirty: false,
      currentDate: getTodaysDate(),
      unsubscribe: null
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
      return state.lists.currentDayPlans.days[0].date
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
        var currentPlanDate = state.lists.currentDayPlans.days[state.lists.currentDayPlans.days.length - 1].date
        if (currentPlanDate != null && currentPlanDate >= dayToPlan) {
          dayToPlan.setDate(currentPlanDate.getDate() + 1)
        }
      }

      return new Date(dayToPlan.getFullYear(), dayToPlan.getMonth(), dayToPlan.getDate())
    },

    primaryListArchivable: (state, getters) => {
      if (typeof state.lists.collections === 'undefined') {
        return false
      }
      var primaryListId = getters['primaryList/id']
      var activeIds = state.lists.collections['active'].map((index) => state.lists.lists[index].id)
      return activeIds.includes(primaryListId)
    },

    primaryListCurrentable: (state, getters) => {
      if (typeof state.lists.collections === 'undefined') {
        return false
      }
      var primaryListId = getters['primaryList/id']
      var archiveIds = state.lists.collections['archive'].map((index) => state.lists.lists[index].id)
      return archiveIds.includes(primaryListId)
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

    archiveList (state, listId) {
      var listIndex = state.lists.collections['active'].indexOf(state.lists.lists.findIndex(l => l.id === listId))
      state.lists.collections['archive'].splice(0, 0, state.lists.collections['active'].splice(listIndex, 1)[0])
      state.listsSaved = false
    },

    makeListCurrent (state, listId) {
      var listIndex = state.lists.collections['archive'].indexOf(state.lists.lists.findIndex(l => l.id === listId))
      state.lists.collections['active'].splice(0, 0, state.lists.collections['archive'].splice(listIndex, 1)[0])
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

      dayPlan.date = date
      state.listsSaved = false
    },

    createInstructions (state, { id, name }) {
      if (typeof state.lists.currentDayPlans === 'undefined') {
        state.lists.currentDayPlans = { days: [] }
      }
      state.lists.lists.push({ name, id })
      state.lists.currentDayPlans.days.push({ list: state.lists.lists.length - 1, date: null })
      state.lists.currentDayPlans.planning = null
      state.listsSaved = false
    },

    unsubscribe (state, unsubscribe) {
      state.unsubscribe = unsubscribe
    },

    // Debug
    debugAction (state) {
      // TODO: make this an account recovery command
      // Read all documents in users lists collection, ignore lists doc and version doc
      // Put all documents into archive lists, in order of the id. Use name/date/id in lists collection
      // Leave currentDayPlans alone/empty
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
    async loadLists ({ dispatch, state }) {
      var contents
      try {
        contents = await state.api.getVersion()
      } catch (err) {
        console.error(err)
        return
      }

      if (contents) {
        // var dataVersion = contents
        // if (dataVersion.version < 2) {
        //   return this.upgradeData()
        // }
      } else {
        await dispatch('initializeLists')
      }

      await dispatch('loadListsVersion2')

      setupDateChangeCheck(dispatch)

      await dispatch('dateChangeCheck')
    },

    initializeLists ({ dispatch, commit, state }) {
      commit('initializeLists')
      return dispatch('startDayPlan')
      .then(() => {
        return dispatch('forceSave')
      })
      .then(() => {
        return state.api.setVersion({ version: 2 })
      })
    },

    async loadListsVersion2 ({ dispatch, commit, state, getters }) {
      if (state.unsubscribe != null) {
        state.unsubscribe()
      }

      var unsubscribe = state.api.onListsSnapshot(snapshot => {
        dispatch('snapshotLists', snapshot)
      })

      commit('unsubscribe', unsubscribe)
    },

    async snapshotLists ({ dispatch, commit, state, getters }, lists) {
      var primaryListId = getters['primaryList/id']
      var secondaryListId = getters['secondaryList/id']
      commit('loadLists', lists)

      if (typeof lists.currentDayPlans === 'undefined') {
        await dispatch('startDayPlan')
        await dispatch('forceSave')
      }

      primaryListId = primaryListId || getters.currentDayPlanId
      await dispatch('switchList', { namespace: 'primaryList', listId: primaryListId })

      if (state.lists.currentDayPlans.planning != null) {
        var listId = state.lists.lists[state.lists.currentDayPlans.days[state.lists.currentDayPlans.planning].list].id
        await dispatch('switchList', { namespace: 'secondaryList', listId })
      } else if (secondaryListId != null) {
        dispatch('secondaryList/unload')
      }
    },

    dateChangeCheck ({ dispatch, commit, state, getters }) {
      var yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (state.currentDate < yesterday) {
        commit('dateChange')
      }

      if (!getters.dayPlanIsCurrent &&
        typeof state.lists.currentDayPlans !== 'undefined' &&
        typeof state.lists.currentDayPlans.days !== 'undefined' &&
        state.lists.currentDayPlans.days.length > 1) {
        // Move current day plan to archive, and tomorrow day plan to today
        commit('shiftDayPlans')
        if (!state.listsSaved) {
          return dispatch('dirty')
        }
      }
      return Promise.resolve()
    },

    async saveLists ({ commit, dispatch, state }) {
      if (state.listsSaved) {
        return
      }

      await state.api.updateLists(state.lists)

      if (state.unsubscribe == null) {
        var unsubscribe = state.api.onListsSnapshot(snapshot => {
          dispatch('snapshotLists', snapshot)
        })

        commit('unsubscribe', unsubscribe)
      }

      commit('setListsSaved', true)
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

    async archiveList ({ commit, dispatch }, listId) {
      commit('archiveList', listId)
      return dispatch('dirty')
    },

    async makeListCurrent ({ commit, dispatch }, listId) {
      commit('makeListCurrent', listId)
      return dispatch('dirty')
    },

    async startDayPlan ({ commit, dispatch, getters, state }) {
      var date = getters.nextPlanDate
      var name = planName(date, null, date.toLocaleDateString())

      if (typeof state.lists.currentDayPlans === 'undefined' || !state.lists.currentDayPlans.days) {
        await dispatch('createInstructions')
      }

      await dispatch('secondaryList/newList', { name, date })

      commit('startDayPlan', { id: getters['secondaryList/id'], name, date })
      var lastDayPlan = null
      if (state.lists.currentDayPlans.days.length > 1) {
        lastDayPlan = state.lists.lists[state.lists.currentDayPlans.days[0].list].id
        if (!getters.dayPlanIsCurrent) {
          // Move current day plan to archive, and tomorrow day plan to today
          commit('shiftDayPlans')
        }
      } else {
        console.error('there should always be an old/initial day plan')
      }

      if (lastDayPlan == null) {
        await dispatch('switchList', { namespace: 'primaryList', listId: lastDayPlan })
      }

      await dispatch('dirty')
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

    async createInstructions ({ commit, dispatch, getters }) {
      await dispatch('primaryList/newInstructions')
      commit('createInstructions', { id: getters['primaryList/id'], name: 'Instructions' })
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

    cloneTodo ({ commit, dispatch, state, getters }, { srcIndex, dstIndex, dstList }) {
      var srcList = 'primaryList'
      if (dstList === 'primaryList') {
        srcList = 'secondaryList'
      }

      var srcTodo = getters[srcList + '/todos'][srcIndex]
      return dispatch(dstList + '/addTodo', { dstIndex, srcTodo })
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
      return state.api.getList(lists[0].contents.lists[lists.currentList].id.toString())
      .then((currentList) => {
        lists.push({
          contents: removeObjectIds(currentList),
          encrypt: true,
          automerge: true,
          path: listPath
        })
        lists.currentList++
        return dispatch('backupOneList', lists)
      })
      .catch((err) => {
        console.error(err)
        lists.currentList++
        return dispatch('backupOneList', lists)
      })
    },

    async restoreBackup ({ state }, file) {
      // TODO: first delete existing documents?

      var contents = await readFile(file)
      var lists = JSON.parse(contents)
      try {
        await Promise.all(lists.map((l) => {
          // based on l.path, choose how to save this
          if (l.path === 'lists.json') {
            return state.api.updateLists(cleanupObject(l.contents))
          } else if (l.path.startsWith('/lists/')) {
            return state.api.updateList(l.path.substring(7, 20), l.contents)
          }

          return Promise.resolve()
        }))
      } catch (err) {
        console.error(err)
      }
    },

    async forceSync ({ state, commit, dispatch }) {
      // Read all documents in users lists collection, ignore lists doc and version doc
      // Put all documents into archive lists, in order of the id. Use name/date/id in lists collection
      // Leave currentDayPlans alone/empty
      var listMeta = await state.api.getListMetadata()
      var archiveIndices = listMeta.map((value, index) => index)
      archiveIndices.reverse()
      var newlists = {
        lists: listMeta,
        collections: { active: [], archive: archiveIndices },
        currentDayPlans: JSON.parse(JSON.stringify(state.lists.currentDayPlans))
      }

      await Promise.all(listMeta.map(value => {
        return state.api.synchronizeListId(value.id.toString())
      }))

      // Preserve current day plans by finding the list id that we used to have and matching it to the list index
      var currentDayPlan0Id = state.lists.lists[state.lists.currentDayPlans.days[0].list].id
      var currentDayPlan1Id = state.lists.currentDayPlans.days.length > 1 ? state.lists.lists[state.lists.currentDayPlans.days[1].list].id : null
      newlists.currentDayPlans.days[0].list = listMeta.findIndex(value => value.id === currentDayPlan0Id)
      if (currentDayPlan1Id !== null) {
        newlists.currentDayPlans.days[1].list = listMeta.findIndex(value => value.id === currentDayPlan1Id)
      }

      commit('loadLists', newlists)
      commit('setListsSaved', false)
      await dispatch('dirty')
    },

    // Debug
    async debugAction ({ state, commit, dispatch }) {
    }
  },

  strict: debug
})
