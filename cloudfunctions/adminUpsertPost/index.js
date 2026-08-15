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

  const now = db.serverDate()
  const payload = {
    bucketId: event.bucketId,
    subBrandId: event.subBrandId,
    title: event.title,
    cover: event.cover || '',
    summary: event.summary || '',
    body: event.body || '',
    launchStatus: event.launchStatus || 'teaser',
    priceText: event.priceText || '',
    tags: event.tags || [],
    sourceNote: event.sourceNote || '手工录入',
    sourceUrl: event.sourceUrl || '',
    sourceType: event.sourceType || 'official',
    origin: 'manual',
    updatedAt: now
  }

  const doPublish = !!event.publish
  if (doPublish) {
    const content = payload.title + '\n' + payload.summary + '\n' + payload.body
    const sec = await cloud.callFunction({
      name: 'msgSecCheck',
      data: { content: content }
    })
    if (!sec.result || !sec.result.ok) {
      return { ok: false, error: 'SECURITY_HIT', reason: (sec.result && sec.result.reason) || '' }
    }
    payload.status = 'published'
    payload.publishedAt = now
    payload.reviewReason = ''
  } else {
    payload.status = event.status || 'draft'
    payload.publishedAt = null
    payload.reviewReason = ''
  }

  if (event.id) {
    await db.collection('posts').doc(event.id).update({ data: payload })
    return { ok: true, id: event.id }
  }

  payload.createdAt = now
  payload.contentHash = 'manual-' + Date.now()
  const addRes = await db.collection('posts').add({ data: payload })
  return { ok: true, id: addRes._id }
}
