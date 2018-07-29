<template>
  <div class="hello">
    <div>
      <img id="logo" src="../assets/images/logo.png" height="128" width="384"/>
      <auth/>
    </div>
  </div>
</template>

<script>
import Auth from './Auth.vue'

export default {
  name: 'landing',
  components: { Auth }
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
