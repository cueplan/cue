<template>
  <div class="login">
    <div id="okta-signin-container"></div>
  </div>
</template>

<script>
import OktaSignIn from '@okta/okta-signin-widget'
import '@okta/okta-signin-widget/dist/css/okta-sign-in.min.css'
import config from '../config'

export default {
  name: 'Login',
  mounted: function () {
    this.$nextTick(function () {
      this.widget = new OktaSignIn({
        /**
         * Note: when using the Sign-In Widget for an OIDC flow, it still
         * needs to be configured with the base URL for your Okta Org. Here
         * we derive it from the given issuer for convenience.
         */
        baseUrl: config.okta.issuer.split('/oauth2')[0],
        clientId: config.okta.client_id,
        redirectUri: config.okta.redirect_uri,
        // logo: require('@/assets/logo.png'),
        i18n: {
          en: {
            'primaryauth.title': 'Sign In'
          }
        },
        registration: {
          parseSchema: function (schema, onSuccess, onFailure) {
            // handle parseSchema callback
            onSuccess(schema)
          },
          preSubmit: function (postData, onSuccess, onFailure) {
            // handle preSubmit callback
            onSuccess(postData)
          },
          postSubmit: function (response, onSuccess, onFailure) {
              // handle postsubmit callback
            onSuccess(response)
          }
        },
        customButtons: [{
          title: 'Sign In With Blockstack',
          className: 'btn-blockstackAuth',
          click: function () {
            window.location.href = 'http://www.example.com' // do Blockstack sign in redirect
          }
        }],
        features: {
          registration: true
        },
        authParams: {
          responseType: ['id_token', 'token'],
          issuer: config.okta.issuer,
          display: 'page',
          scopes: config.okta.scope.split(' ')
        }
      })
      this.widget.renderEl(
        { el: '#okta-signin-container' },
        () => {
          /**
           * In this flow, the success handler will not be called because we redirect
           * to the Okta org for the authentication workflow.
           */
        },
        (err) => {
          throw err
        }
      )
    })
  },
  destroyed () {
    // Remove the widget from the DOM on path change
    this.widget.remove()
  }
}
</script>

<style src="../assets/sass/app.scss" lang="scss"></style>
