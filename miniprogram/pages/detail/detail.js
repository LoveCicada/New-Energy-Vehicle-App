const { callFn } = require('../../utils/request')
const { get } = require('../../config')
const { launchStatusText, bucketText, SUB_BRANDS } = require('../../utils/format')
const { ensureLogin } = require('../../utils/auth')

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
  async load() {
    try {
      const res = await callFn('getPost', { id: this.postId })
      if (!res || !res.ok) {
        wx.showToast({ title: '内容不存在', icon: 'none' })
        return
      }
      const post = Object.assign({}, res.post, {
        launchStatusText: launchStatusText(res.post.launchStatus),
        bucketText: bucketText(res.post.bucketId),
        subBrandText: SUB_BRANDS[res.post.subBrandId] || res.post.subBrandId || ''
      })
      this.setData({ post: post, favorited: !!res.favorited })
    } catch (e) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    }
  },
  openSource() {
    const url = this.data.post && this.data.post.sourceUrl
    if (!url) return
    wx.setClipboardData({ data: url })
    wx.showToast({ title: '来源链接已复制', icon: 'none' })
  },
  async onFavorite() {
    try {
      await ensureLogin()
      const res = await callFn('toggleFavorite', { postId: this.postId })
      if (res && res.ok) {
        this.setData({ favorited: res.favorited })
        wx.showToast({
          title: res.favorited ? '已收藏' : '已取消收藏',
          icon: 'none'
        })
      }
    } catch (e) {
      // ensureLogin already toasted
    }
  }
})
