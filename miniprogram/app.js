const { get } = require('./config')

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用支持云开发的基础库')
      return
    }
    const envId = get().envId
    if (!envId || envId === 'YOUR_ENV_ID') {
      console.warn('请在 miniprogram/config.js 中填写云开发 envId')
    }
    wx.cloud.init({
      env: envId,
      traceUser: true
    })
  },
  globalData: {
    user: null
  }
})
