const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  event = event || {}
  const page = Math.max(1, Number(event.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || 20))
  const where = { status: 'published' }
  if (event.bucketId) where.bucketId = event.bucketId
  if (event.subBrandId) where.subBrandId = event.subBrandId
  if (Array.isArray(event.tags) && event.tags.length) {
    where.tags = _.in(event.tags)
  }

  const col = db.collection('posts')
  const countRes = await col.where(where).count()
  const listRes = await col
    .where(where)
    .orderBy('publishedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    list: listRes.data,
    total: countRes.total,
    page: page,
    pageSize: pageSize
  }
}
