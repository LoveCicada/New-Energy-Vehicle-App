const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function verify(password, passwordHash) {
  const parts = String(passwordHash).split(':')
  const salt = parts[0]
  const hash = parts[1]
  if (!salt || !hash) return false
  const calc = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(calc, 'utf8'), Buffer.from(hash, 'utf8'))
  } catch (e) {
    return false
  }
}

exports.main = async (event) => {
  event = event || {}
  const username = event.username
  const password = event.password
  const res = await db.collection('admins').where({ username: username }).limit(1).get()
  if (!res.data.length || !verify(password, res.data[0].passwordHash)) {
    return { ok: false, error: 'AUTH_FAILED' }
  }
  const token = crypto.randomBytes(24).toString('hex')
  const exp = Date.now() + 12 * 3600 * 1000
  await db.collection('admin_sessions').add({
    data: { token: token, username: username, exp: exp, createdAt: db.serverDate() }
  })
  return { ok: true, token: token, exp: exp }
}
