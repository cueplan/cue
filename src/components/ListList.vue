<template>
  <draggable element="b-list-group" class="listlist" v-model="listOrder" :options="{draggable:'.draggable'}" @end="onDragEnd" flush :component-data="{flush: ''}">
    <b-list-group-item v-for="list in listOrder"
      class="draggable"
      :key="list.id"
      :variant="list.id === primaryListId ? 'primary' : ''">
      <a @click.prevent="switchPrimaryList(list.id)" href="#">{{ list.name }}</a>
    </b-list-group-item>
    <b-list-group-item slot="footer" class="new-list-item">
      <a @click.prevent="newList" href="#">+ New List</a>
    </b-list-group-item>
  </draggable>
</template>

<script>
import draggable from 'vuedraggable'
import { mapActions, mapGetters } from 'vuex'

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
    ...mapGetters([
      'primaryListId'
    ])
  },
  methods: {
    onDragEnd (evt) {
      this.reorderList({ collection: this.lists.collection, oldIndex: evt.oldIndex, newIndex: evt.newIndex })
    },
    ...mapActions([
      'switchPrimaryList',
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
