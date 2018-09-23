<template>
  <b-navbar toggleable="sm" type="dark">
    <div class="logo">
    <img src="../assets/images/logo.png" height="48" width="144"/>
    <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
    <b-dropdown boundary="viewport" no-caret right class="user-dropdown" toggleClass="dropdown-toggle">
      <template slot="button-content">
      <img :src="avatarUrl" class="avatar"/>
      </template>
      <b-dropdown-item @click.prevent="signOut">Sign Out</b-dropdown-item>
      <b-dropdown-item @click.prevent="backupData">Backup Data</b-dropdown-item>
      <b-dropdown-item @click.prevent="$refs.restoreinput.click()">Restore From Backup ...</b-dropdown-item>
      <input type="file" ref="restoreinput" id="restoreinput" accept=".json" v-on:change="restoreBackup"/>
      <b-dropdown-item v-if="isDebug" @click.prevent="debugAction">Debug Action</b-dropdown-item>
    </b-dropdown>
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
import draggable from 'vuedraggable'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'navbar',
  components: {
    listlist: ListList,
    draggable
  },
  data () {
    return {
      collection: 0
    }
  },
  computed: {
    isDebug: function () {
      return process.env.NODE_ENV !== 'production'
    },
    avatarUrl: function () {
      return this.userAvatarUrl || require('../assets/images/avatar-placeholder.png')
    },
    primaryListId: function () {
      return this.$store.getters['primaryList/id']
    },
    ...mapGetters('user', [
      'userAvatarUrl'
    ]),
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
      'startDayPlan',
      'debugAction'
    ]),
    ...mapActions('user', [
      'signOut'
    ]),

    backupData () {
      this.$store.dispatch('backupData')
      .then((backup) => {
        this.download('backup.json', JSON.stringify(backup))
      })
    },

    download (filename, text) {
      var element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
      element.setAttribute('download', filename)

      element.style.display = 'none'
      document.body.appendChild(element)

      element.click()

      document.body.removeChild(element)
    },

    restoreBackup (e) {
      // TODO: just reload inside the store, once restoreBackup is complete
      this.$store.dispatch('restoreBackup', e.target.files[0])
      .then(() => {
        window.location.reload()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.today-card {
  margin-bottom: 20px;
}
</style>
