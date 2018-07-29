export default {
  'okta': {
    'issuer': 'https://<okta account website>/oauth2/default',
    'client_id': '<okta client id>',
    'redirect_uri': 'http://<cue website>/implicit/callback',
    'scope': 'openid profile email'
  },
  'api_uri': 'http://<cue api website>/api/1/'
}
