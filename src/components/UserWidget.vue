<template>
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
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'userwidget',
  computed: {
    isDebug: function () {
      return process.env.NODE_ENV !== 'production'
    },
    avatarUrl: function () {
      return this.userAvatarUrl || require('../assets/images/avatar-placeholder.png')
    },
    ...mapGetters('user', [
      'userAvatarUrl'
    ])
  },
  methods: {
    ...mapActions([
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

