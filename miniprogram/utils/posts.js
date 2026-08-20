const LOADED = require('./posts-data.js')
const RAW = Array.isArray(LOADED)
  ? LOADED
  : LOADED && Array.isArray(LOADED.default)
    ? LOADED.default
    : []
const { launchStatusText, bucketText, SUB_BRANDS } = require('./format')

function decorate(p) {
  return Object.assign({}, p, {
    _id: p.id || p._id,
    launchStatusText: launchStatusText(p.launchStatus),
    bucketText: bucketText(p.bucketId),
    subBrandText: SUB_BRANDS[p.subBrandId] || p.subBrandName || p.subBrandId || '',
    powerText: (p.powerTags || []).join(' / '),
    bodyType: p.bodyType || ''
  })
}

function published() {
  return RAW.filter(function (p) {
    return !p.status || p.status === 'published'
  })
}

function listPosts(opts) {
  opts = opts || {}
  let list = published()
  if (opts.bucketId) {
    list = list.filter(function (p) {
      return p.bucketId === opts.bucketId
    })
  }
  if (opts.subBrandId) {
    list = list.filter(function (p) {
      return p.subBrandId === opts.subBrandId
    })
  }
  if (opts.powerTag) {
    list = list.filter(function (p) {
      return (p.powerTags || []).indexOf(opts.powerTag) >= 0
    })
  }
  list = list.slice().sort(function (a, b) {
    return String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))
  })
  const page = opts.page || 1
  const pageSize = opts.pageSize || 50
  const start = (page - 1) * pageSize
  return list.slice(start, start + pageSize).map(decorate)
}

function getPost(id) {
  const p = RAW.find(function (x) {
    return x.id === id || x._id === id
  })
  return p ? decorate(p) : null
}

function getPostsByIds(ids) {
  const set = {}
  ;(ids || []).forEach(function (id) {
    set[id] = true
  })
  return published()
    .filter(function (p) {
      return set[p.id] || set[p._id]
    })
    .map(decorate)
}

module.exports = { listPosts, getPost, getPostsByIds }
