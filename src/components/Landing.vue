<template>
  <div class="hello">
    <div>
      <img id="logo" src="../assets/images/logo.png" height="256" width="768"/>
      <button class="btn btn-default" @click.prevent="signIn">Sign In With Blockstack</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'landing',
  data () {
    return {
      blockstack: window.blockstack
    }
  },

  methods: {
    signIn () {
      const blockstack = this.blockstack
      blockstack.redirectToSignIn()
    }
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
