/* global WIKI */

// ------------------------------------
// Okta Account
// ------------------------------------

const OpenIDConnectStrategy = require('passport-openidconnect').Strategy
const _ = require('lodash')

module.exports = {
  init (passport, conf) {
    const issuer = conf.issuer || `${conf.audience}/oauth2/default`
    passport.use(conf.key,
      new OpenIDConnectStrategy({
        issuer,
        authorizationURL: conf.authorizationURL || `${issuer}/v1/authorize`,
        tokenURL: conf.tokenURL || `${issuer}/v1/token`,
        userInfoURL: conf.userInfoURL || `${issuer}/v1/userinfo`,
        clientID: conf.clientId,
        clientSecret: conf.clientSecret,
        callbackURL: conf.callbackURL,
        passReqToCallback: true
      }, async (req, iss, sub, profile, cb) => {
        try {
          const user = await WIKI.db.users.processProfile({
            providerKey: req.params.strategy,
            profile: {
              ...profile,
              picture: _.get(profile, '_json.profile', '')
            }
          })
          cb(null, user)
        } catch (err) {
          cb(err, null)
        }
      })
    )
  },
  logout (conf) {
    if (!conf.logoutURL) {
      return '/'
    } else {
      return conf.logoutURL
    }
  }
}
