<template>
  <div class="todo-row draggable" :class="{ unpinned: !todo.pinned }">
    <div class="todo-firstline">
      <div class="todo-label"
        :class="{completed: todo.completed}">
        <label>
        <input type="checkbox" class="item-checkbox" v-model="completed"/>
        <span class="checkmark" v-bind:class="{ border: todoText }" :id="'todo-'+todoId"></span>
        </label>
        <input
          type="text"
          v-model="todoText"
          spellcheck=false
          class="todo-input"
          v-focus="focus"
          @blur="$emit('todoBlurred', todoId)"
          @focus="todoFocused"
          @keyup.enter.prevent="insertAfter(todoId, $event)"
          @keydown.delete="possibleDelete($event, todoId)"
          @keydown.up.prevent="$emit('focusPrev', todoId)"
          @keydown.down.prevent="$emit('focusNext', todoId)"/>
      </div>
      <i class="fas fa-bars handle" v-b-toggle="'todo-collapse-' + todoId"></i>
    </div>
    <b-collapse :id="'todo-collapse-' + todoId" class="todo-secondline">
      <i class="fas fa-trash pushpin" @click.prevent="deleteTodo(todoId)"></i>
      <i class="fas fa-thumbtack pushpin" @click.prevent="$emit('pinTodo', {todoId, value: !todo.pinned })"></i>
    </b-collapse>
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
        this.$emit('changeTodoText', { todoId: this.todoId, value })
      }
    },
    completed: {
      get: function () {
        return this.todo.status === 'completed'
      },
      set: function (value) {
        this.$emit('completeTodo', { todoId: this.todoId, value })
      }
    }
  },
  methods: {
    deleteTodo (todoId) {
      this.$emit('deleteTodo', todoId)
    },

    insertAfter (todoId, e) {
      this.$emit('insertAfter', todoId)
    },

    possibleDelete (event, todoId) {
      if (this.todo.text === '') {
        event.preventDefault()
        var direction = event.keyCode === 46 ? 'next' : 'back'
        this.$emit('deleteTodo', todoId, direction)
        if (direction === 'next') {
          this.$nextTick(() => {
            event.target.setSelectionRange(0, 0)
          })
        }
      }
    },

    todoFocused (event) {
      this.$emit('todoFocused', this.todoId)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
@import "../assets/sass/variables";

.todo-secondline {
  text-align: right;
}

.fas {
  font-size: 1.5rem;
}

.pushpin {
  margin: 4px 5px;
  color: rgba($primary, 0.8);
  cursor: pointer;
}

.unpinned .pushpin {
  color: rgba($primary, 0.10)
}

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

/* Customize the label (the container) */
.todo-label {
  display: inline-flex;
  position: relative;
  padding: 0px 0px 1px 43px;
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
  height: 35px;
  width: 35px;
  background-color: #fff;
  border-radius: 3px;
  border-style: solid;
  border-width: 1px;
  border-color: white;
  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

.checkmark.border {
  border-color: rgba($primary, .25);
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
  left: 12px;
  top: 5px;
  width: 12px;
  height: 20px;
  border: solid $primary;
  border-width: 0 6px 6px 0;
  -webkit-transform: rotate(45deg);
  -ms-transform: rotate(45deg);
  transform: rotate(45deg);
}
</style>
