<template>
  <b-navbar toggleable="sm" type="dark">
    <div class="logo">
      <img src="../assets/images/logo.png" height="48" width="144"/>
      <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
      <userwidget/>
    </div>
    <b-collapse is-nav id="nav_collapse">
      <div class="sidebar">
        <div>
        <b-card class="today-card" no-body>
          <b-list-group flush>
          <b-list-group-item :variant="currentDayPlanId === primaryListId ? 'primary' : ''">
            <a @click.prevent="switchList({ namespace: 'primaryList', listId: currentDayPlanId })" href="#">{{ $store.getters.currentDayPlanName }}</a>
          </b-list-group-item>
          <b-list-group-item v-if="tomorrowDayPlanId" :variant="tomorrowDayPlanId === primaryListId ? 'primary' : ''">
            <a @click.prevent="switchList({ namespace: 'primaryList', listId: tomorrowDayPlanId })" href="#">{{ $store.getters.tomorrowDayPlanName }}</a>
          </b-list-group-item>
          </b-list-group>
          <b-button v-if="!(tomorrowDayPlanId)" variant="link" @click.prevent="startDayPlan">Plan {{ dayPlanIsCurrent ? 'Tomorrow' : 'Today' }}</b-button>
        </b-card>
        <b-card no-body>
          <b-tabs card v-model="collection">
          <b-tab title="Current">
            <listlist :lists="activeLists"/>
          </b-tab>
          <b-tab title="Archive">
            <listlist :lists="archiveLists"/>
          </b-tab>
          </b-tabs> 
        </b-card>
        </div>
      </div>
    </b-collapse>
  </b-navbar>
</template>

<script>
import ListList from './ListList.vue'
import UserWidget from './UserWidget.vue'
import draggable from 'vuedraggable'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'navbar',
  components: {
    listlist: ListList,
    userwidget: UserWidget,
    draggable
  },
  data () {
    return {
      collection: 0
    }
  },
  computed: {
    primaryListId: function () {
      return this.$store.getters['primaryList/id']
    },
    ...mapGetters([
      'activeLists',
      'archiveLists',
      'currentDayPlanId',
      'dayPlanIsCurrent',
      'tomorrowDayPlanId'
    ])
  },
  mounted () {
    this.$store.dispatch('loadLists')
  },
  methods: {
    ...mapActions([
      'switchList',
      'startDayPlan'
    ])
  }
}
</script>

<style lang="scss" scoped>
.today-card {
  margin-bottom: 20px;
}
</style>
