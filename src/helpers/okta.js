import AuthJS from '@okta/okta-auth-js'

const initConfig = auth => {
  const missing = []
  if (!auth.issuer) missing.push('issuer')
  if (!auth.client_id) missing.push('client_id')
  if (!auth.redirect_uri) missing.push('redirect_uri')
  if (!auth.scope) auth.scope = 'openid'
  if (missing.length) throw new Error(`${missing.join(', ')} must be defined`)

  // Use space separated response_type or default value
  auth.response_type = (auth.response_type || 'id_token token').split(' ')
  return auth
}

export default class {
  constructor (options) {
    this.authConfig = initConfig(options)
    this.oktaAuth = new AuthJS({
      clientId: this.authConfig.client_id,
      issuer: this.authConfig.issuer,
      redirectUri: this.authConfig.redirect_uri,
      url: this.authConfig.issuer.split('/oauth2/')[0]
    })
  }

  loginRedirect (fromUri, additionalParams) {
    if (fromUri) {
      localStorage.setItem('referrerPath', fromUri)
    }
    return this.oktaAuth.token.getWithRedirect({
      responseType: this.authConfig.response_type,
      scopes: this.authConfig.scope.split(' '),
      ...additionalParams
    })
  }

  async logout () {
    this.oktaAuth.tokenManager.clear()
    await this.oktaAuth.signOut()
  }

  async isAuthenticated () {
    return !!(await this.oktaAuth.tokenManager.get('accessToken')) || !!(await this.oktaAuth.tokenManager.get('idToken'))
  }

  async isAuthenticationPending () {
    const tokens = await this.oktaAuth.token.parseFromUrl()
    return !!tokens
  }

  async handleAuthentication () {
    const tokens = await this.oktaAuth.token.parseFromUrl()
    tokens.forEach(token => {
      if (token.accessToken) this.oktaAuth.tokenManager.add('accessToken', token)
      if (token.idToken) this.oktaAuth.tokenManager.add('idToken', token)
    })
  }

  getFromUri () {
    const path = localStorage.getItem('referrerPath') || '/'
    localStorage.removeItem('referrerPath')
    return path
  }

  async getIdToken () {
    const idToken = this.oktaAuth.tokenManager.get('idToken')
    return idToken ? idToken.idToken : undefined
  }

  async getAccessToken () {
    const accessToken = this.oktaAuth.tokenManager.get('accessToken')
    return accessToken ? accessToken.accessToken : undefined
  }

  async getUser () {
    const accessToken = this.oktaAuth.tokenManager.get('accessToken')
    const idToken = this.oktaAuth.tokenManager.get('idToken')
    if (accessToken && idToken) {
      const userinfo = await this.oktaAuth.token.getUserInfo(accessToken)
      if (userinfo.sub === idToken.claims.sub) {
        // Only return the userinfo response if subjects match to
        // mitigate token substitution attacks
        return userinfo
      }
    }
    return idToken ? idToken.claims : undefined
  }

  authRedirectGuard () {
    return async (to, from, next) => {
      if (to.matched.some(record => record.meta.requiresAuth) && !(await this.isAuthenticated())) {
        this.loginRedirect(to.path)
      } else {
        next()
      }
    }
  }
}
