<template>
  <b-card v-if="isLoaded" class="page-header" no-body>
    <div slot="header">
      <input id="listNameInput" ref="listNameInput" :readonly="!canChangeName" v-bind:value="name" spellcheck=false class="title-input" @keyup.enter.prevent="editListNameKeyUp" @blur.prevent="editListNameBlur"/>
      <b-dropdown boundary="viewport" text="≡" right no-caret class="list-dropdown" variant="primary" v-bind:toggleClass="'list-toggle dropdown-toggle' + (isSaved ? ' saved' : '')">
        <b-dropdown-item v-if="archivable" class="dropdown-item" @click.prevent="archive">Archive</b-dropdown-item>
        <b-dropdown-item v-if="currentable" class="dropdown-item" @click.prevent="makeCurrent">Unarchive</b-dropdown-item>
        <b-dropdown-item v-if="isDebug" class="dropdown-item" @click.prevent="decrementDate">Decrement Date</b-dropdown-item>
      </b-dropdown>
      <b-button v-if="namespace === 'secondaryList'" variant="primary" class="done-planning" @click.prevent="finishDayPlan">Finish Planning</b-button>
    </div>

    <draggable element="ul"
               class="list-group"
               v-model="todoOrder"
               :options="{draggable:'.draggable', handle:'.handle', group: { name: 'tasks', pull: 'clone', revertClone: true } }"
               @end="onDragEnd"
               @add="onDragAdd">
      <singletodo
        v-for="(todo, todoId) in todoOrder"
        :todo="todo"
        :todoId="todoId"
        :key="todoId"
        :focus="focusedId === todoId"
        v-on:deleteTodo="deleteTodo"
        v-on:completeTodo="completeTodo"
        v-on:changeTodoText="changeTodoText"
        v-on:insertAfter="insertTodoAfterAndFocus"
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
import { mapState, mapActions } from 'vuex'

export default {
  name: 'cuelist',
  props: ['namespace', 'archivable', 'currentable'],
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
    isDebug: function () {
      return process.env.NODE_ENV !== 'production'
    },
    todoOrder: {
      get: function () {
        return this.todos || []
      },
      set: function (value) {
      }
    },
    isLoaded: function () {
      return this.$store.state[this.namespace].isLoaded
    },
    isSaved: function () {
      return this.$store.state[this.namespace].isSaved
    },
    name: function () {
      return this.$store.getters[this.namespace + '/name']
    },
    todos: function () {
      return this.$store.getters[this.namespace + '/todos']
    },
    canChangeName: function () {
      return this.$store.getters[this.namespace + '/canChangeName']
    },
    ...mapState([
      'isDirty'
    ])
  },
  methods: {
    ...mapActions([
      'finishDayPlan'
    ]),

    archive () {
      this.$store.dispatch.bind(null, this.namespace + '/archive').apply(null, arguments)
    },

    makeCurrent () {
      this.$store.dispatch.bind(null, this.namespace + '/makeCurrent').apply(null, arguments)
    },

    decrementDate () {
      this.$store.dispatch.bind(null, this.namespace + '/decrementDate').apply(null, arguments)
    },

    changeName () {
      this.$store.dispatch.bind(null, this.namespace + '/changeName').apply(null, arguments)
    },

    deleteTodo (todoId, direction) {
      this.$store.dispatch.bind(null, this.namespace + '/deleteTodo').apply(null, arguments)
      if (direction === 'back') {
        this.pendingFocusId = Math.max(todoId - 1, 0)
        this.focusedId = Math.max(todoId - 1, 0)
      }
    },

    completeTodo () {
      this.$store.dispatch.bind(null, this.namespace + '/completeTodo').apply(null, arguments)
    },

    changeTodoText () {
      this.$store.dispatch.bind(null, this.namespace + '/changeTodoText').apply(null, arguments)
    },

    insertTodoAfter () {
      this.$store.dispatch.bind(null, this.namespace + '/insertTodoAfter').apply(null, arguments)
    },

    reorderTodos () {
      this.$store.dispatch.bind(null, this.namespace + '/reorderTodos').apply(null, arguments)
    },

    insertTodoAfterAndFocus (todoId, value) {
      this.insertTodoAfter({ todoId, value })

      this.pendingFocusId = todoId + 1
      this.focusedId = todoId + 1
    },

    onDragEnd (evt) {
      if (evt.from === evt.to) {
        this.reorderTodos({ oldIndex: evt.oldIndex, newIndex: evt.newIndex })
      }
    },

    onDragAdd (evt) {
      this.$store.dispatch('cloneTodo', { srcIndex: evt.oldIndex, dstIndex: evt.newIndex, dstList: this.namespace })
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
      this.pendingFocusId = this.focusedId = Math.min(todoId + 1, this.todos.length - 1)
    },

    editListNameKeyUp (e) {
      this.editListNameBlur(e)
      this.$refs.listNameInput.blur()
    },

    editListNameBlur (e) {
      this.changeName(this.$refs.listNameInput.value.trim())
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

.page-header .list-group {
  margin-top: 5px;
  margin-bottom: 5px;
}
</style>
