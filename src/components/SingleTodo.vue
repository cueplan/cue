<template>
   <label
        class="list-group-item draggable todo-row"
        :class="{completed: todo.completed}">
        <input type="checkbox" class="item-checkbox" v-model="completed"/>
        <span class="checkmark"></span>
        <input
          type="text"
          v-model="todoText"
          spellcheck=false
          class="todo-input"
          v-focus="focus"
          @blur="$emit('todoBlurred', todoId)"
          @focus="$emit('todoFocused', todoId)"
          @keyup.enter.prevent="insertAfter(todoId, $event)"/>
        <a @click.prevent="deleteTodo(todoId)"
        class="delete pull-right"
        href="#">X</a>
    </label>
</template>

<script>
import { focus } from 'vue-focus'

export default {
  name: 'singletodo',
  directives: { focus: focus },
  props: ['todo', 'todoId', 'focus'],
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
@import "../assets/sass/variables";

.todo-row {
  padding: 2px 2px;
}

.item-checkbox {
  margin: 0px;
}

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

/* Customize the label (the container) */
.todo-row {
  display: block;
  position: relative;
  padding-left: 35px;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-width: 0px;
}

/* Hide the browser's default checkbox */
.todo-row input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

/* Create a custom checkbox */
.checkmark {
  position: absolute;
  top: 2px;
  left: 3px;
  height: 25px;
  width: 25px;
  background-color: #fff;
  border-radius: 3px;
  border-style: solid;
  border-width: 1px;
  border-color: white;
}

.todo-row:hover input[type="checkbox"] ~ .checkmark {
  border-color: $brand-primary;
}

.todo-row input[type="checkbox"]:checked ~ .checkmark {
  background-color: #fff;
}

/* Create the checkmark/indicator (hidden when not checked) */
.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

/* Show the checkmark when checked */
.todo-row input[type="checkbox"]:checked ~ .checkmark:after {
  display: block;
}

/* Style the checkmark/indicator */
.todo-row .checkmark:after {
  left: 9px;
  top: 5px;
  width: 6px;
  height: 10px;
  border: solid $brand-primary;
  border-width: 0 3px 3px 0;
  -webkit-transform: rotate(45deg);
  -ms-transform: rotate(45deg);
  transform: rotate(45deg);
}
</style>
