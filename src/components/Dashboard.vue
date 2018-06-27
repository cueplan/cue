<template>
  <b-container fluid>
    <b-row>
      <b-col sm="auto">
        <div class="sidebar">
          <div class="logo">
            <img src="../assets/images/logo.png" height="48" width="144"/>
            <b-dropdown boundary="viewport" no-caret right class="user-dropdown" toggleClass="user-toggle">
              <template slot="button-content">
                <img :src="avatarUrl" class="avatar"/>
              </template>
              <b-dropdown-item @click.prevent="signOut">Sign Out</b-dropdown-item>
              <b-dropdown-item @click.prevent="backupData">Backup Data</b-dropdown-item>
              <b-dropdown-item @click.prevent="$refs.restoreinput.click()">Restore From Backup ...</b-dropdown-item>
              <input type="file" ref="restoreinput" id="restoreinput" accept=".json" v-on:change="restoreBackup"/>
            </b-dropdown>
          </div>
          <div>
            <b-card class="today-card" no-body>
              <b-list-group flush>
                <b-list-group-item :variant="currentDayPlanId === primaryListId ? 'primary' : ''">
                  <a @click.prevent="switchPrimaryList(currentDayPlanId)" href="#">{{ dayPlanIsCurrent ? 'Today\'s' : currentPlanDate }} Plan</a>
                </b-list-group-item>
                <b-list-group-item v-if="tomorrowDayPlanId" :variant="tomorrowDayPlanId === primaryListId ? 'primary' : ''">
                  <a @click.prevent="switchPrimaryList(tomorrowDayPlanId)" href="#">Tomorrow's Plan</a>
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
      </b-col>
      <b-col sm>
        <cuelist/>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import ListList from './ListList.vue'
import CueList from './CueList.vue'
import draggable from 'vuedraggable'
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'dashboard',
  components: {
    listlist: ListList,
    draggable,
    cuelist: CueList
  },
  data () {
    return {
      collection: 0
    }
  },
  computed: {
    avatarUrl: function () {
      return this.userAvatarUrl || require('../assets/images/avatar-placeholder.png')
    },
    currentPlanDate: function () {
      return this.currentDayPlanDate === null ? '' : this.currentDayPlanDate.toLocaleDateString()
    },
    ...mapState([
      'lists',
      'currentDayPlan'
    ]),
    ...mapGetters('user', [
      'userAvatarUrl'
    ]),
    ...mapGetters([
      'activeLists',
      'archiveLists',
      'currentDayPlanId',
      'primaryListId',
      'currentDayPlanDate',
      'dayPlanIsCurrent',
      'tomorrowDayPlanId'
    ])
  },
  created () {
    window.addEventListener('beforeunload', this.beforeUnload)
  },
  mounted () {
    this.$store.dispatch('loadLists')
    .then(() => {
      this.switchPrimaryList(this.currentDayPlanId)
    })
  },
  methods: {
    ...mapActions([
      'switchPrimaryList',
      'startDayPlan'
    ]),
    ...mapActions('user', [
      'signOut'
    ]),

    beforeUnload (e) {
      if (!this.$store.state.listsSaved) {
        e.returnValue = "Latest changes haven't been saved. Are you sure?"
      }
    },

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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
input::placeholder {
  color: grey;
}

label {
  margin-bottom: 0;
  cursor: pointer;
  input[type="checkbox"] {
    margin-right: 5px;
  }
}

.today-card {
  margin-bottom: 20px;
}
</style>
