const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID
  if (!OPENID) return { ok: false, error: 'NO_OPENID' }
  const users = db.collection('users')
  const found = await users.where({ _openid: OPENID }).limit(1).get()
  if (!found.data.length) {
    await users.add({ data: { createdAt: db.serverDate() } })
  }
  return { ok: true, openid: OPENID }
}
