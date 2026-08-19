const { loginLocal, isLoggedIn, getUser } = require('./storage')

function ensureLogin() {
  if (isLoggedIn()) {
    getApp().globalData.user = getUser()
    return Promise.resolve(getUser())
  }
  return Promise.resolve(loginLocal())
}

module.exports = { ensureLogin }
