<template>
  <b-container fluid>
    <b-row>
      <b-col sm="auto">
        <div class="sidebar">
          <div class="logo">
            <img src="../assets/images/logo.png" height="48" width="144"/>
            <b-dropdown boundary="viewport" no-caret right class="user-dropdown" toggleClass="user-toggle">
              <template slot="button-content">
                <img :src="user.avatarUrl() ? user.avatarUrl() : '/avatar-placeholder.png'" class="avatar"/>
              </template>
              <b-dropdown-item @click.prevent="signOut">Sign Out</b-dropdown-item>
              <b-dropdown-item @click.prevent="backupData">Backup Data</b-dropdown-item>
              <b-dropdown-item @click.prevent="$refs.restoreinput.click()">Restore From Backup ...</b-dropdown-item>
              <input type="file" ref="restoreinput" id="restoreinput" accept=".json" v-on:change="restoreBackup"/>
            </b-dropdown>
          </div>
          <div class="listlist">
            <b-card no-body>
            <b-tabs card v-model="listsIndex">
              <b-tab title="Current">
                <listlist
                  :lists="activelists"
                  :collection="'active'"
                  v-on:switchList="switchToList"
                  v-on:newList="newList"
                  v-on:reorderList="reorderList"
                />
              </b-tab>
              <b-tab title="Archive">
                <listlist
                  :lists="archivelists"
                  :collection="'archive'"
                  v-on:switchList="switchToList"
                  v-on:newList="newList"
                  v-on:reorderList="reorderList"
                />
              </b-tab>
            </b-tabs>
            </b-card>
          </div>
        </div>
      </b-col>
      <b-col sm>
        <b-card v-if="currentList" class="page-header" no-body>
          <div slot="header">
            <input id="listNameInput" v-model="newListName" spellcheck=false class="title-input" @keyup.enter.prevent="editListNameKeyUp" @blur.prevent="editListNameBlur"/>
            <b-dropdown boundary="viewport" text="" right no-caret class="list-dropdown" toggleClass="list-toggle">
              <b-dropdown-item class="dropdown-item" @click="archiveList">Archive List</b-dropdown-item>
            </b-dropdown>
            <small><span class="saving-status">{{ saving }}</span></small>
          </div>

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
        </b-card>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import ListList from './ListList.vue'
import SingleTodo from './SingleTodo.vue'
import draggable from 'vuedraggable'
import CueData from '../cuedata.js'

