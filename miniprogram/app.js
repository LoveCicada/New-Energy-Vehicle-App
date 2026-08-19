const { getUser } = require('./utils/storage')

App({
  onLaunch() {
    this.globalData.user = getUser()
  },
  globalData: {
    user: null
  }
})
