<template>
  <draggable  element="ul" class="list-group" v-model="listOrder" :options="{draggable:'.draggable'}" @end="onDragEnd">
    <li v-for="(list, index) in listOrder"
      class="list-group-item draggable"
      :key="index">
      <a @click.prevent="switchToList(index)" href="#">{{ list }}</a>
    </li>
    <li slot="footer" class="list-group-item">
      <label>
        <a @click.prevent="newList" href="#">+ New List</a>
      </label>
    </li>
  </draggable>
</template>

<script>
import draggable from 'vuedraggable'

export default {
  name: 'listlist',
  props: ['lists'],
  components: {
    draggable
  },
  computed: {
    listOrder: {
      get: function () {
        return this.lists || []
      },
      set: function (value) {
        // No setter, the onDragEnd will let the parent Vue update accordingly
      }
    }
  },
  methods: {
    switchToList (list) {
      this.$emit('switchList', list)
    },

    newList () {
      this.$emit('newList')
    },

    onDragEnd (evt) {
      this.$emit('reorderList', evt.oldIndex, evt.newIndex)
    }
  }
}
</script>
