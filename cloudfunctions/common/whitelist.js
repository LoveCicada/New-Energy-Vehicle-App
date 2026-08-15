const ALLOWED_HOSTS = Object.freeze([
  'www.byd.com',
  'www.denza.com',
  'www.yangwangauto.com',
  'www.fangchengbao.com',
  'dh.geely.com',
  'www.geely.com',
  'www.geelyauto.com.hk',
  'www.lynkco.com.cn',
  'www.zeekrlife.com',
  'www.zeekrgroup.com',
  'hima.auto',
  'aito.auto',
  'www.xiaomiev.com'
])

function isOfficialHost(hostname) {
  const h = String(hostname || '')
    .toLowerCase()
    .replace(/^www\./, '')
  return ALLOWED_HOSTS.some(function (allowed) {
    const a = allowed.replace(/^www\./, '')
    return h === a || h.endsWith('.' + a)
  })
}

module.exports = { ALLOWED_HOSTS, isOfficialHost }
