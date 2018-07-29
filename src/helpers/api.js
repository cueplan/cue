import Okta from './okta.js'
import axios from 'axios'
import config from '../config.js'

export default class {
  constructor () {
    this.useBlockstack = true
    this.blockstack = require('blockstack')
    this.okta = new Okta(Object.assign({}, config.okta))
  }

  async getFile (path, options) {
    if (this.useBlockstack) {
      return await this.blockstack.getFile(path, options)
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${await this.okta.getAccessToken()}`
    var userInfo = await this.okta.getUser()
    try {
      path = path.indexOf('/') === -1 ? '/' + path : path
      path = userInfo.sub + path
      const response = await axios.get(config.api_uri + 'file/' + path)
      return JSON.stringify(response.data)
    } catch (e) {
      console.error(`Get Errors! ${e}`)
    }
  }

  async putFile (path, contents, options) {
    if (this.useBlockstack) {
      return this.blockstack.putFile(path, contents, options)
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${await this.okta.getAccessToken()}`
    var userInfo = await this.okta.getUser()
    try {
      path = path.indexOf('/') === -1 ? '/' + path : path
      path = userInfo.sub + path
      const response = await axios.put(config.api_uri + 'file/' + path, JSON.parse(contents))
      return response.data
    } catch (e) {
      console.error(`Put Errors! ${e}`)
    }
  }

  redirectToSignIn () {
    if (this.useBlockstack) {
      return this.blockstack.redirectToSignIn(window.location.origin + '/implicit/callback') // okta config
    }

    return this.okta.loginRedirect('/')
  }

  async handlePendingSignIn () {
    if (this.blockstack.isSignInPending()) {
      await this.blockstack.handlePendingSignIn()
      return true
    }

    await this.okta.handleAuthentication()
    return true
  }

  async isUserSignedIn () {
    if (this.blockstack.isUserSignedIn()) {
      return true
    }

    if (await this.okta.isAuthenticated()) {
      return true
    }

    return false
  }

  isUserSignedInWithBlockstack () {
    if (this.blockstack.isUserSignedIn()) {
      return true
    }

    return false
  }

  async getUser () {
    if (this.useBlockstack) {
      var userData = this.blockstack.loadUserData()
      var blockstackUser = new this.blockstack.Person(userData.profile)
      return { username: userData.username, avatarUrl: blockstackUser.avatarUrl() }
    }

    var oktaUser = await this.okta.getUser()
    return { username: oktaUser.username, avatarUrl: null }
  }

  async signUserOut () {
    if (this.useBlockstack) {
      await this.blockstack.signUserOut()
      return
    }

    await this.okta.logout()
  }
}
