/**
 * Fetch whitelist official pages and write preview/data/posts.json
 * plus miniprogram/data/posts.json (same payload, for local-data miniprogram).
 * Usage: node scripts/fetch-preview-data.js
 */
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { URL } = require('url')
const { compose, isFuelOnly } = require('../cloudfunctions/common/composeRules')
const { isOfficialHost } = require('../cloudfunctions/common/whitelist')
const { sha256Hex } = require('../cloudfunctions/common/hash')

const ROOT = path.join(__dirname, '..')
const sourcesPath = path.join(ROOT, 'scripts', 'ingest_sources.json')
const outDir = path.join(ROOT, 'preview', 'data')
const postsPath = path.join(outDir, 'posts.json')
const metaPath = path.join(outDir, 'meta.json')

const SUB_NAMES = {
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

const FALLBACK_SNIPPETS = {
  byd: '比亚迪新能源车型持续更新，涵盖王朝与海洋系列纯电及插混产品，关注官网发布的上市与价格信息。',
  denza: '腾势作为比亚迪高端品牌，公开车型页展示豪华新能源产品矩阵与官方指导价信息。',
  yangwang: '仰望定位高端新能源，官网展示 U 系列车型与预约咨询入口。',
  fangchengbao: '方程豹主打个性化新能源越野与都市车型，官网提供车型亮点与购车入口。',
  geely: '吉利汽车中国官网展示智能精品车产品线与最新活动信息。',
  lynkco: '领克官网展示新能源与电混车型；演示数据仅保留新能源相关速览。',
  zeekr: '极氪高端纯电品牌，官网与集团新闻页发布新车与上市动态。',
  aito: '问界（AITO）为鸿蒙智行系列车型，官网展示智驾与座舱相关公开信息。',
  zhijie: '智界为鸿蒙智行系列，官网车型页展示轿车、SUV、MPV 等产品信息。',
  xiangjie: '享界为鸿蒙智行系列，官网展示旗舰轿车等公开配置与售价信息。',
  zunjie: '尊界为鸿蒙智行高端系列，官网车型页提供旗舰产品公开信息。',
  shangjie: '尚界为鸿蒙智行系列，官网展示家用新能源车型公开信息。',
  xiaomi: '小米汽车官网展示 SU7、YU7、澎程等车型与预售/售价等公开信息。'
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function fetchText(url) {
  return new Promise(function (resolve, reject) {
    const u = new URL(url)
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; NEVGlancePreview/1.0; +https://github.com/LoveCicada/New-Energy-Vehicle-App)',
          Accept: 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          fetchText(new URL(res.headers.location, url).href).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error('HTTP ' + res.statusCode))
          return
        }
        let data = ''
        res.setEncoding('utf8')
        res.on('data', function (c) {
          if (data.length < 200000) data += c
        })
        res.on('end', function () {
          resolve(stripHtml(data).slice(0, 80000))
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', function () {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

function makePost(src, rawText, fromFallback) {
  const draft = compose({
    rawText: rawText,
    pageUrl: src.entryUrl,
    bucketId: src.bucketId,
    subBrandId: src.subBrandId
  })
  const id = 'p_' + sha256Hex(src.entryUrl).slice(0, 12)
  return {
    id: id,
    bucketId: src.bucketId,
    subBrandId: src.subBrandId,
    subBrandName: SUB_NAMES[src.subBrandId] || src.subBrandId,
    title: draft.title,
    cover: '',
    summary: draft.summary,
    body: draft.body,
    launchStatus: draft.launchStatus,
    priceText: draft.priceText,
    tags: draft.tags,
    sourceNote: fromFallback
      ? '演示占位：官网可能为前端渲染，正文基于公开品牌摘要整理'
      : draft.sourceNote,
    sourceUrl: src.entryUrl,
    sourceType: 'official',
    status: 'published',
    origin: 'pipeline',
    publishedAt: new Date().toISOString()
  }
}

async function main() {
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'))
  const posts = []
  const report = []
  const seen = new Set()

  for (const src of sources) {
    if (!src.enabled) continue
    let host
    try {
      host = new URL(src.entryUrl).hostname
    } catch (e) {
      report.push({ url: src.entryUrl, status: 'bad_url' })
      continue
    }
    if (!isOfficialHost(host)) {
      report.push({ url: src.entryUrl, status: 'skip_non_whitelist' })
      continue
    }

    try {
      let rawText = await fetchText(src.entryUrl)
      let fromFallback = false
      if (!rawText || rawText.length < 80) {
        rawText = FALLBACK_SNIPPETS[src.subBrandId] || FALLBACK_SNIPPETS[src.bucketId] || rawText
        fromFallback = true
      }
      if (isFuelOnly(rawText)) {
        report.push({ url: src.entryUrl, status: 'skip_fuel' })
        continue
      }
      const post = makePost(src, rawText, fromFallback)
      if (seen.has(post.id)) {
        report.push({ url: src.entryUrl, status: 'skip_dup' })
        continue
      }
      seen.add(post.id)
      posts.push(post)
      report.push({
        url: src.entryUrl,
        status: fromFallback ? 'fallback' : 'ok',
        id: post.id
      })
    } catch (e) {
      const rawText =
        FALLBACK_SNIPPETS[src.subBrandId] ||
        FALLBACK_SNIPPETS[src.bucketId] ||
        '新能源车型公开信息速览。'
      if (!isFuelOnly(rawText)) {
        const post = makePost(src, rawText, true)
        if (!seen.has(post.id)) {
          seen.add(post.id)
          posts.push(post)
        }
      }
      report.push({
        url: src.entryUrl,
        status: 'error_fallback',
        error: String(e.message || e)
      })
    }
  }

  // Ensure each bucket has at least one post
  ;['byd', 'geely', 'huawei', 'xiaomi'].forEach(function (bucketId) {
    if (posts.some(function (p) { return p.bucketId === bucketId })) return
    const sub =
      bucketId === 'huawei' ? 'aito' : bucketId === 'geely' ? 'geely' : bucketId === 'xiaomi' ? 'xiaomi' : 'byd'
    const fakeSrc = {
      bucketId: bucketId,
      subBrandId: sub,
      entryUrl: 'https://example.invalid/' + bucketId
    }
    posts.push(makePost(fakeSrc, FALLBACK_SNIPPETS[sub] || '新能源车型速览', true))
  })

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const payload = JSON.stringify(posts, null, 2)
  fs.writeFileSync(postsPath, payload, 'utf8')
  const mpDir = path.join(ROOT, 'miniprogram', 'data')
  if (!fs.existsSync(mpDir)) fs.mkdirSync(mpDir, { recursive: true })
  const mpPostsPath = path.join(mpDir, 'posts.json')
  fs.writeFileSync(mpPostsPath, payload, 'utf8')
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        count: posts.length,
        report: report
      },
      null,
      2
    ),
    'utf8'
  )
  console.log('Wrote', posts.length, 'posts to', postsPath)
  console.log('Wrote', posts.length, 'posts to', mpPostsPath)
  console.log('Meta:', metaPath)
}

main().catch(function (e) {
  console.error(e)
  process.exit(1)
})
