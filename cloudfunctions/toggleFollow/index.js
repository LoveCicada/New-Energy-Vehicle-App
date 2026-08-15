const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  event = event || {}
  const OPENID = cloud.getWXContext().OPENID
  const bucketId = event.bucketId
  if (!OPENID) return { ok: false, error: 'UNAUTHORIZED' }
  if (!bucketId) return { ok: false, error: 'MISSING_BUCKET' }
  const col = db.collection('follows')
  const exist = await col.where({ _openid: OPENID, bucketId: bucketId }).limit(1).get()
  if (exist.data.length) {
    await col.doc(exist.data[0]._id).remove()
    return { ok: true, following: false }
  }
  await col.add({ data: { bucketId: bucketId, createdAt: db.serverDate() } })
  return { ok: true, following: true }
}
