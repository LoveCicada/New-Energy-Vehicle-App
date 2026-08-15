const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  event = event || {}
  if (!event.id) return { ok: false, error: 'MISSING_ID' }
  const res = await db.collection('posts').doc(event.id).get()
  const post = res.data
  if (!post || post.status !== 'published') return { ok: false, error: 'NOT_FOUND' }

  let favorited = false
  const wxContext = cloud.getWXContext()
  if (wxContext.OPENID) {
    const fav = await db
      .collection('favorites')
      .where({ _openid: wxContext.OPENID, postId: event.id })
      .limit(1)
      .get()
    favorited = fav.data.length > 0
  }
  return { ok: true, post: post, favorited: favorited }
}
