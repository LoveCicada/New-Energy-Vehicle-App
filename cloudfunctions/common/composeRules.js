function isFuelOnly(text) {
  const t = String(text || '')
  const hasFuel = /燃油|汽油|柴油/.test(t)
  const hasNev = /纯电|电混|增程|插混|PHEV|BEV|EV|新能源/.test(t)
  return hasFuel && !hasNev
}

function detectLaunchStatus(text) {
  if (/预售/.test(text)) return 'presale'
  if (/预热|亮相|申报/.test(text)) return 'teaser'
  if (/改款|年款/.test(text)) return 'facelift'
  if (/上市|正式发布/.test(text)) return 'launched'
  return 'teaser'
}

function detectPrice(text) {
  const m = String(text).match(/(\d+(\.\d+)?)\s*万/)
  return m ? m[1] + ' 万起' : ''
}

function detectTags(text) {
  const tags = []
  if (/SUV/.test(text)) tags.push('SUV')
  if (/轿车|sedan/i.test(text)) tags.push('轿车')
  if (/MPV/.test(text)) tags.push('MPV')
  if (/增程/.test(text)) tags.push('增程')
  if (/纯电/.test(text)) tags.push('纯电')
  if (/插混|电混|PHEV/.test(text)) tags.push('插混')
  return tags
}

function compose(input) {
  const rawText = (input && input.rawText) || ''
  const pageUrl = (input && input.pageUrl) || ''
  const text = String(rawText).replace(/\s+/g, ' ').trim()
  const title = text.slice(0, 40) || '新车速览更新'
  const summary = text.slice(0, 80)
  const body = [
    '【速览】基于官方公开信息整理，非原文转载。',
    text.slice(0, 600),
    '来源链接：' + pageUrl
  ].join('\n\n')
  return {
    title: title,
    summary: summary,
    body: body,
    launchStatus: detectLaunchStatus(text),
    priceText: detectPrice(text),
    tags: detectTags(text),
    sourceNote: '整理自官方公开页面'
  }
}

module.exports = {
  compose,
  isFuelOnly,
  detectLaunchStatus,
  detectPrice,
  detectTags
}
