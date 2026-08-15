const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')
const { URL } = require('url')
const { isOfficialHost } = require('nev-common').whitelist
const { sha256Hex } = require('nev-common').hash
const { compose, isFuelOnly } = require('nev-common').composeRules

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

function fetchText(url) {
  return new Promise(function (resolve, reject) {
    const u = new URL(url)
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'NEVGlanceBot/1.0' }, timeout: 15000 },
      function (res) {
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

async function msgSec(content) {
  const r = await cloud.callFunction({
    name: 'msgSecCheck',
    data: { content: content }
  })
  return r.result || { ok: false, reason: 'SECURITY_ERROR' }
}

exports.main = async () => {
  const sources = await db.collection('ingest_sources').where({ enabled: true }).get()
  const report = []

  for (let i = 0; i < sources.data.length; i++) {
    const src = sources.data[i]
    try {
      const host = new URL(src.entryUrl).hostname
      if (!isOfficialHost(host)) {
        report.push({ url: src.entryUrl, status: 'skip_non_whitelist' })
        continue
      }

      const rawText = await fetchText(src.entryUrl)
      const contentHash = sha256Hex(src.entryUrl + '\n' + rawText)
      const dup = await db.collection('ingest_raw').where({ contentHash: contentHash }).limit(1).get()
      if (dup.data.length) {
        await db.collection('ingest_raw').add({
          data: {
            sourceId: src._id,
            pageUrl: src.entryUrl,
            fetchedAt: db.serverDate(),
            rawText: rawText.slice(0, 1000),
            contentHash: contentHash,
            fetchStatus: 'skip_dup'
          }
        })
        report.push({ url: src.entryUrl, status: 'skip_dup' })
        continue
      }

      await db.collection('ingest_raw').add({
        data: {
          sourceId: src._id,
          pageUrl: src.entryUrl,
          fetchedAt: db.serverDate(),
          rawText: rawText,
          contentHash: contentHash,
          fetchStatus: 'ok'
        }
      })

      if (isFuelOnly(rawText)) {
        report.push({ url: src.entryUrl, status: 'skip_fuel' })
        continue
      }

      const draft = compose({
        rawText: rawText,
        pageUrl: src.entryUrl,
        bucketId: src.bucketId,
        subBrandId: src.subBrandId
      })

      const incomplete = !draft.title || !src.bucketId || !draft.body
      let status = 'pending_review'
      let reviewReason = ''
      const official = isOfficialHost(host)

      if (incomplete) {
        reviewReason = 'incomplete_fields'
      } else if (!official) {
        reviewReason = 'unofficial'
      } else {
        const sec = await msgSec(draft.title + '\n' + draft.summary + '\n' + draft.body)
        if (!sec.ok) reviewReason = sec.reason || 'SECURITY_HIT'
        else status = 'published'
      }

      const now = db.serverDate()
      await db.collection('posts').add({
        data: {
          bucketId: src.bucketId,
          subBrandId: src.subBrandId,
          title: draft.title,
          cover: '',
          summary: draft.summary,
          body: draft.body,
          launchStatus: draft.launchStatus,
          priceText: draft.priceText,
          tags: draft.tags,
          sourceNote: draft.sourceNote,
          sourceUrl: src.entryUrl,
          sourceType: official ? 'official' : 'unofficial',
          status: status,
          origin: 'pipeline',
          contentHash: contentHash,
          createdAt: now,
          updatedAt: now,
          reviewReason: status === 'pending_review' ? reviewReason : '',
          publishedAt: status === 'published' ? now : null
        }
      })
      report.push({ url: src.entryUrl, status: status })
    } catch (e) {
      await db.collection('ingest_raw').add({
        data: {
          sourceId: src._id,
          pageUrl: src.entryUrl,
          fetchedAt: db.serverDate(),
          rawText: '',
          contentHash: '',
          fetchStatus: 'error',
          errorMessage: String(e.message || e)
        }
      })
      report.push({ url: src.entryUrl, status: 'error', error: String(e.message || e) })
    }
  }

  return { ok: true, report: report }
}
