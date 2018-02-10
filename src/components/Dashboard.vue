<template>
  <div class="hello">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-2">
          <ul class="list-group">
            <li v-for="list in Object.keys(todos)"
              class="list-group-item"
              :key="list">
              <label>
                <a @click.prevent="switchToList(list)" href="#">{{ list }}</a>
              </label>
            </li>
            <li class="list-group-item">
              <label>
                <a @click.prevent="newList" href="#">+ New List</a>
              </label>
            </li>
          </ul>
        </div>
        <div class="col-md-8">
          <h1 class="page-header">
            <span class="title-label" v-show="!editingListName" @click.prevent="editingListName=true" >{{ newListName }}</span>
            <img :src="user.avatarUrl() ? user.avatarUrl() : '/avatar-placeholder.png'" class="avatar">
            <small><span class="sign-out">(<a href="#" @click.prevent="signOut">Sign Out</a>)</span></small>
            <textarea v-model="newListName" v-show="editingListName" class="title-input" @keyup.prevent="editListNameKeyUp"></textarea>
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
            <li v-for="todo in todos[list]"
              class="list-group-item"
              :class="{completed: todo.completed}"
              :key="todo.id">
              <label>
                <input type="checkbox" class="item-checkbox" v-model="todo.completed">{{ todo.text }}
              </label>
              <a @click.prevent="todos[list].splice(todos.indexOf(todo), 1)"
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
var STORAGE_FILE = 'todolists.json'

export default {
  name: 'dashboard',
  props: ['user'],
  data () {
    return {
      blockstack: window.blockstack,
      todos: {},
      list: 'Todos',
      newListName: 'Todos',
      todo: '',
      uidCount: 0,
      editingListName: false
    }
  },
  mounted () {
    this.fetchData()
  },
  methods: {
    pushData (todos) {
      const blockstack = this.blockstack
      const encrypt = true
      return blockstack.putFile(STORAGE_FILE, JSON.stringify(todos), encrypt)
    },

    addTodo () {
      if (!this.todo.trim()) {
        return
      }
      this.todos[this.list].unshift({
        id: this.uidCount++,
        text: this.todo.trim(),
        completed: false
      })
      this.todo = ''
      this.pushData(this.todos)
    },

    editListNameKeyUp (e) {
      var code = e.keyCode ? e.keyCode : e.which
      if (code === 13) {  // Enter keycode
        this.changeListName()
        this.editingListName = false
      }
    },

    switchToList (list) {
      this.list = list
      this.newListName = list
    },

    newList () {
      var listName = 'A New List'
      this.todos[listName] = []
      this.list = this.newListName = listName
      this.pushdata(this.todos)
    },

    changeListName () {
      var newName = this.newListName.trim()
      if (!newName || this.todos[newName]) {
        this.newListName = this.list
        return
      }
      this.todos[this.newListName] = this.todos[this.list]
      delete this.todos[this.list]
      this.list = this.newListName
      this.pushData(this.todos)
    },

    fetchData () {
      const blockstack = this.blockstack
      const decrypt = true
      blockstack.getFile(STORAGE_FILE, decrypt)
      .then((todosText) => {
        var todos = JSON.parse(todosText || '{}')
        todos[this.list] = todos[this.list] || []
        todos[this.list].forEach(function (todo, index) {
          todo.id = index
        })
        this.uidCount = todos[this.list].length
        this.todos = todos
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
