const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  event = event || {}
  const OPENID = cloud.getWXContext().OPENID
  const postId = event.postId
  if (!OPENID) return { ok: false, error: 'UNAUTHORIZED' }
  if (!postId) return { ok: false, error: 'MISSING_POST' }
  const col = db.collection('favorites')
  const exist = await col.where({ _openid: OPENID, postId: postId }).limit(1).get()
  if (exist.data.length) {
    await col.doc(exist.data[0]._id).remove()
    return { ok: true, favorited: false }
  }
  await col.add({ data: { postId: postId, createdAt: db.serverDate() } })
  return { ok: true, favorited: true }
}
