<template>
  <div class="hello">
    <div>
      <img id="logo" src="../assets/images/logo.png" height="256" width="768"/>
      <button class="btn btn-default" @click.prevent="redirectToSignIn">Sign In With Blockstack</button>
    </div>
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex'

const { mapActions } = createNamespacedHelpers('user')

export default {
  name: 'landing',
  methods: mapActions([
    'redirectToSignIn'
  ])
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
