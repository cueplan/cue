<template>
  <div class="sidebar">
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
      <b-list-group flush>
        <b-list-group-item v-for="(day, dayIndex) in dailyTicklers.lists"
          :key="day.id"
          :variant="day.id === primaryListId ? 'primary' : ''">
          <a @click.prevent="switchList({ namespace: 'primaryList', listId: day.id })" href="#">{{ day.name }}</a>
          <draggable element="ul"
            class="list-group sink"
            v-model="ticklerSinks[dayIndex]"
            :options="{draggable:'.draggable', handle:'.handle', group: { name: 'tasks', pull: 'clone', revertClone: true } }">
          </draggable>
        </b-list-group-item>
      </b-list-group>
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
</template>

<script>
import ListList from './ListList.vue'
import draggable from 'vuedraggable'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'sidebar',
  components: {
    listlist: ListList,
    draggable
  },
  data () {
    return {
      collection: 0,
      ticklerSinks: [[], [], [], [], [], [], []],
      ticklerDragCount: [0, 0, 0, 0, 0, 0, 0]
    }
  },
  watch: {
    ticklerSinks: function (newValue, oldValue) {
      var count = newValue.reduce((current, next) => current + next.length, 0)
      if (count <= 0) return

      this.$nextTick(function () {
        this.flushTicklerSinks()
      })
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
      'tomorrowDayPlanId',
      'dailyTicklers'
    ])
  },
  mounted () {
    this.$store.dispatch('loadLists')
  },
  methods: {
    ...mapActions([
      'switchList',
      'startDayPlan',
      'addTodosToList'
    ]),

    flushTicklerSinks () {
      this.ticklerSinks.forEach((sink, index) => {
        this.addTodosToList({ todos: sink, id: this.dailyTicklers.lists[index].id })
      })
      this.ticklerSinks = [[], [], [], [], [], [], []]
    }
  }
}
</script>

<style lang="scss" scoped>
.card {
  margin-bottom: 20px;
}

</style>
