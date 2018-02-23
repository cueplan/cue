<template>
  <ul class="list-group">
    <li v-for="(list, index) in (lists.lists || [])"
      class="list-group-item"
      :key="index">
      <label>
        <a @click.prevent="switchToList(index)" href="#">{{ list.name }}</a>
      </label>
    </li>
    <li class="list-group-item">
      <label>
        <a @click.prevent="newList" href="#">+ New List</a>
      </label>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'listlist',
  props: ['lists'],
  data () {
    return {
      blockstack: window.blockstack,
      automerge: window.automerge
    }
  },
  methods: {
    switchToList (list) {
      this.$emit('switchList', list)
    },

    newList () {
      this.$emit('newList')
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
