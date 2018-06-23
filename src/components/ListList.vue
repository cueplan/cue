<template>
  <draggable element="b-list-group" class="listlist" v-model="listOrder" :options="{draggable:'.draggable'}" @end="onDragEnd" flush :component-data="{flush: ''}">
    <b-list-group-item v-for="list in listOrder"
      class="draggable"
      :key="list.id">
      <a @click.prevent="switchToList(list.id)" href="#">{{ list.name }}</a>
    </b-list-group-item>
    <b-list-group-item slot="footer" class="new-list-item">
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
        return this.lists.lists || []
      },
      set: function (value) {
        // No setter, the onDragEnd will let the parent Vue update accordingly
      }
    }
  },
  methods: {
    switchToList (listId) {
      this.$emit('switchList', listId)
    },

    newList () {
      this.$emit('newList', this.lists.collection)
    },

    onDragEnd (evt) {
      this.$emit('reorderList', { collection: this.lists.collection, oldIndex: evt.oldIndex, newIndex: evt.newIndex })
    }
  }
}
</script>

<style scoped>
.new-list-item {
  text-align: center;
}
</style>
