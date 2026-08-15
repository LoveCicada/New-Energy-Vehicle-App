const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function requireAdmin(event) {
  const token =
    (event && event.token) ||
    ''
  if (!token) throw new Error('UNAUTHORIZED')
  const s = await db.collection('admin_sessions').where({ token: token }).limit(1).get()
  if (!s.data.length || s.data[0].exp < Date.now()) throw new Error('UNAUTHORIZED')
  return s.data[0]
}

exports.main = async (event) => {
  event = event || {}
  try {
    await requireAdmin(event)
  } catch (e) {
    return { ok: false, error: 'UNAUTHORIZED' }
  }
  const status = event.status || 'pending_review'
  const res = await db
    .collection('posts')
    .where({ status: status })
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get()
  return { ok: true, list: res.data }
}
