const { ensureLogin } = require('../../utils/auth')
const { bucketText } = require('../../utils/format')
const { getPostsByIds } = require('../../utils/posts')
const {
  isLoggedIn,
  getUser,
  getFollows,
  toggleFollow,
  getFavoriteIds
} = require('../../utils/storage')

Page({
  data: {
    loggedIn: false,
    follows: [],
    favorites: []
  },
  onShow() {
    if (isLoggedIn()) {
      getApp().globalData.user = getUser()
      this.setData({ loggedIn: true })
      this.loadMine()
    } else {
      this.setData({ loggedIn: false, follows: [], favorites: [] })
    }
  },
  onLogin() {
    ensureLogin()
      .then(() => {
        this.setData({ loggedIn: true })
        this.loadMine()
      })
      .catch(function () {})
  },
  loadMine() {
    const follows = getFollows().map(function (bucketId) {
      return {
        bucketId: bucketId,
        name: bucketText(bucketId)
      }
    })
    const favorites = getPostsByIds(getFavoriteIds())
    this.setData({ follows: follows, favorites: favorites })
  },
  onUnfollow(e) {
    const bucketId = e.currentTarget.dataset.id
    ensureLogin()
      .then(() => {
        toggleFollow(bucketId)
        this.loadMine()
      })
      .catch(function () {})
  },
  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },
  onFollowBucket(e) {
    const bucketId = e.currentTarget.dataset.id
    ensureLogin()
      .then(() => {
        const res = toggleFollow(bucketId)
        wx.showToast({
          title: res.following ? '已关注' : '已取消关注',
          icon: 'none'
        })
        this.setData({ loggedIn: true })
        this.loadMine()
      })
      .catch(function () {})
  }
})
