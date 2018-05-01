<template>
  <div class="hello">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-3 navbar">
          <div class="logo">
            <img src="../assets/images/logo.png" height="48" width="144"/>
            <b-dropdown boundary="viewport" right class="user-dropdown" toggleClass="user-toggle">
              <template slot="button-content">
                <img :src="user.avatarUrl() ? user.avatarUrl() : '/avatar-placeholder.png'" class="avatar"/>
              </template>
              <li class="sign-out"><a href="#" @click.prevent="signOut">Sign Out</a></li>
            </b-dropdown>
          </div>
          <listlist
            :lists="listmeta"
            v-on:switchList="switchToList"
            v-on:newList="newList"
            v-on:reorderList="reorderList"
          />
        </div>
        <div class="col-md-9">
          <h1 class="page-header">
            <input id="listNameInput" v-model="newListName" spellcheck=false class="title-input" @keyup.enter.prevent="editListNameKeyUp" @blur.prevent="editListNameBlur"/>
            <b-dropdown boundary="viewport" right text="" class="list-dropdown" toggleClass="list-toggle">
              <b-dropdown-item class="dropdown-item" @click="deleteList">Delete List</b-dropdown-item>
            </b-dropdown>
            <small><span class="saving-status">{{ saving }}</span></small>
          </h1>

          <draggable  element="ul" class="list-group" v-model="todoOrder" :options="{draggable:'.draggable'}" @end="onDragEnd">
            <singletodo
              v-for="(todo, todoId) in todoOrder"
              :todo="todo"
              :todoId="todoId"
              :key="todoId"
              :focus="focusedId === todoId"
              v-on:deleteTodo="deleteTodo"
              v-on:completeTodo="completeTodo"
              v-on:changeTodoText="changeTodoText"
              v-on:insertAfter="insertTodoAfter"
              v-on:todoBlurred="todoBlurred"
              v-on:todoFocused="todoFocused"
              v-on:focusPrev="focusPrevTodo"
              v-on:focusNext="focusNextTodo"
            />
          </draggable>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ListList from './ListList.vue'
import SingleTodo from './SingleTodo.vue'
import draggable from 'vuedraggable'

var STORAGE_FILE = 'todolists.json'

