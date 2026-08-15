const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  event = event || {}
  const content = String(event.content || '').slice(0, 2500)
  if (!content.trim()) return { ok: false, reason: 'EMPTY' }
  try {
    const openid = event.openid || cloud.getWXContext().OPENID || ''
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: 3,
      openid: openid || undefined,
      content: content
    })
    if (result.errCode === 0 || (result.result && result.result.suggest === 'pass')) {
      return { ok: true }
    }
    return { ok: false, reason: 'SECURITY_HIT' }
  } catch (e) {
    console.error('msgSecCheck', e)
    // Fail closed for auto-publish paths
    return { ok: false, reason: 'SECURITY_ERROR' }
  }
}
