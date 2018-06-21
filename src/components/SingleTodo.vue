<template>
   <div class="todo-row draggable">
        <b-dropdown text="≡" no-caret class="handle-dropdown" toggleClass="handle" offset="-20">
          <b-dropdown-item class="dropdown-item" @click.prevent="deleteTodo(todoId)">Delete</b-dropdown-item>
        </b-dropdown>
        <label class="todo-label"
          :class="{completed: todo.completed}">
          <input type="checkbox" class="item-checkbox" v-model="completed"/>
          <span class="checkmark" :id="'todo-'+todoId"></span>
          <input
            type="text"
            v-model="todoText"
            spellcheck=false
            class="todo-input"
            v-focus="focus"
            @blur="$emit('todoBlurred', todoId)"
            @focus="$emit('todoFocused', todoId)"
            @keyup.enter.prevent="insertAfter(todoId, $event)"
            @keydown.up.prevent="$emit('focusPrev', todoId)"
            @keydown.down.prevent="$emit('focusNext', todoId)"/>
        </label>
    </div>
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
        return this.todo.status === 'completed'
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

.todo-label {
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

.todo-row {
  display: inline-flex;
}

.todo-row .popover-fun {
  color: initial;
}

/* Customize the label (the container) */
.todo-label {
  display: inline-flex;
  position: relative;
  padding: 0px 0px 1px 29px;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-width: 0px;
  flex-grow: 1;
}

/* Hide the browser's default checkbox */
.todo-label input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  left: 0px;
  top: 0px;
}

/* Create a custom checkbox */
.checkmark {
  position: absolute;
  top: 1px;
  left: 4px;
  height: 21px;
  width: 21px;
  background-color: #fff;
  border-radius: 3px;
  border-style: solid;
  border-width: 1px;
  border-color: white;
  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

.todo-label:hover input[type="checkbox"] ~ .checkmark {
  border-color: $primary;
}

.todo-label input[type="checkbox"]:checked ~ .checkmark {
  background-color: #fff;
}

/* Create the checkmark/indicator (hidden when not checked) */
.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

/* Show the checkmark when checked */
.todo-label input[type="checkbox"]:checked ~ .checkmark:after {
  display: block;
}

/* Style the checkmark/indicator */
.todo-label .checkmark:after {
  left: 7px;
  top: 3px;
  width: 6px;
  height: 10px;
  border: solid $primary;
  border-width: 0 3px 3px 0;
  -webkit-transform: rotate(45deg);
  -ms-transform: rotate(45deg);
  transform: rotate(45deg);
}
</style>
