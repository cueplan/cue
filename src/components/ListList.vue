<template>
  <draggable  element="ul" class="list-group" v-model="listOrder" :options="{draggable:'.draggable'}" @end="onDragEnd">
    <li v-for="(list, index) in (listOrder || [])"
      class="list-group-item draggable"
      :key="index">
      <label>
        <a @click.prevent="switchToList(index)" href="#">{{ list }}</a>
      </label>
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
  data () {
    return {
      blockstack: window.blockstack
    }
  },
  computed: {
    listOrder: {
      get: function () {
        return this.lists || []
      },
      set: function (value) {
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
      var itemEl = evt.item  // dragged HTMLElement
      console.log(itemEl)
      console.log(evt.oldIndex)  // element's old index within old parent
      console.log(evt.newIndex)  // element's new index within new parent
      this.$emit('reorderList', evt.oldIndex, evt.newIndex)
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
  // width: 100%;
  cursor: pointer;
  input[type="checkbox"] {
    margin-right: 5px;
  }
}
.list-group-item {
  &.completed label {
    text-decoration: line-through;
  }

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
</style>
