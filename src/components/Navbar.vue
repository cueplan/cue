<template>
  <b-navbar toggleable="sm" type="dark">
    <div class="logo">
      <img src="../assets/images/logo.png" height="48" width="144"/>
      <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
      <userwidget/>
    </div>
    <b-collapse is-nav id="nav_collapse">
      <sidebar/>
    </b-collapse>
  </b-navbar>
</template>

<script>
import UserWidget from './UserWidget.vue'
import Sidebar from './Sidebar.vue'

export default {
  name: 'navbar',
  components: {
    userwidget: UserWidget,
    sidebar: Sidebar
  }
}
</script>
