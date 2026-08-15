const { callFn } = require('./request')

async function ensureLogin() {
  try {
    await new Promise(function (resolve, reject) {
      wx.login({ success: resolve, fail: reject })
    })
    const res = await callFn('login', {})
    if (!res || !res.ok) throw new Error((res && res.error) || 'login failed')
    getApp().globalData.user = { openid: res.openid }
    return res.openid
  } catch (e) {
    wx.showToast({ title: '登录失败', icon: 'none' })
    throw e
  }
}

module.exports = { ensureLogin }
