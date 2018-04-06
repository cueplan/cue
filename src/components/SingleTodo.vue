<template>
   <li
        class="list-group-item draggable"
        :class="{completed: todo.completed}">
        <label>
        <input type="checkbox" class="item-checkbox" v-model="completed"/>
        <input v-model="todoText" spellcheck=false class="todo-input" @keyup.enter.prevent="insertAfter(todoId, $event)"/>
        </label>
        <a @click.prevent="deleteTodo(todoId)"
        class="delete pull-right"
        href="#">X</a>
    </li>
</template>

<script>
export default {
  name: 'singletodo',
  props: ['todo', 'todoId'],
  computed: {
    todoText: {
      get: function () {
        return this.todo.text
      },
      set: function (value) {
        this.$emit('changeTodoText', this.todoId, value)
      }
    },
    completed: {
      get: function () {
        return this.todo.completed
      },
      set: function (value) {
        this.$emit('completeTodo', this.todoId, value)
      }
    }
  },
  methods: {
    deleteTodo (todoId) {
      this.$emit('deleteTodo', todoId)
    },

    insertAfter (todoId, e) {
      this.$emit('insertAfter', todoId)
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
