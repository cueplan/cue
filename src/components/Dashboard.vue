<template>
  <div class="hello">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-2">
          <listlist :lists="lists" v-on:switchList="switchToList" v-on:newList="newList" v-on:reorderList="reorderList"></listlist>
        </div>
        <div class="col-md-8">
          <h1 class="page-header">
            <span class="title-label" v-if="!editingListName" @click.prevent="editListName" >{{ newListName }}</span>
            <img :src="user.avatarUrl() ? user.avatarUrl() : '/avatar-placeholder.png'" class="avatar">
            <small><span class="sign-out">(<a href="#" @click.prevent="signOut">Sign Out</a>)</span></small>
            <textarea id="listNameInput" v-model="newListName" v-if="editingListName" spellcheck=false class="title-input" @keyup.enter.prevent="editListNameKeyUp" @blur.prevent="editListNameBlur"></textarea>
          </h1>

          <form @submit.prevent="addTodo" :disabled="! todo">
            <div class="input-group">
              <input v-model="todo" type="text" class="form-control" placeholder="Write a todo..." autofocus>
              <span class="input-group-btn">
                <button class="btn btn-default" type="submit" :disabled="! todo">Add</button>
              </span>
            </div>
          </form>

          <ul class="list-group">
            <li v-for="(todo, todoId) in currentList.todos"
              class="list-group-item"
              :class="{completed: todo.completed}"
              :key="todoId">
              <label>
                <input type="checkbox" class="item-checkbox" v-model="todo.completed">{{ todo.text }}
              </label>
              <a @click.prevent="deleteTodo(todoId)"
                class="delete pull-right"
                href="#">X</a>
            </li>
          </ul>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ListList from './ListList.vue'

var STORAGE_FILE = 'todolists.json'

export default {
  name: 'dashboard',
  components: { listlist: ListList },
  props: ['user'],
  data () {
    return {
      blockstack: window.blockstack,
      automerge: window.automerge,
      lists: window.automerge.init(),
      list: 0,
      newListName: 'Todos',
      todo: '',
      editingListName: false
    }
  },
  computed: {
    currentList: function () {
      var lists = this.lists.lists
      if (typeof lists === 'undefined' || lists.length <= this.list) {
        return { name: 'None', todos: [] }
      }
      console.log(this.lists)
      console.log(lists)
      return lists[this.list]
    },
    uidCount: function () {
      return this.currentList.todos.length
    }
  },
  mounted () {
    this.fetchData()
  },
  methods: {
    deleteTodo (todoId) {
      this.lists = this.automerge.change(this.lists, 'Delete a todo', l => {
        l.lists[this.list].todos.splice(todoId, 1)
      })
      this.pushData()
    },

    pushData () {
      const blockstack = this.blockstack
      const encrypt = true
      return blockstack.putFile(STORAGE_FILE, this.automerge.save(this.lists), encrypt)
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

    editListName () {
      this.editingListName = true
      document.getElementById('listNameInput').focus()
      document.getElementById('listNameInput').select()
    },

    editListNameKeyUp (e) {
      this.editListNameBlur(e)
    },

    editListNameBlur (e) {
      this.changeListName()
      this.editingListName = false
    },

    switchToList (list) {
      this.list = list
      this.newListName = this.currentList.name
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

    newList () {
      var listName = 'A New List'
      this.lists = this.automerge.change(this.lists, 'Adding a new list', l => {
        l.lists.push({ name: listName, todos: [] })
      })
      this.list = this.lists.lists.length - 1
      this.newListName = this.currentList.name
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
        console.log('todosText: ' + todosText)
        var lists = this.automerge.load(todosText) || this.automerge.init()
        console.log(lists)
        console.log(typeof lists.lists)
        if (typeof lists.lists === 'undefined') {
          console.log('initializing lists')
          lists = this.automerge.change(lists, 'Initialize lists of lists', l => {
            l.lists = []
          })
          lists = this.automerge.change(lists, 'Create default list', l => {
            l.lists = [ { name: 'Todos', todos: [] } ]
          })
          lists = this.automerge.change(lists, 'Set lastList', l => {
            l.lastList = 'Todos'
          })
          console.log(lists)

          this.list = 0
          this.lists = lists
          this.pushData()
        }

        this.list = 0
        this.lists = lists
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
  &.completed label {
    text-decoration: line-through;
  }

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
