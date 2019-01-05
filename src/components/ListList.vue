<template>
  <draggable element="b-list-group" class="listlist" v-model="listOrder" :options="{draggable:'.draggable', handle:'.handle'}" @end="onDragEnd" flush :component-data="{flush: ''}">
    <b-list-group-item v-for="list in listOrder"
      class="draggable"
      :key="list.id"
      :variant="list.id === primaryListId ? 'primary' : ''">
      <a @click.prevent="switchList({ namespace: 'primaryList', listId: list.id })" href="#">{{ list.name }}</a>
      <span class="handle">≡</span>
    </b-list-group-item>
    <b-list-group-item slot="footer" class="new-list-item">
      <a @click.prevent="newList(lists.collection)" href="#">+ New List</a>
    </b-list-group-item>
  </draggable>
</template>

<script>
import draggable from '../plugins/Draggable.js'
import { mapActions } from 'vuex'

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
    },
    primaryListId: function () {
      return this.$store.getters['primaryList/id']
    }
  },
  methods: {
    onDragEnd (evt) {
      this.reorderList({ collection: this.lists.collection, oldIndex: evt.oldIndex, newIndex: evt.newIndex })
    },
    ...mapActions([
      'switchList',
      'newList',
      'reorderList'
    ])
  }
}
</script>

<style scoped>
.new-list-item {
  text-align: center;
}
</style>