export default {
  name: 'dashboard',
  components: { listlist: ListList, draggable, singletodo: SingleTodo },
  props: ['user'],
  data () {
    return {
      blockstack: window.blockstack,
      automerge: window.automerge,
      lodash: window.lodash,
      lists: window.automerge.init(),
      list: 0,
      newListName: 'Todos',
      todo: '',
      saved: true,
      saving: '',
      focusedId: null,
      pendingFocusId: null,
      throttledPushData: window.lodash.debounce(this.pushDataNow, 3000, { maxWait: 60000 })
    }
  },
  computed: {
    currentList: function () {
      var lists = this.lists.lists
      if (typeof lists === 'undefined' || lists.length <= this.list) {
        return { name: 'None', todos: [] }
      }
      return lists[this.list]
    },
    uidCount: function () {
      return this.currentList.todos.length
    },
    todoOrder: {
      get: function () {
        return this.currentList.todos || []
      },
      set: function (value) {
      }
    },
    listmeta: {
      get: function () {
        if (typeof this.lists.lists === 'undefined') {
          return []
        }
        return this.lists.lists.map(l => l.name)
      }
    }
  },
  created () {
    window.addEventListener('beforeunload', this.beforeUnload)
  },
  mounted () {
    this.fetchData()
  },
  methods: {
    deleteTodo (todoId) {
      this.lists = this.automerge.change(this.lists, 'Delete a todo', l => {
        l.lists[this.list].todos.splice(todoId, 1)
        if (l.lists[this.list].todos.length === 0) {
          l.lists[this.list].todos.splice(0, 0, { id: 0, text: '', completed: false })
        }
      })
      this.pushData()
    },

    completeTodo (todoId, value) {
      this.lists = this.automerge.change(this.lists, 'Complete a todo', l => {
        l.lists[this.list].todos[todoId].completed = value
      })
      this.pushData()
    },

    changeTodoText (todoId, value) {
      this.lists = this.automerge.change(this.lists, 'Change todo text', l => {
        l.lists[this.list].todos[todoId].text = value
      })
      this.pushData()
    },

    insertTodoAfter (todoId, value) {
      this.lists = this.automerge.change(this.lists, 'Insert todo', l => {
        l.lists[this.list].todos.splice(todoId + 1, 0, { id: this.uidCount + 1, text: value || '', completed: false })
      })

      this.pendingFocusId = todoId + 1
      this.focusedId = todoId + 1

      this.pushData()
    },

    todoBlurred (todoId) {
      console.log('Blurred ' + todoId + ', pending ' + this.pendingFocusId)
      this.focusedId = this.pendingFocusId
      this.pendingFocusId = null
    },

    todoFocused (todoId) {
      console.log('Focused ' + todoId)
      this.focusedId = todoId
    },

    focusPrevTodo (todoId) {
      this.pendingFocusId = this.focusedId = Math.max(todoId - 1, 0)
    },

    focusNextTodo (todoId) {
      this.pendingFocusId = this.focusedId = Math.min(todoId + 1, this.currentList.todos.length - 1)
    },

    onDragEnd (evt) {
      this.lists = this.automerge.change(this.lists, 'Moving a todo', l => {
        l.lists[this.list].todos.splice(evt.newIndex, 0, l.lists[this.list].todos.splice(evt.oldIndex, 1)[0])
      })

      this.pushData()
    },

    pushData () {
      this.saved = false
      this.saving = 'Saving...'
      this.throttledPushData()
    },

    pushDataNow () {
      const blockstack = this.blockstack
      const encrypt = true
      blockstack.putFile(STORAGE_FILE, this.automerge.save(this.lists), encrypt)

      this.saved = true
      this.saving = 'Saved'
    },

    beforeUnload (e) {
      if (!this.saved) {
        e.returnValue = "Latest changes haven't been saved. Are you sure?"
      }
    },

    addTodo () {
      if (!this.todo.trim()) {
        return
      }

      this.lists = this.automerge.change(this.lists, 'Add a todo', l => {
        l.lists[this.list].todos.unshift({
          id: this.uidCount + 1,
          text: this.todo.trim(),
          completed: false
        })
      })

      this.todo = ''
      this.pushData()
    },

    editListNameKeyUp (e) {
      this.editListNameBlur(e)
      document.getElementById('listNameInput').blur()
    },

    editListNameBlur (e) {
      this.changeListName()
    },

    switchToList (list) {
      this.list = list
      this.newListName = this.currentList.name
      this.focusedId = null
    },

    reorderList (oldIndex, newIndex) {
      this.lists = this.automerge.change(this.lists, 'Moving a list', l => {
        l.lists.splice(newIndex, 0, l.lists.splice(oldIndex, 1)[0])
      })
      if (this.list > oldIndex && this.list <= newIndex) {
        this.list--
      } else if (this.list >= newIndex && this.list < oldIndex) {
        this.list++
      } else if (this.list === oldIndex) {
        this.list = newIndex
      }
      this.pushData()
    },

    deleteList () {
      this.lists = this.automerge.change(this.lists, 'Delete a list', l => {
        l.lists.splice(this.list, 1)
      })

      if (this.list >= this.lists.lists.length) {
        this.list--
      }

      this.newListName = this.currentList.name
      this.focusedId = null
      this.pushData()
    },

    newList () {
      var listName = 'A New List'
      this.lists = this.automerge.change(this.lists, 'Adding a new list', l => {
        l.lists.push({
          name: listName,
          todos: [{
            id: 0,
            text: '',
            completed: false
          }]
        })
      })
      this.list = this.lists.lists.length - 1
      this.newListName = this.currentList.name
      this.focusedId = null
      this.pushData()
    },

    changeListName () {
      var newName = this.newListName.trim()
      if (!newName || this.lists.lists.find(l => l.name === newName)) {
        this.newListName = this.currentList.name
        return
      }

      this.lists = this.automerge.change(this.lists, 'Changing list ' + this.list + ' to ' + this.newListName, l => {
        l.lists[this.list].name = this.newListName
      })

      this.pushData()
    },

    fetchData () {
      const blockstack = this.blockstack
      const decrypt = true
      blockstack.getFile(STORAGE_FILE, decrypt)
      .then((todosText) => {
        var lists = this.automerge.load(todosText) || this.automerge.init()
        if (typeof lists.lists === 'undefined') {
          lists = this.automerge.change(lists, 'Initialize lists of lists', l => {
            l.lists = []
          })
          lists = this.automerge.change(lists, 'Create default list', l => {
            l.lists = [ { name: 'Todos', todos: [] } ]
          })
          lists = this.automerge.change(lists, 'Set lastList', l => {
            l.lastList = 'Todos'
          })

          this.list = 0
          this.lists = lists
          this.newListName = this.currentList.name
          this.pushData()
        }

        this.list = 0
        this.lists = lists
        this.newListName = this.currentList.name
      })
    },

    signOut () {
      this.blockstack.signUserOut(window.location.href)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>

input::placeholder {
  color: grey;
}

label {
  margin-bottom: 0;
  // width: 100%;
  cursor: pointer;
  input[type="checkbox"] {
    margin-right: 5px;
  }
}

.list-group-item {
  .delete {
    display: none;
  }

  &:hover .delete {
    display: inline;
    color: grey;
    &:hover {
      text-decoration: none;
      color: red;
    }
  }
}
</style>
