// 将 YOUR_HTTP_BASE 换成云开发 HTTP 访问地址，例如：
// https://env-xxxxx.service.tcloudbase.com
// 并为 admin* / msgSecCheck 等云函数开启 HTTP 触发（POST）
window.AdminAPI = {
  BASE: 'YOUR_HTTP_BASE',
  token: localStorage.getItem('nev_admin_token') || '',

  async call(name, body) {
    const base = this.BASE.replace(/\/$/, '')
    if (!base || base.indexOf('YOUR_HTTP_BASE') === 0) {
      throw new Error('请先在 admin-web/js/api.js 配置 BASE')
    }
    const payload = Object.assign({}, body || {})
    if (this.token) payload.token = this.token
    const res = await fetch(base + '/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return res.json()
  },

  setToken(token) {
    this.token = token || ''
    if (token) localStorage.setItem('nev_admin_token', token)
    else localStorage.removeItem('nev_admin_token')
  }
}
