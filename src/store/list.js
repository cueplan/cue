import automerge from 'automerge'

const listModule = {
  namespaced: true,

  state () {
    return {
      list: {},
      isSaved: true,
      isLoaded: false
    }
  },

  getters: {
    id: (state) => {
      return state.list.id
    },

    name: (state) => {
      return state.list.name
    },

    todos: (state) => {
      return state.list.todos || []
    },

    date: (state) => {
      if (typeof state.list.date === 'undefined' || state.list.date === null) {
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

    newList (state, { name, date }) {
      const listId = Date.now()
      state.list = automerge.change(automerge.init(), 'New empty list', ll => {
        ll.name = name
        ll.id = listId
        ll.todos = [ { id: 0, text: '', status: 'incomplete' } ]
        ll.date = date
      })
      state.isLoaded = true
      state.isSaved = false
    },

    load (state, contents) {
      state.list = automerge.load(contents) || automerge.init()
      state.isLoaded = true
      state.isSaved = true
    },

    changeName (state, newName) {
      state.list = automerge.change(state.list, 'Changing list name', ll => {
        ll.name = newName
      })
      state.isSaved = false
    },

    setDate (state, date) {
      state.list = automerge.change(state.list, 'Changing list date', ll => {
        ll.date = date
      })
      state.isSaved = false
    },

    deleteTodo (state, todoId) {
      state.list = automerge.change(state.list, 'Delete a todo', ll => {
        ll.todos.splice(todoId, 1)
        if (ll.todos.length === 0) {
          ll.todos.splice(0, 0, { id: 0, text: '', status: 'incomplete' })
        }
      })
      state.isSaved = false
    },

    completeTodo (state, { todoId, value }) {
      state.list = automerge.change(state.list, 'Complete a todo', ll => {
        ll.todos[todoId].status = value ? 'completed' : 'incomplete'
      })
      state.isSaved = false
    },

    changeTodoText (state, { todoId, value }) {
      state.list = automerge.change(state.list, 'Change todo text', ll => {
        ll.todos[todoId].text = value
      })
      state.isSaved = false
    },

    insertTodoAfter (state, { todoId, value }) {
      state.list = automerge.change(state.list, 'Insert todo', ll => {
        ll.todos.splice(todoId + 1, 0, { id: ll.todos.length + 1, text: value || '', status: 'incomplete' })
      })
      state.isSaved = false
    },

    reorderTodos (state, { oldIndex, newIndex }) {
      state.list = automerge.change(state.list, 'Moving a todo', ll => {
        ll.todos.splice(newIndex, 0, ll.todos.splice(oldIndex, 1)[0])
      })
      state.isSaved = false
    }
  },

  actions: {
    saveList ({ commit, state, rootState }) {
      if (state.isSaved) {
        return Promise.resolve()
      }

      return rootState.blockstack.putFile('/lists/' + state.list.id + '.json', automerge.save(state.list), { encrypt: true })
      .then(() => {
        commit('setSaved', true)
        return Promise.resolve()
      })
    },

    newList ({ commit, dispatch, state }, { name, date }) {
      return (!state.isSaved ? dispatch('forceSave', null, { root: true }) : Promise.resolve())
      .then(() => {
        commit('newList', { name, date })
        return dispatch('dirty', null, { root: true })
      })
    },

    load ({ commit, dispatch, state, rootState }, listId) {
      return (!state.isSaved ? dispatch('forceSave', null, { root: true }) : Promise.resolve())
      .then(() => {
        return rootState.blockstack.getFile('/lists/' + listId + '.json', { decrypt: true })
      })
      .then((contents) => {
        commit('load', contents)
        return Promise.resolve()
      })
      .catch((error) => {
        console.log(error)
      })
    },

    changeName ({ commit, dispatch, state }, newName) {
      if (!newName) {
        return Promise.reject()
      }

      return dispatch('changeListName', { listId: state.list.id, name: newName }, { root: true })
      .then(() => {
        commit('changeName', newName)
        return dispatch('dirty', null, { root: true })
      })
    },

    decrementDate ({ commit, dispatch, state }) {
      if (typeof state.list.date === 'undefined' || state.list.date === null) {
        return Promise.reject()
      }

      var newDate = new Date(state.list.date)
      newDate.setDate(newDate.getDate() - 1)

      return dispatch('changeListDate', { listId: state.list.id, date: newDate }, { root: true })
      .then(() => {
        commit('setDate', newDate)
        return dispatch('dirty', null, { root: true })
      })
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

    insertTodoAfter ({ commit, dispatch }, todoId) {
      commit('insertTodoAfter', todoId)
      return dispatch('dirty', null, { root: true })
    },

    reorderTodos ({ commit, dispatch }, { oldIndex, newIndex }) {
      commit('reorderTodos', { oldIndex, newIndex })
      return dispatch('dirty', null, { root: true })
    }
  }
}

export default listModule
