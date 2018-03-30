<template>
   <li
        class="list-group-item draggable"
        :class="{completed: todo.completed}">
        <label>
        <input type="checkbox" class="item-checkbox" v-model="todo.completed">{{ todoText }}
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
        return this.todo.text || []
      },
      set: function (value) {
        // No setter, the onDragEnd will let the parent Vue update accordingly
      }
    }
  },
  methods: {
    deleteTodo (todoId) {
      this.$emit('deleteTodo', todoId)
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