<template>
  <div class="hello">
    <div>
      <img id="logo" src="../assets/images/logo.png" height="128" width="384"/>
      <login/>
      <b-button variant="link" @click.prevent="redirectToSignIn(true)">Sign In With Blockstack</b-button>
    </div>
  </div>
</template>

<script>
import Login from './Login.vue'
import { createNamespacedHelpers } from 'vuex'

const { mapActions } = createNamespacedHelpers('user')

export default {
  name: 'landing',
  components: { Login },
  methods: {
    ...mapActions([
      'redirectToSignIn'
    ])
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.hello {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

#logo {
  display: block;
}

.btn {
  display: block;
  margin-left: auto;
  margin-right: auto;
}
</style>
