function toCard(p) {
  return {
    id: p.id,
    title: p.title,
    cover: p.cover || '',
    priceText: p.priceText,
    launchStatusText: p.launchStatusText,
    powerText: p.powerText,
    bodyType: p.bodyType,
    tags: p.tags || [],
    coverOk: true
  }
}

function datasetId(e) {
  const id = e.currentTarget.dataset.id
  if (id === 'all' || id === undefined || id === null) return ''
  return String(id)
}

const POWERS = [
  { id: '', name: '全部动力' },
  { id: '纯电', name: '纯电' },
  { id: '插混', name: '插混' },
  { id: '增程', name: '增程' }
]

Page({
  data: {
    buckets: [],
    powers: [],
    bucketId: '',
    powerTag: '',
    list: [],
    displayList: [],
    empty: false,
    loading: false,
    adUnitIdFeed: ''
  },
  onShow() {
    const { get } = require('../../config')
    const { BUCKET } = require('../../utils/format')
    const { consumeFeedIntent } = require('../../utils/storage')
    const BUCKETS = [
      { id: '', name: '全部' },
      { id: 'byd', name: BUCKET.byd },
      { id: 'geely', name: BUCKET.geely },
      { id: 'huawei', name: BUCKET.huawei },
      { id: 'xiaomi', name: BUCKET.xiaomi }
    ]
    const patch = {
      buckets: BUCKETS,
      powers: POWERS,
      adUnitIdFeed: get().adUnitIdFeed || ''
    }
    const intent = consumeFeedIntent()
    if (intent) {
      patch.bucketId = intent.bucketId || ''
      patch.powerTag = intent.powerTag || ''
    }
    this.setData(patch, () => this.reload())
  },
  reload() {
    this.setData({ loading: true })
    try {
      const { listPosts } = require('../../utils/posts')
      const list = listPosts({
        bucketId: this.data.bucketId || undefined,
        powerTag: this.data.powerTag || undefined,
        page: 1,
        pageSize: 50
      }).map(toCard)
      this.setData({
        list: list,
        displayList: this.withAds(list),
        empty: list.length === 0,
        loading: false
      })
    } catch (e) {
      console.error('listPosts', e)
      this.setData({
        list: [],
        displayList: [],
        empty: true,
        loading: false
      })
    }
  },
  withAds(list) {
    const { get } = require('../../config')
    const unit = get().adUnitIdFeed
    if (!unit) {
      return list.map(function (item) {
        return { type: 'post', id: item.id, item: item }
      })
    }
    const out = []
    list.forEach(function (item, i) {
      out.push({ type: 'post', id: item.id, item: item })
      if ((i + 1) % 5 === 0) {
        out.push({ type: 'ad', id: 'ad-' + i, unitId: unit })
      }
    })
    return out
  },
  onBucket(e) {
    this.setData({ bucketId: datasetId(e), powerTag: '' }, () => this.reload())
  },
  onPower(e) {
    this.setData({ powerTag: datasetId(e) }, () => this.reload())
  },
  clearFilters() {
    this.setData({ bucketId: '', powerTag: '' }, () => this.reload())
  },
  onCoverError(e) {
    const id = e.currentTarget.dataset.id
    const displayList = this.data.displayList.map(function (row) {
      if (row.type === 'post' && String(row.id) === String(id) && row.item) {
        return Object.assign({}, row, {
          item: Object.assign({}, row.item, { coverOk: false })
        })
      }
      return row
    })
    this.setData({ displayList: displayList })
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  }
})
