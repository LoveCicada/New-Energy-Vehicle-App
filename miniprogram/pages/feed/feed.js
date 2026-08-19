function toCard(p) {
  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    cover: p.cover,
    priceText: p.priceText,
    launchStatusText: p.launchStatusText,
    bucketText: p.bucketText,
    subBrandText: p.subBrandText
  }
}

function datasetId(e) {
  const id = e.currentTarget.dataset.id
  if (id === 'all' || id === undefined || id === null) return ''
  return String(id)
}

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
    this.setData({ loading: true })
    try {
      const { listPosts } = require('../../utils/posts')
      const list = listPosts({
        bucketId: this.data.bucketId || undefined,
        subBrandId: this.data.subBrandId || undefined,
        tags: this.data.selectedTags.length ? this.data.selectedTags : undefined,
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
    const id = datasetId(e)
    const { SUB_BY_BUCKET } = require('../../utils/format')
    const subBrands = id ? SUB_BY_BUCKET[id] || [] : []
    this.setData({ bucketId: id, subBrandId: '', subBrands: subBrands }, () => this.reload())
  },
  onSubBrand(e) {
    this.setData({ subBrandId: datasetId(e) }, () => this.reload())
  },
  onTag(e) {
    const tag = e.currentTarget.dataset.tag
    if (!tag) return
    const selectedTags = this.data.selectedTags.slice()
    const i = selectedTags.indexOf(tag)
    if (i >= 0) selectedTags.splice(i, 1)
    else selectedTags.push(tag)
    this.setData({ selectedTags: selectedTags }, () => this.reload())
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  }
})
