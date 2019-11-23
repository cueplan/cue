<template>
  <b-container fluid>
    <b-row>
      <b-col sm="auto">
        <navbar/>
      </b-col>
      <b-col sm class="px-0 px-sm-3">
        <cuelist :namespace="'primaryList'" :archivable="primaryListArchivable" :currentable="primaryListCurrentable"/>
      </b-col>
      <b-col sm class="px-0 px-sm-3" v-if="secondaryListLoaded">
        <cuelist :namespace="'secondaryList'"/>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import CueList from './CueList.vue'
import Navbar from './Navbar.vue'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'dashboard',
  components: {
    cuelist: CueList,
    navbar: Navbar
  },
  computed: {
    ...mapState([
      'isDirty'
    ]),
    ...mapGetters([
      'primaryListArchivable', // TODO: move to store
      'primaryListCurrentable'
    ]),

    secondaryListLoaded: function () {
      return this.$store.state.secondaryList.isLoaded
    }
  },
  created () {
    window.addEventListener('beforeunload', this.beforeUnload)
  },
  methods: {
    beforeUnload (e) {
      if (this.isDirty) {
        e.returnValue = "Latest changes haven't been saved. Are you sure?"
      }
    }
  }
}
</script>

<style lang="scss" scoped>
input::placeholder {
  color: grey;
}
</style>