export default {
  name: 'dashboard',
  components: {
    listlist: ListList,
    draggable,
    singletodo: SingleTodo },
  props: ['user'],
  data () {
    return {
      cuedata: new CueData(window.blockstack, window.automerge, window.lodash),
      collection: 'active',
      listIndex: 0,
      newListName: '',
      saved: true,
      saving: '',
      focusedId: null,
      pendingFocusId: null
    }
  },
  computed: {
    currentList: function () {
      if (typeof this.currentCollection === 'undefined') {
        return
      }
      return this.cuedata.lists.lists[this.currentCollection[this.listIndex]]
    },
    currentCollection: function () {
      if (typeof this.cuedata.lists.collections === 'undefined') {
        return
      }
      return this.cuedata.lists.collections[this.collection]
    },
    todoOrder: {
      get: function () {
        return this.cuedata.loadedList.todos || []
      },
      set: function (value) {
      }
    },
    listsIndex: {
      get: function () {
        return this.collection === 'active' ? 0
          : this.collection === 'archive' ? 1
          : 2
      },
      set: function (value) {
        if (value === 0) {
          this.switchToCollection('active')
        } else if (value === 1) {
          this.switchToCollection('archive')
        }
      }
    },
    activelists: {
      get: function () {
        if (typeof this.cuedata.lists.lists === 'undefined' || typeof this.cuedata.lists.collections === 'undefined') {
          return []
        }
        return this.cuedata.lists.collections['active'].map(l => this.cuedata.lists.lists[l].name)
      }
    },
    archivelists: {
      get: function () {
        if (typeof this.cuedata.lists.lists === 'undefined' || typeof this.cuedata.lists.collections === 'undefined') {
          return []
        }
        return this.cuedata.lists.collections['archive'].map(l => this.cuedata.lists.lists[l].name)
      }
    }
  },
  created () {
    window.addEventListener('beforeunload', this.beforeUnload)
  },
  mounted () {
    this.cuedata.fetchData()
  },
  methods: {
    // TODO: should not be something that hits cuedata, unless a list needs to be loaded into memory
    switchToCollection (collection) {
      if (this.collection === collection) {
        return
      }

      (this.cuedata.throttledPushData.flush() || Promise.resolve())
      .then(() => {
        this.collection = collection
        this.switchToList(this.currentCollection.length > 0 ? 0 : -1, true)
      })
    },

    // TODO: should not be something that hits cuedata, unless a list needs to be loaded into memory
    switchToList (listIndex, force) {
      if (this.listIndex === listIndex && !force) {
        return
      }

      this.listIndex = listIndex
      this.cuedata.switchLoadedList(listIndex, this.collection)
      .then(() => {
        this.newListName = this.cuedata.loadedList.name
      })
      this.focusedId = null
    },

    // List operations
    reorderList (oldIndex, newIndex) {
      this.cuedata.reorderList(oldIndex, newIndex, this.collection)
      if (this.listIndex > oldIndex && this.listIndex <= newIndex) {
        this.listIndex--
      } else if (this.listIndex >= newIndex && this.listIndex < oldIndex) {
        this.listIndex++
      } else if (this.listIndex === oldIndex) {
        this.listIndex = newIndex
      }
    },

    archiveList () {
      this.cuedata.archiveList(this.listIndex, this.collection)

      if (this.listIndex >= this.currentCollection.length) {
        this.listIndex--
      }

      this.switchToList(this.listIndex, true)
    },

    newList () {
      const today = new Date()
      var listName = today.toLocaleDateString()

      this.cuedata.newList(listName, this.collection)

      this.newListName = this.currentList.name
      this.focusedId = null
    },

    changeListName () {
      var newName = this.newListName.trim()
      if (!newName || this.cuedata.lists.lists.find(l => l.name === newName)) {
        this.newListName = this.currentList.name
        return
      }

      this.cuedata.changeListName(this.listIndex, this.collection, newName)
      this.newListName = this.cuedata.loadedList.name
    },

    // Todo operations
    deleteTodo (todoId) {
      this.cuedata.deleteTodo(todoId)
    },

    completeTodo (todoId, value) {
      this.cuedata.completeTodo(todoId, value)
    },

    changeTodoText (todoId, value) {
      this.cuedata.changeTodoText(todoId, value)
    },

    insertTodoAfter (todoId, value) {
      this.cuedata.insertTodoAfter(todoId, value)

      this.pendingFocusId = todoId + 1
      this.focusedId = todoId + 1
    },

    reorderTodos (oldIndex, newIndex) {
      this.cuedata.reorderTodos(oldIndex, newIndex)
    },

    onDragEnd (evt) {
      this.reorderTodos(evt.oldIndex, evt.newIndex)
    },

    // UI
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

    // account operations
    signOut () {
      window.blockstack.signUserOut(window.location.href)
    },

    backupData () {
      this.cuedata.backupData()
      .then((backup) => {
        this.download('backup.json', JSON.stringify(backup))
      })
    },

    download (filename, text) {
      var element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
      element.setAttribute('download', filename)

      element.style.display = 'none'
      document.body.appendChild(element)

      element.click()

      document.body.removeChild(element)
    },

    restoreBackup (e) {
      this.cuedata.restoreBackup(e.target.files[0])
      .then(() => {
        window.location.reload()
      })
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
  cursor: pointer;
  input[type="checkbox"] {
    margin-right: 5px;
  }
}
</style>
