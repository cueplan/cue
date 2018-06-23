<template>
  <draggable element="b-list-group" class="listlist" v-model="listOrder" :options="{draggable:'.draggable'}" @end="onDragEnd" flush :component-data="{flush: ''}">
    <b-list-group-item v-for="(list, index) in listOrder"
      class="draggable"
      :key="index">
      <a @click.prevent="switchToList(index)" href="#">{{ list }}</a>
    </b-list-group-item>
    <b-list-group-item slot="footer">
      <a @click.prevent="newList" href="#">+ New List</a>
    </b-list-group-item>
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
      this.$emit('reorderList', { oldIndex: evt.oldIndex, newIndex: evt.newIndex })
    }
  }
}
</script>
