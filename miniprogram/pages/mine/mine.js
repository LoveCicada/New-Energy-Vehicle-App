const { callFn } = require('../../utils/request')
const { ensureLogin } = require('../../utils/auth')
const { bucketText, launchStatusText } = require('../../utils/format')

Page({
  data: {
    loggedIn: false,
    follows: [],
    favorites: []
  },
  onShow() {
    const user = getApp().globalData.user
    if (user && user.openid) {
      this.setData({ loggedIn: true })
      this.loadMine()
    } else {
      this.setData({ loggedIn: false, follows: [], favorites: [] })
    }
  },
  async onLogin() {
    try {
      await ensureLogin()
      this.setData({ loggedIn: true })
      this.loadMine()
    } catch (e) {}
  },
  async loadMine() {
    try {
      const res = await callFn('mineData', {})
      if (!res || !res.ok) return
      const follows = (res.follows || []).map(function (f) {
        return {
          bucketId: f.bucketId,
          name: bucketText(f.bucketId)
        }
      })
      const favorites = (res.favorites || []).map(function (p) {
        return Object.assign({}, p, {
          launchStatusText: launchStatusText(p.launchStatus),
          bucketText: bucketText(p.bucketId)
        })
      })
      this.setData({ follows: follows, favorites: favorites })
    } catch (e) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    }
  },
  async onUnfollow(e) {
    const bucketId = e.currentTarget.dataset.id
    try {
      await ensureLogin()
      await callFn('toggleFollow', { bucketId: bucketId })
      this.loadMine()
    } catch (err) {}
  },
  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },
  async onFollowBucket(e) {
    const bucketId = e.currentTarget.dataset.id
    try {
      await ensureLogin()
      const res = await callFn('toggleFollow', { bucketId: bucketId })
      if (res && res.ok) {
        wx.showToast({
          title: res.following ? '已关注' : '已取消关注',
          icon: 'none'
        })
        this.setData({ loggedIn: true })
        this.loadMine()
      }
    } catch (err) {}
  }
})
