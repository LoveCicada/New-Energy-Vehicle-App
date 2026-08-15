const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function requireAdmin(event) {
  const token = (event && event.token) || ''
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
  if (!event.id) return { ok: false, error: 'MISSING_ID' }
  const doc = await db.collection('posts').doc(event.id).get()
  const post = doc.data
  if (!post) return { ok: false, error: 'NOT_FOUND' }

  const content = (post.title || '') + '\n' + (post.summary || '') + '\n' + (post.body || '')
  const sec = await cloud.callFunction({
    name: 'msgSecCheck',
    data: { content: content }
  })
  if (!sec.result || !sec.result.ok) {
    return { ok: false, error: 'SECURITY_HIT', reason: (sec.result && sec.result.reason) || '' }
  }

  const now = db.serverDate()
  await db.collection('posts').doc(event.id).update({
    data: {
      status: 'published',
      publishedAt: now,
      updatedAt: now,
      reviewReason: ''
    }
  })
  return { ok: true }
}
