Page({
  data: {
    buckets: [],
    tags: [],
    bucketId: '',
    subBrandId: '',
    selectedTags: [],
    list: [],
    displayList: [],
    empty: false,
    loading: false,
    adUnitIdFeed: '',
    subBrands: []
  },
  onShow() {
    const { get } = require('../../config')
    const { BUCKET } = require('../../utils/format')
    const TAGS = ['SUV', '轿车', 'MPV', '增程', '纯电', '插混']
    const BUCKETS = [
      { id: '', name: '全部' },
      { id: 'byd', name: BUCKET.byd },
      { id: 'geely', name: BUCKET.geely },
      { id: 'huawei', name: BUCKET.huawei },
      { id: 'xiaomi', name: BUCKET.xiaomi }
    ]
    this.setData({
      buckets: BUCKETS,
      tags: TAGS,
      adUnitIdFeed: get().adUnitIdFeed || ''
    })
    this.reload()
  },
  reload() {
    const { listPosts } = require('../../utils/posts')
    this.setData({ loading: true })
    const list = listPosts({
      bucketId: this.data.bucketId || undefined,
      subBrandId: this.data.subBrandId || undefined,
      tags: this.data.selectedTags.length ? this.data.selectedTags : undefined,
      page: 1,
      pageSize: 50
    })
    this.setData({
      list,
      displayList: this.withAds(list),
      empty: list.length === 0,
      loading: false
    })
  },
  withAds(list) {
    const { get } = require('../../config')
    const unit = get().adUnitIdFeed
    if (!unit) return list.map((item) => ({ type: 'post', item }))
    const out = []
    list.forEach((item, i) => {
      out.push({ type: 'post', item })
      if ((i + 1) % 5 === 0) out.push({ type: 'ad', unitId: unit })
    })
    return out
  },
  onBucket(e) {
    const id = e.currentTarget.dataset.id
    const { SUB_BY_BUCKET } = require('../../utils/format')
    const subBrands = id ? SUB_BY_BUCKET[id] || [] : []
    this.setData({ bucketId: id, subBrandId: '', subBrands }, () => this.reload())
  },
  onSubBrand(e) {
    this.setData({ subBrandId: e.currentTarget.dataset.id }, () => this.reload())
  },
  onTag(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = this.data.selectedTags.slice()
    const i = selectedTags.indexOf(tag)
    if (i >= 0) selectedTags.splice(i, 1)
    else selectedTags.push(tag)
    this.setData({ selectedTags }, () => this.reload())
  },
  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  }
})
