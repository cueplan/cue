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
            :collection="collection"
            v-on:switchList="switchToList"
            v-on:newList="newList"
            v-on:reorderList="reorderList"
            v-on:switchCollection="switchToCollection"
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
      collection: 'active',
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
      return this.lists.lists[this.lists.collections.active[this.listIndex]]
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
        if (typeof this.lists.lists === 'undefined' || typeof this.lists.collections === 'undefined') {
          return []
        }
        return this.lists.collections.active.map(l => this.lists.lists[l].name)
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
          this.dataVersion = JSON.parse(contents || 0)
          console.log(this.dataVersion)
          if (this.dataVersion < 2) {
            return this.upgradeData()
          }
        } else {
          return this.initializeData()
        }
      })
      .then(() => {
        this.fetchVersion2Data()
      })
    },

    initializeData () {
      this.lists = { lists: [] }
      this.newList()
      return this.pushDataNow()
    },

    upgradeData () {
      if (this.dataVersion === 0) {
        this.dataVersion = 1
        return window.blockstack.putFile(dataVersionFile, JSON.stringify(this.dataVersion), {encrypt: false})
      } else if (this.dataVersion === 1) {
        this.lists = { lists: [] }
        return this.fetchVersion1Data()
          .then(this.upgradeOnev1List, this.initializeData)
          .then(() => {
            console.log('setting version to 2')
            this.dataVersion = 2
            return window.blockstack.putFile(dataVersionFile, JSON.stringify(this.dataVersion), {encrypt: false})
          })
      }
    },

    upgradeOnev1List (lists) {
      if (lists.lists.length === 0) {
        console.log('done upgrading')
        return Promise.resolve()
      }

      const listId = Date.now()
      this.lists.lists.push({ name: lists.lists[0].name, id: listId })
      this.listIndex = this.lists.lists.length - 1
      this.loadedList = window.automerge.init()
      this.loadedList = window.automerge.change(this.loadedList, 'Upgrade v1 list', ll => {
        ll.name = lists.lists[0].name
        ll.id = listId
        ll.todos = lists.lists[0].todos.map((t, i) => { return { id: i, text: t.text, status: t.completed ? 'completed' : 'incomplete' } })
      })

      this.pushDataNow()
      .then(() => {
        lists = window.automerge.change(lists, 'upgrading', l => l.lists.splice(0, 1))
        return this.upgradeOnev1List(lists)
      })
    },

    pushData () {
      this.saved = false
      this.saving = 'Saving...'
      this.throttledPushData()
    },

    pushDataNow () {
      const blockstack = window.blockstack
      const encrypt = true

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
      return blockstack.getFile(OLD_STORAGE_FILE, decrypt)
      .then((todosText) => {
        var lists = window.automerge.load(todosText) || window.automerge.init()
        if (typeof lists.lists === 'undefined') {
          return Promise.reject()
        }
        return Promise.resolve(lists)
      },
      () => {
        return Promise.reject()
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

        if (typeof this.lists.collections === 'undefined') {
          this.lists.collections = { active: this.lists.lists.map((l, i) => i), archive: [] }
        }

        this.newListName = this.lists.lists[this.lists.collections.active[this.listIndex]].name

        return blockstack.getFile('/lists/' + this.lists.lists[this.lists.collections.active[this.listIndex]].id + '.json', decrypt)
      })
      .then((contents) => {
        this.loadedList = window.automerge.load(contents)
      })
    },

    switchToCollection (collection) {
      this.collection = collection
    },

    switchToList (listIndex) {
      this.listIndex = listIndex
      this.newListName = this.currentList.name
      const decrypt = true

      this.loadedList = window.automerge.init()
      window.blockstack.getFile('/lists/' + this.lists.lists[this.lists.collections.active[listIndex]].id + '.json', decrypt)
      .then((contents) => {
        this.loadedList = window.automerge.load(contents) || window.automerge.init()
      })

      this.focusedId = null
    },

    reorderList (oldIndex, newIndex) {
      this.lists.collections.active.splice(newIndex, 0, this.lists.collections.active.splice(oldIndex, 1)[0])
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
      this.lists.collections.active.splice(this.listIndex, 1)

      if (this.listIndex >= this.lists.collections.active.length) {
        this.listIndex--
      }

      this.switchToList(this.listIndex)

      this.pushData()
    },

    newList () {
      const today = new Date()
      const listId = Date.now()
      var listName = today.toLocaleDateString()
      this.lists.lists.push({ name: listName, id: listId })
      this.lists.collections.active.push(this.lists.lists.length - 1)
      this.loadedList = window.automerge.init()
      this.loadedList = window.automerge.change(this.loadedList, 'New empty list', ll => {
        ll.name = today.toLocaleDateString()
        ll.id = listId
        ll.todos = [ { id: 0, text: '', state: 'incomplete' } ]
      })

      this.listIndex = this.lists.collections.active.length - 1
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

      this.lists.lists[this.lists.collections.active[this.listIndex]].name = this.newListName
      this.loadedList = window.automerge.change(this.loadedList, 'Changing list name', ll => {
        ll.name = this.newListName
      })

      this.pushData()
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
        ll.todos[todoId].status = value ? 'completed' : 'incomplete'
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
