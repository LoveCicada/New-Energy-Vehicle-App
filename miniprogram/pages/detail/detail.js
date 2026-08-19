const { get } = require('../../config')
const { getPost } = require('../../utils/posts')
const { ensureLogin } = require('../../utils/auth')
const { isFavorited, toggleFavorite } = require('../../utils/storage')

Page({
  data: {
    post: null,
    adUnitIdDetail: '',
    favorited: false
  },
  onLoad(query) {
    this.postId = query.id
    this.setData({ adUnitIdDetail: get().adUnitIdDetail || '' })
    this.load()
  },
  load() {
    const post = getPost(this.postId)
    if (!post) {
      wx.showToast({ title: '内容不存在', icon: 'none' })
      return
    }
    this.setData({
      post: post,
      favorited: isFavorited(this.postId)
    })
  },
  openSource() {
    const url = this.data.post && this.data.post.sourceUrl
    if (!url) return
    wx.setClipboardData({ data: url })
    wx.showToast({ title: '来源链接已复制', icon: 'none' })
  },
  onFavorite() {
    ensureLogin()
      .then(() => {
        const res = toggleFavorite(this.postId)
        this.setData({ favorited: res.favorited })
        wx.showToast({
          title: res.favorited ? '已收藏' : '已取消收藏',
          icon: 'none'
        })
      })
      .catch(function () {})
  }
})
