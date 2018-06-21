<template>
  <b-card v-if="primaryList" class="page-header" no-body>
    <div slot="header">
      <input id="listNameInput" ref="listNameInput" v-bind:value="primaryList.name" spellcheck=false class="title-input" @keyup.enter.prevent="editListNameKeyUp" @blur.prevent="editListNameBlur"/>
      <b-dropdown boundary="viewport" text="" right no-caret class="list-dropdown" toggleClass="list-toggle">
        <b-dropdown-item class="dropdown-item" @click="$emit('archiveList')">Archive List</b-dropdown-item>
      </b-dropdown>
      <small><span class="saving-status">{{ $store.state.listsSaved }}</span></small>
    </div>

    <draggable  element="ul" class="list-group" v-model="todoOrder" :options="{draggable:'.draggable', handle:'.handle'}" @end="onDragEnd">
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
</template>

<script>
import SingleTodo from './SingleTodo.vue'
import draggable from 'vuedraggable'
import { mapState } from 'vuex'

export default {
  name: 'cuelist',
  components: {
    draggable,
    singletodo: SingleTodo },
  data () {
    return {
      focusedId: null,
      pendingFocusId: null
    }
  },
  computed: {
    todoOrder: {
      get: function () {
        return this.primaryList.todos || []
      },
      set: function (value) {
      }
    },
    ...mapState([
      'primaryList'
    ])
  },
  methods: {
    changeListName () {
      this.$store.dispatch('changeListName', this.$refs.listNameInput.value.trim())
    },

    deleteTodo (todoId) {
      this.$store.dispatch('deleteTodo', todoId)
    },

    completeTodo (todoId, value) {
      this.$store.dispatch('completeTodo', { todoId, value })
    },

    changeTodoText (todoId, value) {
      this.$store.dispatch('changeTodoText', { todoId, value })
    },

    insertTodoAfter (todoId, value) {
      this.$store.dispatch('insertTodoAfter', { todoId, value })

      this.pendingFocusId = todoId + 1
      this.focusedId = todoId + 1
    },

    reorderTodos (oldIndex, newIndex) {
      this.$store.dispatch('reorderTodos', {oldIndex, newIndex})
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
      this.pendingFocusId = this.focusedId = Math.min(todoId + 1, this.primaryList.todos.length - 1)
    },

    editListNameKeyUp (e) {
      this.editListNameBlur(e)
      this.$refs.listNameInput.blur()
    },

    editListNameBlur (e) {
      this.changeListName()
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
