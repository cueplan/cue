import { planName } from '../helpers/dates.js'

const listModule = {
  namespaced: true,

  state () {
    return {
      list: {},
      isSaved: true,
      isLoaded: false,
      unsubscribe: null
    }
  },

  getters: {
    id: (state) => {
      if (!state.isLoaded) {
        return null
      }
      return state.list.id
    },

    name: (state) => {
      if (!state.isLoaded) {
        return null
      }
      return planName(state.list.date, new Date(), state.list.name)
    },

    todos: (state) => {
      if (!state.isLoaded) {
        return []
      }
      return state.list.todos || []
    },

    date: (state) => {
      if (!state.isLoaded || typeof state.list.date === 'undefined' || state.list.date === null) {
        return null
      }
      return new Date(state.list.date)
    },

    canChangeName: (state) => {
      if (typeof state.list.date === 'undefined' || state.list.date === null) {
        return true
      }
      return false
    }
  },

  mutations: {
    setSaved (state, value) {
      state.isSaved = value
    },

    newList (state, listInfo) {
      var name = listInfo.name
      var date = listInfo.date ? listInfo.date.toISOString() : null

      const listId = Date.now()
      state.list = {
        name: name,
        id: listId,
        todos: [ { id: 0, text: '', status: 'incomplete', pinned: date !== null } ],
        date: date
      }
      state.isLoaded = true
      state.isSaved = false
    },

    newInstructions (state) {
      state.list.todos = [
        { id: 0, text: 'Welcome to Cue!', status: 'incomplete', pinned: true },
        { id: 1, text: 'Each line is one entry in a daily plan', status: 'incomplete', pinned: true },
        { id: 2, text: 'Each entry can be checked off, moved, or deleted', status: 'incomplete', pinned: true },
        { id: 3, text: '', status: 'incomplete', pinned: true },
        { id: 4, text: 'Leave a blank line, like the one above, to naturally group things together', status: 'incomplete', pinned: true },
        { id: 5, text: '', status: 'incomplete', pinned: true },
        { id: 6, text: 'Right now you\'re in planning mode for today (the list to the right)', status: 'incomplete', pinned: true },
        { id: 7, text: 'You can drag entries from one day to the next when planning', status: 'incomplete', pinned: true },
        { id: 8, text: 'Try it out by dragging the entry below to your plan for today', status: 'incomplete', pinned: true },
        { id: 9, text: '', status: 'incomplete', pinned: true },
        { id: 10, text: 'Plan tomorrow', status: 'incomplete', pinned: true },
        { id: 11, text: '', status: 'incomplete', pinned: true },
        { id: 12, text: 'Then fill in the plan for today by adding anything else you\'re going to do', status: 'incomplete', pinned: true },
        { id: 13, text: '', status: 'incomplete', pinned: true },
        { id: 14, text: 'You can start small, and just list your three most important tasks', status: 'incomplete', pinned: true },
        { id: 15, text: '', status: 'incomplete', pinned: true },
        { id: 16, text: 'Or flesh out a detailed plan that also lists important appointments, meals, and daily habits.', status: 'incomplete', pinned: true },
        { id: 17, text: '', status: 'incomplete', pinned: true },
        { id: 18, text: 'Either way, it should only take a few minutes to plan.', status: 'incomplete', pinned: true },
        { id: 19, text: '', status: 'incomplete', pinned: true },
        { id: 20, text: 'When you are done, click \'Finish Planning\'. These instructions will move to the archive.', status: 'incomplete', pinned: true }
      ]
    },

    load (state, contents) {
      state.list = contents || {}
      state.isLoaded = true
      state.isSaved = true
    },

    unload (state) {
      state.isLoaded = false
      state.isSaved = true
    },

    changeName (state, newName) {
      state.list.name = newName
      state.isSaved = false
    },

    setDate (state, date) {
      state.list.date = date.toISOString()
      state.isSaved = false
    },

    deleteTodo (state, todoId) {
      state.list.todos.splice(todoId, 1)
      if (state.list.todos.length === 0) {
        state.list.todos.splice(0, 0, { id: 0, text: '', status: 'incomplete', pinned: state.list.date !== null })
      }
      state.isSaved = false
    },

    completeTodo (state, { todoId, value }) {
      state.list.todos[todoId].status = value ? 'completed' : 'incomplete'
      state.isSaved = false
    },

    changeTodoText (state, { todoId, value }) {
      state.list.todos[todoId].text = value
      state.isSaved = false
    },

    pinTodo (state, { todoId, value }) {
      state.list.todos[todoId].pinned = value
      state.isSaved = false
    },

    insertTodoAfter (state, { todoId, value }) {
      state.list.todos.splice(todoId + 1, 0, { id: state.list.todos.length + 1, text: value || '', status: 'incomplete', pinned: state.list.date !== null })
      state.isSaved = false
    },

    reorderTodos (state, { oldIndex, newIndex }) {
      state.list.todos.splice(newIndex, 0, state.list.todos.splice(oldIndex, 1)[0])
      state.isSaved = false
    },

    addTodo (state, { dstIndex, srcTodo }) {
      state.list.todos.splice(dstIndex, 0, { id: dstIndex, text: srcTodo.text || '', status: 'incomplete', pinned: state.list.date !== null })
      state.isSaved = false
    },

    unsubscribe (state, unsubscribe) {
      state.unsubscribe = unsubscribe
    }
  },

  actions: {
    saveList ({ commit, state, rootState }) {
      if (state.isSaved) {
        return Promise.resolve()
      }

      return rootState.api.updateList(state.list.id.toString(), state.list)
      .then(() => {
        commit('setSaved', true)
        if (state.unsubscribe == null) {
          var unsubscribe = rootState.api.onListSnapshot(state.list.id.toString(), snapshot => {
            commit('load', snapshot)
          })

          commit('unsubscribe', unsubscribe)
        }
        return Promise.resolve()
      })
    },

    async newList ({ commit, dispatch, state }, { name, date }) {
      if (!state.isSaved) {
        await dispatch('forceSave', null, { root: true })
      }

      if (state.unsubscribe != null) {
        state.unsubscribe()
      }

      commit('newList', { name, date })
      await dispatch('dirty', null, { root: true })
    },

    async newInstructions ({ commit, dispatch, state }) {
      if (!state.isSaved) {
        await dispatch('forceSave', null, { root: true })
      }

      if (state.unsubscribe != null) {
        state.unsubscribe()
      }

      commit('newList', { name: 'Instructions', date: null })
      commit('newInstructions')
      await dispatch('dirty', null, { root: true })
    },

    async load ({ commit, dispatch, state, rootState }, { listId, force }) {
      if (!state.isSaved) {
        await dispatch('forceSave', null, { root: true })
      }

      if (state.unsubscribe != null) {
        state.unsubscribe()
      }

      var unsubscribe = rootState.api.onListSnapshot(listId.toString(), snapshot => {
        commit('load', snapshot)
      })

      if (force) {
        var data = await rootState.api.getList(listId.toString())
        commit('load', data)
      }

      commit('unsubscribe', unsubscribe)
    },

    unload ({ commit, dispatch, state }) {
      return (!state.isSaved ? dispatch('forceSave', null, { root: true }) : Promise.resolve())
      .then(() => {
        if (state.unsubscribe != null) {
          state.unsubscribe()
        }

        commit('unload')
        return Promise.resolve()
      })
    },

    changeName ({ commit, dispatch, state }, newName) {
      if (!newName) {
        return Promise.reject()
      }

      if (newName === state.list.name) {
        return Promise.resolve()
      }

      return dispatch('changeListName', { listId: state.list.id, name: newName }, { root: true })
      .then(() => {
        commit('changeName', newName)
        return dispatch('dirty', null, { root: true })
      })
    },

    decrementDate ({ commit, dispatch, state }) {
      if (typeof state.list.date === 'undefined' || state.list.date === null) {
        console.error('decrementing date of undated list')
      }

      var newDate = new Date(state.list.date || new Date())
      newDate.setDate(newDate.getDate() - 1)

      return dispatch('changeListDate', { listId: state.list.id, date: newDate }, { root: true })
      .then(() => {
        commit('setDate', newDate)
        return dispatch('dirty', null, { root: true })
      })
    },

    archive ({ dispatch, state }) {
      return dispatch('archiveList', state.list.id, { root: true })
    },

    makeCurrent ({ dispatch, state }) {
      return dispatch('makeListCurrent', state.list.id, { root: true })
    },

    deleteTodo ({ commit, dispatch }, todoId) {
      commit('deleteTodo', todoId)
      return dispatch('dirty', null, { root: true })
    },

    completeTodo ({ commit, dispatch }, { todoId, value }) {
      commit('completeTodo', { todoId, value })
      return dispatch('dirty', null, { root: true })
    },

    changeTodoText ({ commit, dispatch }, { todoId, value }) {
      commit('changeTodoText', { todoId, value })
      return dispatch('dirty', null, { root: true })
    },

    pinTodo ({ commit, dispatch }, { todoId, value }) {
      commit('pinTodo', { todoId, value })
      return dispatch('dirty', null, { root: true })
    },

    insertTodoAfter ({ commit, dispatch }, todoId) {
      commit('insertTodoAfter', todoId)
      return dispatch('dirty', null, { root: true })
    },

    reorderTodos ({ commit, dispatch }, { oldIndex, newIndex }) {
      commit('reorderTodos', { oldIndex, newIndex })
      return dispatch('dirty', null, { root: true })
    },

    addTodo ({ commit, dispatch }, { dstIndex, srcTodo }) {
      commit('addTodo', { dstIndex, srcTodo })
      return dispatch('dirty', null, { root: true })
    }
  }
}

export default listModule
