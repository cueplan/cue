<script>
export default {
  name: 'ImplicitCallback',
  async beforeMount () {
    await this.$store.dispatch('user/handlePendingSignIn')
    console.log('beforeMount')
    this.$router.replace({
      path: '/'
    })
  },
  render () {}
}
</script>
