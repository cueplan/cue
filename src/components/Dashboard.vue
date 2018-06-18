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
          <div class="listlist">
            <b-card no-body>
            <b-tabs card v-model="listsIndex">
              <b-tab title="Current">
                <listlist
                  :lists="activeLists"
                  v-on:switchList="switchToList"
                  v-on:newList="newList"
                  v-on:reorderList="reorderList"
                />
              </b-tab>
              <b-tab title="Archive">
                <listlist
                  :lists="archiveLists"
                  v-on:switchList="switchToList"
                  v-on:newList="newList"
                  v-on:reorderList="reorderList"
                />
              </b-tab>
            </b-tabs>
            </b-card>
          </div>
        </div>
      </b-col>
      <b-col sm>
        <cuelist :cuedata="{ loadedList: null }" v-on:archiveList="archiveList" v-on:changeListName="changeListName"/>
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
      collection: 'active',
      listIndex: 0
    }
  },
  computed: {
    avatarUrl: function () {
      return this.userAvatarUrl || require('../assets/images/avatar-placeholder.png')
    },
    currentCollection: function () {
      if (typeof this.cuedata.lists.collections === 'undefined') {
        return
      }
      return this.cuedata.lists.collections[this.collection]
    },
    listsIndex: {
      get: function () {
        return this.collection === 'active' ? 0
          : this.collection === 'archive' ? 1
          : 2
      },
      set: function (value) {
        if (value === 0) {
          this.switchToCollection('active')
        } else if (value === 1) {
          this.switchToCollection('archive')
        }
      }
    },
    ...mapState([
      'user',
      'lists'
    ]),
    ...mapGetters([
      'activeLists',
      'archiveLists',
      'userAvatarUrl'
    ])
  },
  created () {
    window.addEventListener('beforeunload', this.beforeUnload)
  },
  mounted () {
    this.$store.dispatch('loadLists')
    .then(() => {
      this.$store.dispatch('switchPrimaryList', { listIndex: 0, force: true })
    })
  },
  methods: {
    ...mapActions([
      'archiveList',
      'reorderList'
    ]),

    switchToCollection (collection) {
      this.$store.commit('setCollection', collection)
    },

    switchToList (listIndex, force) {
      this.$store.dispatch('switchPrimaryList', { listIndex: listIndex, force: force })
    },

    newList () {
      this.$store.dispatch('newList')
    },

    changeListName (newName) {
      this.$store.dispatch('changeListName', newName)
    },

    beforeUnload (e) {
      if (!this.$store.state.listsSaved) {
        e.returnValue = "Latest changes haven't been saved. Are you sure?"
      }
    },

    // account operations
    signOut () {
      this.$store.dispatch('signOut')
    },

    backupData () {
      this.cuedata.backupData()
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
      this.cuedata.restoreBackup(e.target.files[0])
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
</style>
