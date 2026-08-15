const LAUNCH = {
  teaser: '预热',
  presale: '预售',
  launched: '上市',
  facelift: '改款'
}

const BUCKET = {
  byd: '比亚迪',
  geely: '吉利',
  huawei: '华为系列',
  xiaomi: '小米'
}

const SUB_BRANDS = {
  byd: '比亚迪',
  denza: '腾势',
  yangwang: '仰望',
  fangchengbao: '方程豹',
  geely: '吉利',
  lynkco: '领克',
  zeekr: '极氪',
  aito: '问界',
  zhijie: '智界',
  xiangjie: '享界',
  zunjie: '尊界',
  shangjie: '尚界',
  xiaomi: '小米'
}

const SUB_BY_BUCKET = {
  byd: [
    { id: 'byd', name: '比亚迪' },
    { id: 'denza', name: '腾势' },
    { id: 'yangwang', name: '仰望' },
    { id: 'fangchengbao', name: '方程豹' }
  ],
  geely: [
    { id: 'geely', name: '吉利' },
    { id: 'lynkco', name: '领克' },
    { id: 'zeekr', name: '极氪' }
  ],
  huawei: [
    { id: 'aito', name: '问界' },
    { id: 'zhijie', name: '智界' },
    { id: 'xiangjie', name: '享界' },
    { id: 'zunjie', name: '尊界' },
    { id: 'shangjie', name: '尚界' }
  ],
  xiaomi: [{ id: 'xiaomi', name: '小米' }]
}

function launchStatusText(s) {
  return LAUNCH[s] || s || ''
}

function bucketText(id) {
  return BUCKET[id] || id || ''
}

module.exports = {
  launchStatusText,
  bucketText,
  BUCKET,
  SUB_BRANDS,
  SUB_BY_BUCKET,
  LAUNCH
}
