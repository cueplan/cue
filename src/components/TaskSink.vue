<template>
  <draggable
    element="ul"
    class="list-group sink"
    v-model="ticklerSinks"
    :options="{draggable:'.draggable', handle:'.handle', group: { name: 'tasks', pull: 'clone', revertClone: true } }"
    @add="onDragAdd"
  ></draggable>
</template>

<script>
import draggable from '../plugins/Draggable.js'
import { mapActions } from 'vuex'

export default {
  name: 'tasksink',
  components: {
    draggable
  },
  props: ['listId'],
  data () {
    return {
      ticklerSinks: []
    }
  },
  methods: {
    ...mapActions([
      'addTodosToList'
    ]),

    onDragAdd (evt) {
      this.addTodosToList({ todos: this.ticklerSinks, id: this.listId })
      this.ticklerSinks = []
    }
  }
}
</script>
