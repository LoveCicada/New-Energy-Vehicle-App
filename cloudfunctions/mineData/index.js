const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const OPENID = cloud.getWXContext().OPENID
  if (!OPENID) return { ok: false, error: 'UNAUTHORIZED' }
  const follows = await db.collection('follows').where({ _openid: OPENID }).get()
  const favorites = await db.collection('favorites').where({ _openid: OPENID }).get()
  const postIds = favorites.data.map(function (f) {
    return f.postId
  })
  let posts = []
  if (postIds.length) {
    const pr = await db
      .collection('posts')
      .where({ _id: _.in(postIds), status: 'published' })
      .get()
    posts = pr.data
  }
  return { ok: true, follows: follows.data, favorites: posts }
}
