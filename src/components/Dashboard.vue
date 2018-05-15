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

var OLD_STORAGE_FILE = 'todolists.json'
var listsFile = 'lists.json'
var dataVersionFile = 'version.json'

export default {
  name: 'dashboard',
  components: {
    listlist: ListList,
    draggable,
    singletodo: SingleTodo },
  props: ['user'],
  data () {
    return {
      lists: {},
      loadedList: {},
      listIndex: 0,
      dataVersion: 0,
      newListName: '',
      saved: true,
      saving: '',
      focusedId: null,
      pendingFocusId: null,
      throttledPushData: window.lodash.debounce(this.pushDataNow, 3000, { maxWait: 60000 })
    }
  },
  computed: {
    currentList: function () {
      return this.lists.lists[this.listIndex]
    },
    todoOrder: {
      get: function () {
        return this.loadedList.todos || []
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
    fetchData () {
      const blockstack = window.blockstack

      blockstack.getFile(dataVersionFile, {decrypt: false})
      .then((contents) => {
        if (contents) {
        //   this.dataVersion = JSON.parse(contents || 0)
        //   console.log(this.dataVersion)
        //   if (this.dataVersion < 2) {
        //     this.upgradeData()
        //   }
        } else {
          return this.initializeData()
        }
      })
      .then(() => {
        this.fetchVersion2Data()
      })
    },

    initializeData () {
      const today = new Date()
      const listId = Date.now()
      this.lists = { lists: [ { name: today.toLocaleDateString(), id: listId } ] }
      this.loadedList = window.automerge.init()
      this.loadedList = window.automerge.change(this.loadedList, 'New empty list', ll => {
        ll.name = today.toLocaleDateString()
        ll.id = listId
        ll.todos = [ { id: 0, text: '', state: 'incomplete' } ]
      })
      this.listIndex = 0

      return this.pushDataNow()
    },

    upgradeData () {
      if (this.dataVersion === 0) {
        this.dataVersion = 1
        window.blockstack.putFile(dataVersionFile, JSON.stringify(this.dataVersion), {encrypt: false})
        .then(() => {
          window.location.reload(true)
        })
      } else if (this.dataVersion === 1) {
        // this.fetchVersion1Data()
        // var listmeta = {
        //   lastList: this.lists.lastList,
        //   lists = this.lists.lists.map(l => { name: l.name })
        // }
        // window.blockstack.putFile(listsFile, JSON.stringify(listmeta), {encrypt: true})
        // .then(() => {
        //   this.dataVersion = 2
        //   window.blockstack.putFile(dataVersionFile, JSON.stringify(this.dataVersion), {encrypt: false})
        //   .then(() => {
        //     window.location.reload(true)
        //   })
        // })
      }
    },

    pushData () {
      this.saved = false
      this.saving = 'Saving...'
      this.throttledPushData()
    },

    pushDataNow () {
      const blockstack = window.blockstack
      const encrypt = true
      // blockstack.putFile(OLD_STORAGE_FILE, window.automerge.save(this.lists), encrypt)
      console.log('pushing data: ' + JSON.stringify(this.lists))
      return blockstack.putFile(listsFile, JSON.stringify(this.lists), encrypt)
      .then(() => {
        this.saved = true
        this.saving = 'Saved'
        console.log('pushing list')
        return blockstack.putFile('/lists/' + this.currentList.id + '.json', window.automerge.save(this.loadedList), encrypt)
      })
    },

    fetchVersion1Data () {
      const blockstack = window.blockstack
      const decrypt = true
      blockstack.getFile(OLD_STORAGE_FILE, decrypt)
      .then((todosText) => {
        var lists = window.automerge.load(todosText) || window.automerge.init()
        if (typeof lists.lists === 'undefined') {
          lists = window.automerge.change(lists, 'Initialize lists of lists', l => {
            l.lists = []
          })
          lists = window.automerge.change(lists, 'Create default list', l => {
            l.lists = [ { name: 'Todos', todos: [] } ]
          })
          lists = window.automerge.change(lists, 'Set lastList', l => {
            l.lastList = 'Todos'
          })

          this.listIndex = 0
          this.lists = lists
          this.newListName = this.currentList.name
          this.pushData()
        }

        this.listIndex = 0
        this.lists = lists
        this.newListName = this.currentList.name
      })
    },

    fetchVersion2Data () {
      const blockstack = window.blockstack
      const decrypt = true
      blockstack.getFile(listsFile, decrypt)
      .then((listsText) => {
        console.log(listsText)
        var lists = JSON.parse(listsText || {})
        this.listIndex = 0
        this.lists = lists
        this.newListName = this.lists.lists[this.listIndex].name
        return blockstack.getFile('/lists/' + this.lists.lists[this.listIndex].id + '.json', decrypt)
      })
      .then((contents) => {
        this.loadedList = window.automerge.load(contents)
      })
    },

    deleteTodo (todoId) {
      this.loadedList = window.automerge.change(this.loadedList, 'Delete a todo', ll => {
        ll.todos.splice(todoId, 1)
        if (ll.todos.length === 0) {
          ll.todos.splice(0, 0, { id: 0, text: '', state: 'incomplete' })
        }
      })
      this.pushData()
    },

    completeTodo (todoId, value) {
      this.loadedList = window.automerge.change(this.loadedList, 'Complete a todo', ll => {
        ll.todos[todoId].completed = value
      })
      this.pushData()
    },

    changeTodoText (todoId, value) {
      this.loadedList = window.automerge.change(this.loadedList, 'Change todo text', ll => {
        ll.todos[todoId].text = value
      })
      this.pushData()
    },

    insertTodoAfter (todoId, value) {
      this.loadedList = window.automerge.change(this.loadedList, 'Insert todo', ll => {
        ll.todos.splice(todoId + 1, 0, { id: ll.todos.length + 1, text: value || '', state: 'incomplete' })
      })

      this.pendingFocusId = todoId + 1
      this.focusedId = todoId + 1

      this.pushData()
    },

    todoBlurred (todoId) {
      this.focusedId = this.pendingFocusId
      this.pendingFocusId = null
    },

    todoFocused (todoId) {
      this.focusedId = todoId
    },

    focusPrevTodo (todoId) {
      this.pendingFocusId = this.focusedId = Math.max(todoId - 1, 0)
    },

    focusNextTodo (todoId) {
      this.pendingFocusId = this.focusedId = Math.min(todoId + 1, this.loadedList.todos.length - 1)
    },

    onDragEnd (evt) {
      this.loadedList = window.automerge.change(this.loadedList, 'Moving a todo', ll => {
        ll.todos.splice(evt.newIndex, 0, ll.todos.splice(evt.oldIndex, 1)[0])
      })

      this.pushData()
    },

    beforeUnload (e) {
      if (!this.saved) {
        e.returnValue = "Latest changes haven't been saved. Are you sure?"
      }
    },

    editListNameKeyUp (e) {
      this.editListNameBlur(e)
      document.getElementById('listNameInput').blur()
    },

    editListNameBlur (e) {
      this.changeListName()
    },

    switchToList (listIndex) {
      this.listIndex = listIndex
      this.newListName = this.currentList.name
      const decrypt = true

      this.loadedList = window.automerge.init()
      window.blockstack.getFile('/lists/' + this.lists.lists[listIndex].id + '.json', decrypt)
      .then((contents) => {
        this.loadedList = window.automerge.load(contents) || window.automerge.init()
      })

      this.focusedId = null
    },

    reorderList (oldIndex, newIndex) {
      this.lists.lists.splice(newIndex, 0, this.lists.lists.splice(oldIndex, 1)[0])
      if (this.listIndex > oldIndex && this.listIndex <= newIndex) {
        this.listIndex--
      } else if (this.listIndex >= newIndex && this.listIndex < oldIndex) {
        this.listIndex++
      } else if (this.listIndex === oldIndex) {
        this.listIndex = newIndex
      }

      this.pushData()
    },

    deleteList () {
      this.lists.lists.splice(this.listIndex, 1)

      if (this.listIndex >= this.lists.lists.length) {
        this.listIndex--
      }

      this.switchToList(this.listIndex)

      this.pushData()
    },

    newList () {
      const today = new Date()
      const listId = Date.now()
      var listName = 'A New List'
      this.lists.lists.push({ name: listName, id: listId })
      this.loadedList = window.automerge.init()
      this.loadedList = window.automerge.change(this.loadedList, 'New empty list', ll => {
        ll.name = today.toLocaleDateString()
        ll.id = listId
        ll.todos = [ { id: 0, text: '', state: 'incomplete' } ]
      })

      this.listIndex = this.lists.lists.length - 1
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

      this.lists.lists[this.listIndex].name = this.newListName
      this.loadedList = window.automerge.change(this.loadedList, 'Changing list name', ll => {
        ll.name = this.newListName
      })

      this.pushData()
    },

    signOut () {
      window.blockstack.signUserOut(window.location.href)
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
