const { setFeedIntent } = require('../../utils/storage')

Page({
  openFeed(e) {
    const bucketId = e.currentTarget.dataset.bucket || ''
    const powerTag = e.currentTarget.dataset.power || ''
    setFeedIntent({ bucketId: bucketId, powerTag: powerTag })
    wx.switchTab({ url: '/pages/feed/feed' })
  }
})
