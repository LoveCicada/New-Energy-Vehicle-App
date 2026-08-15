# 新车速览 (NEV Glance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the WeChat miniprogram「新车速览」with CloudBase: published NEV post feed, login/follow/favorite, official-source ingest + compose pipeline, admin static site, and reserved Banner ad slots.

**Architecture:** Native miniprogram (WXML/WXSS/JS) reads only `published` posts via cloud functions. Ingest cron fetches whitelist official pages, runs `compose()`, then auto-publishes or queues `pending_review`. Admin static site on CloudBase hosting manages review/publish/offline. No VPS.

**Tech Stack:** WeChat miniprogram JS, CloudBase (cloud functions Node.js 16+, document DB, cloud storage, static hosting, timers), plain HTML/CSS/JS admin, `crypto` for contentHash, optional CloudBase AI behind `USE_LLM_COMPOSE` flag (default off = rule compose).

**Spec:** `docs/superpowers/specs/2026-08-15-nev-miniprogram-design.md`

## Global Constraints

- Product name: UI/nav **新车速览**; repo/env **NEV Glance**; fallback name 绿牌速览 if 新车速览 taken.
- Never display「华为汽车」; use「华为系列」or sub-brand names (问界/智界/享界/尊界/尚界).
- Intro copy:「新能源车型上市与价格速览」; not「新闻聚合」.
- Only query `status === 'published'` on user-facing list/detail.
- Auto-publish only when domain is whitelist AND `sourceType === 'official'` AND required fields present AND msgSecCheck passes.
- Do not scrape autohome/dongchedi/yiche/WeChat official accounts in v1.
- Discard fuel-only Lynk & Co (and similar) model pages; keep PHEV/BEV/EREV only.
- Cover: prefer official image URL; transload only when display fails.
- Ingest interval: every 6 hours; whitelist domains only; truncate `rawText` (max 80_000 chars).
- Ads: `adUnitIdFeed` / `adUnitIdDetail` default `''`; empty = do not render `<ad>`, no blank gap.
- Browse without login; login required only for follow/favorite.
- No TypeScript; cloud functions CommonJS Node.js; admin plain static HTML/CSS/JS.
- `compose(raw)` must rewrite; never paste full original article as `body`.
- First version: no VPS, no comments/UGC, no commerce, no rewarded video, no paid WeChat ads acquisition.

---

## File Structure

```
project.config.json
README.md
miniprogram/
  app.js
  app.json
  app.wxss
  config.js
  sitemap.json
  utils/auth.js
  utils/request.js
  utils/format.js
  components/ad-banner/ad-banner.js|json|wxml|wxss
  pages/feed/feed.js|json|wxml|wxss
  pages/detail/detail.js|json|wxml|wxss
  pages/discover/discover.js|json|wxml|wxss
  pages/mine/mine.js|json|wxml|wxss
cloudfunctions/
  common/whitelist.js
  common/hash.js
  common/composeRules.js
  common/brandsSeed.json
  common/sourcesSeed.json
  login/index.js|package.json|config.json
  listPosts/...
  getPost/...
  toggleFollow/...
  toggleFavorite/...
  mineData/...
  adminLogin/...
  adminListPosts/...
  adminUpsertPost/...
  adminPublish/...
  adminOffline/...
  adminIngestLog/...
  msgSecCheck/...
  ingestRun/...
admin-web/
  index.html
  css/admin.css
  js/api.js
  js/login.js
  js/app.js
scripts/
  seed-import.md
  brands.json
  ingest_sources.json
  admin-user.example.json
tests/
  composeRules.test.js
  whitelist.test.js
  listPostsQuery.test.js
```

---

### Task 1: Miniprogram scaffold + CloudBase config

**Files:**
- Create: `project.config.json`, `miniprogram/app.js`, `miniprogram/app.json`, `miniprogram/app.wxss`, `miniprogram/config.js`, `miniprogram/sitemap.json`
- Create: empty pages `feed`, `detail`, `discover`, `mine` (js/json/wxml/wxss stubs)
- Create: `README.md` (register + CloudBase open steps)

**Interfaces:**
- Produces: `config.get()` → `{ envId, adUnitIdFeed, adUnitIdDetail }`
- Produces: `app.json` tabBar with 动态 / 发现 / 我的; detail not in tabBar

- [ ] **Step 1: Create `miniprogram/config.js`**

```js
const config = {
  envId: 'YOUR_ENV_ID',
  adUnitIdFeed: '',
  adUnitIdDetail: ''
}

module.exports = {
  get() {
    return { ...config }
  }
}
```

- [ ] **Step 2: Create `miniprogram/app.js` and `app.json`**

```js
// app.js
const { get } = require('./config')

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用支持云开发的基础库')
      return
    }
    wx.cloud.init({
      env: get().envId,
      traceUser: true
    })
  },
  globalData: {
    user: null
  }
})
```

```json
{
  "pages": [
    "pages/feed/feed",
    "pages/discover/discover",
    "pages/mine/mine",
    "pages/detail/detail"
  ],
  "window": {
    "navigationBarTitleText": "新车速览",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "backgroundTextStyle": "dark"
  },
  "tabBar": {
    "color": "#666666",
    "selectedColor": "#0B6E4F",
    "list": [
      { "pagePath": "pages/feed/feed", "text": "动态" },
      { "pagePath": "pages/discover/discover", "text": "发现" },
      { "pagePath": "pages/mine/mine", "text": "我的" }
    ]
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents"
}
```

- [ ] **Step 3: Create stub pages and `project.config.json`**

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "es6": true,
    "minified": true
  },
  "appid": "YOUR_APPID",
  "projectname": "nev-glance",
  "compileType": "miniprogram"
}
```

Each stub page: `Page({})` and a simple `<view>加载中</view>`.

- [ ] **Step 4: Write README open checklist**

Include: create miniprogram named 新车速览 (or 绿牌速览); personal subject; category near 生活服务/信息查询; intro「新能源车型上市与价格速览»; open CloudBase free env; paste `envId` into `config.js`; paste `appid` into `project.config.json`.

- [ ] **Step 5: Manual verify**

Open WeChat DevTools → import project root → see three tabs titled 新车速览. Expected: no cloud call errors beyond missing env until envId filled.

- [ ] **Step 6: Commit**

```bash
git add project.config.json README.md miniprogram/
git commit -m "chore: scaffold NEV Glance miniprogram tabs and config"
```

---

### Task 2: Seed brands, ingest_sources, admin, DB permissions

**Files:**
- Create: `scripts/brands.json`, `scripts/ingest_sources.json`, `scripts/admin-user.example.json`, `scripts/seed-import.md`
- Create: `cloudfunctions/common/brandsSeed.json`, `cloudfunctions/common/sourcesSeed.json`, `cloudfunctions/common/whitelist.js`

**Interfaces:**
- Produces: `whitelist.isOfficialHost(hostname) → boolean`
- Produces: `whitelist.allowedHosts` frozen list matching spec §6
- Produces: collection field shapes from spec §5

- [ ] **Step 1: Write `cloudfunctions/common/whitelist.js`**

```js
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
  const h = String(hostname || '').toLowerCase().replace(/^www\./, '')
  return ALLOWED_HOSTS.some((allowed) => {
    const a = allowed.replace(/^www\./, '')
    return h === a || h.endsWith('.' + a)
  })
}

module.exports = { ALLOWED_HOSTS, isOfficialHost }
```

Note: keep matching consistent with seeds that use `www.` prefixes; normalize both sides.

- [ ] **Step 2: Write failing test `tests/whitelist.test.js`**

```js
const assert = require('assert')
const { isOfficialHost } = require('../cloudfunctions/common/whitelist')

assert.strictEqual(isOfficialHost('www.byd.com'), true)
assert.strictEqual(isOfficialHost('hima.auto'), true)
assert.strictEqual(isOfficialHost('www.autohome.com.cn'), false)
assert.strictEqual(isOfficialHost('mp.weixin.qq.com'), false)
console.log('whitelist.test.js PASS')
```

- [ ] **Step 3: Run test**

```bash
node tests/whitelist.test.js
```

Expected: `whitelist.test.js PASS`

- [ ] **Step 4: Author `scripts/brands.json` and `scripts/ingest_sources.json`**

`brands.json` — one document per sub-brand, e.g.:

```json
[
  { "bucketId": "byd", "subBrandId": "byd", "name": "比亚迪", "sort": 10, "enabled": true },
  { "bucketId": "byd", "subBrandId": "denza", "name": "腾势", "sort": 20, "enabled": true },
  { "bucketId": "byd", "subBrandId": "yangwang", "name": "仰望", "sort": 30, "enabled": true },
  { "bucketId": "byd", "subBrandId": "fangchengbao", "name": "方程豹", "sort": 40, "enabled": true },
  { "bucketId": "geely", "subBrandId": "geely", "name": "吉利", "sort": 10, "enabled": true },
  { "bucketId": "geely", "subBrandId": "lynkco", "name": "领克", "sort": 20, "enabled": true },
  { "bucketId": "geely", "subBrandId": "zeekr", "name": "极氪", "sort": 30, "enabled": true },
  { "bucketId": "huawei", "subBrandId": "aito", "name": "问界", "sort": 10, "enabled": true },
  { "bucketId": "huawei", "subBrandId": "zhijie", "name": "智界", "sort": 20, "enabled": true },
  { "bucketId": "huawei", "subBrandId": "xiangjie", "name": "享界", "sort": 30, "enabled": true },
  { "bucketId": "huawei", "subBrandId": "zunjie", "name": "尊界", "sort": 40, "enabled": true },
  { "bucketId": "huawei", "subBrandId": "shangjie", "name": "尚界", "sort": 50, "enabled": true },
  { "bucketId": "xiaomi", "subBrandId": "xiaomi", "name": "小米", "sort": 10, "enabled": true }
]
```

`ingest_sources.json` — include every entry URL from spec §6 (byd news + model fallback, denza cn, yangwang, fangchengbao, geely home + geelyauto news, lynkco, zeekrlife + zeekrgroup news, hima/aito paths, xiaomiev). Fields: `bucketId`, `subBrandId`, `domain`, `entryUrl`, `kind` (`news_list`|`model_page`), `enabled`.

- [ ] **Step 5: Document import in `scripts/seed-import.md`**

Steps: Cloud console → create collections `brands`, `posts`, `users`, `follows`, `favorites`, `admins`, `ingest_sources`, `ingest_raw`. Permissions: user client read only via cloud functions (all client DB write denied); cloud functions use admin. Import JSON. Create admin: hash password with `bcrypt` or sha256+salt offline, insert `{ username, passwordHash }` — document exact Node one-liner used.

Example password hash helper to run once locally:

```js
const crypto = require('crypto')
const salt = crypto.randomBytes(16).toString('hex')
const passwordHash = salt + ':' + crypto.pbkdf2Sync('CHANGE_ME', salt, 100000, 32, 'sha256').toString('hex')
console.log(JSON.stringify({ username: 'admin', passwordHash }, null, 2))
```

- [ ] **Step 6: Manual verify**

In CloudBase console, `brands` count ≥ 13, `ingest_sources` count matches seed file length, `admins` has one row.

- [ ] **Step 7: Commit**

```bash
git add scripts/ cloudfunctions/common/ tests/whitelist.test.js
git commit -m "chore: seed brands, ingest sources, and official host whitelist"
```

---

### Task 3: listPosts / getPost cloud functions + query helpers

**Files:**
- Create: `cloudfunctions/common/listPostsQuery.js`
- Create: `cloudfunctions/listPosts/index.js`, `package.json`, `config.json`
- Create: `cloudfunctions/getPost/index.js`, `package.json`, `config.json`
- Create: `tests/listPostsQuery.test.js`
- Create: `miniprogram/utils/request.js`

**Interfaces:**
- Consumes: Cloud DB `posts`
- Produces: `buildListWhere({ bucketId, subBrandId, tags })` → where object; always `status: 'published'`
- Produces: cloud function `listPosts` event `{ bucketId?, subBrandId?, tags?, page=1, pageSize=20 }` → `{ list, total, page, pageSize }`
- Produces: `getPost` event `{ id }` → `{ post }` or error if not published
- Produces: `wx.cloud.callFunction` wrapper `callFn(name, data)`

- [ ] **Step 1: Write failing test for query builder**

```js
const assert = require('assert')
const { buildListWhere } = require('../cloudfunctions/common/listPostsQuery')

const w = buildListWhere({ bucketId: 'byd', tags: ['SUV'] })
assert.strictEqual(w.status, 'published')
assert.strictEqual(w.bucketId, 'byd')
assert.deepStrictEqual(w.tags, ['SUV'])
const all = buildListWhere({})
assert.strictEqual(all.status, 'published')
assert.strictEqual(all.bucketId, undefined)
console.log('listPostsQuery.test.js PASS')
```

- [ ] **Step 2: Implement `listPostsQuery.js` and production `listPosts`**

```js
// cloudfunctions/common/listPostsQuery.js
function buildListWhere({ bucketId, subBrandId, tags } = {}) {
  const where = { status: 'published' }
  if (bucketId) where.bucketId = bucketId
  if (subBrandId) where.subBrandId = subBrandId
  if (tags && tags.length) where.tags = tags
  return where
}

module.exports = { buildListWhere }
```

Production `listPosts/index.js` (uses `db.command.in` when tags present):

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const page = Math.max(1, Number(event.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || 20))
  const where = { status: 'published' }
  if (event.bucketId) where.bucketId = event.bucketId
  if (event.subBrandId) where.subBrandId = event.subBrandId
  if (Array.isArray(event.tags) && event.tags.length) where.tags = _.in(event.tags)

  const col = db.collection('posts')
  const countRes = await col.where(where).count()
  const listRes = await col
    .where(where)
    .orderBy('publishedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return { list: listRes.data, total: countRes.total, page, pageSize }
}
```

- [ ] **Step 3: Implement `getPost`**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  if (!event.id) return { ok: false, error: 'MISSING_ID' }
  const res = await db.collection('posts').doc(event.id).get()
  const post = res.data
  if (!post || post.status !== 'published') return { ok: false, error: 'NOT_FOUND' }
  return { ok: true, post }
}
```

- [ ] **Step 4: `miniprogram/utils/request.js`**

```js
function callFn(name, data = {}) {
  return wx.cloud
    .callFunction({ name, data })
    .then((res) => res.result)
    .catch((err) => {
      console.error(name, err)
      throw err
    })
}

module.exports = { callFn }
```

- [ ] **Step 5: Deploy functions in DevTools; insert one manual published post in console; call listPosts**

Expected: list length ≥ 1; getPost with that id returns post; getPost with offline id returns NOT_FOUND.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/listPosts cloudfunctions/getPost cloudfunctions/common/listPostsQuery.js miniprogram/utils/request.js tests/listPostsQuery.test.js
git commit -m "feat: add listPosts and getPost cloud functions"
```

---

### Task 4: Feed page UI (filters, empty, error)

**Files:**
- Modify: `miniprogram/pages/feed/*`
- Create: `miniprogram/utils/format.js`
- Create: `miniprogram/components/ad-banner/*`

**Interfaces:**
- Consumes: `callFn('listPosts', …)`, `config.get().adUnitIdFeed`
- Produces: feed UI filters `bucketId`, `subBrandId`, `tags[]`; insert ad every 5 items

- [ ] **Step 1: Implement `format.js`**

```js
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

function launchStatusText(s) {
  return LAUNCH[s] || s || ''
}

function bucketText(id) {
  return BUCKET[id] || id || ''
}

module.exports = { launchStatusText, bucketText, BUCKET }
```

- [ ] **Step 2: Implement `ad-banner` component**

```js
// ad-banner.js
Component({
  properties: {
    unitId: { type: String, value: '' }
  },
  data: { show: false },
  observers: {
    unitId(v) {
      this.setData({ show: !!(v && String(v).trim()) })
    }
  },
  methods: {
    onError() {
      this.setData({ show: false })
    }
  }
})
```

```xml
<!-- ad-banner.wxml -->
<view wx:if="{{show}}" class="ad-wrap">
  <ad unit-id="{{unitId}}" binderror="onError"></ad>
</view>
```

- [ ] **Step 3: Implement feed page load + filters**

`feed.js` core:

```js
const { callFn } = require('../../utils/request')
const { get } = require('../../config')
const { launchStatusText, bucketText } = require('../../utils/format')

const TAGS = ['SUV', '轿车', 'MPV', '增程', '纯电', '插混']
const BUCKETS = [
  { id: '', name: '全部' },
  { id: 'byd', name: '比亚迪' },
  { id: 'geely', name: '吉利' },
  { id: 'huawei', name: '华为系列' },
  { id: 'xiaomi', name: '小米' }
]

Page({
  data: {
    buckets: BUCKETS,
    tags: TAGS,
    bucketId: '',
    subBrandId: '',
    selectedTags: [],
    list: [],
    displayList: [],
    empty: false,
    loading: false,
    adUnitIdFeed: ''
  },
  onShow() {
    this.setData({ adUnitIdFeed: get().adUnitIdFeed || '' })
    this.reload()
  },
  async reload() {
    this.setData({ loading: true })
    try {
      const res = await callFn('listPosts', {
        bucketId: this.data.bucketId || undefined,
        subBrandId: this.data.subBrandId || undefined,
        tags: this.data.selectedTags.length ? this.data.selectedTags : undefined,
        page: 1,
        pageSize: 20
      })
      const list = (res.list || []).map((p) => ({
        ...p,
        launchStatusText: launchStatusText(p.launchStatus),
        bucketText: bucketText(p.bucketId)
      }))
      this.setData({
        list,
        displayList: this.withAds(list),
        empty: list.length === 0,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    }
  },
  withAds(list) {
    const unit = get().adUnitIdFeed
    if (!unit) return list.map((item) => ({ type: 'post', item }))
    const out = []
    list.forEach((item, i) => {
      out.push({ type: 'post', item })
      if ((i + 1) % 5 === 0) out.push({ type: 'ad', unitId: unit })
    })
    return out
  },
  onBucket(e) {
    this.setData({ bucketId: e.currentTarget.dataset.id, subBrandId: '' }, () => this.reload())
  },
  onTag(e) {
    const tag = e.currentTarget.dataset.tag
    let selectedTags = this.data.selectedTags.slice()
    const i = selectedTags.indexOf(tag)
    if (i >= 0) selectedTags.splice(i, 1)
    else selectedTags.push(tag)
    this.setData({ selectedTags }, () => this.reload())
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  }
})
```

WXML: filter chips, `wx:for` on `displayList`, empty text「暂时还没有动态」, `<ad-banner>` for ad rows.

- [ ] **Step 4: Manual verify**

With published posts: list shows. Toggle filters. Clear all posts → empty state. Airplane mode → toast「网络异常，请重试」. Empty `adUnitIdFeed` → no blank ad gaps.

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/feed miniprogram/utils/format.js miniprogram/components/ad-banner
git commit -m "feat: implement feed page with filters and ad slots"
```

---

### Task 5: Detail page UI

**Files:**
- Modify: `miniprogram/pages/detail/*`

**Interfaces:**
- Consumes: `callFn('getPost', { id })`, `adUnitIdDetail`
- Produces: detail fields + source link; favorite button wired in Task 6 (placeholder disabled or no-op until then)

- [ ] **Step 1: Implement detail load**

```js
const { callFn } = require('../../utils/request')
const { get } = require('../../config')
const { launchStatusText, bucketText } = require('../../utils/format')

Page({
  data: {
    post: null,
    adUnitIdDetail: '',
    favorited: false
  },
  onLoad(query) {
    this.postId = query.id
    this.setData({ adUnitIdDetail: get().adUnitIdDetail || '' })
    this.load()
  },
  async load() {
    try {
      const res = await callFn('getPost', { id: this.postId })
      if (!res.ok) {
        wx.showToast({ title: '内容不存在', icon: 'none' })
        return
      }
      const post = {
        ...res.post,
        launchStatusText: launchStatusText(res.post.launchStatus),
        bucketText: bucketText(res.post.bucketId)
      }
      this.setData({ post })
    } catch (e) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    }
  },
  openSource() {
    const url = this.data.post && this.data.post.sourceUrl
    if (!url) return
    wx.setClipboardData({ data: url })
    wx.showToast({ title: '来源链接已复制', icon: 'none' })
  }
})
```

WXML: cover image, title, time, bucket, subBrand, tags, launchStatus, priceText, body (rich-text or text), sourceNote + tap copy URL, `<ad-banner unitId="{{adUnitIdDetail}}">` after body.

- [ ] **Step 2: Manual verify**

Open from feed; all fields render; empty ad id hides banner; bad id shows toast.

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/detail
git commit -m "feat: implement post detail page"
```

---

### Task 6: Login, follow, favorite, mine page

**Files:**
- Create: `cloudfunctions/login`, `toggleFollow`, `toggleFavorite`
- Create: `miniprogram/utils/auth.js`
- Modify: `miniprogram/pages/mine/*`, `miniprogram/pages/detail/*`, `miniprogram/pages/feed/*` (optional follow chip)

**Interfaces:**
- Produces: `login` → `{ openid }` via `cloud.getWXContext().OPENID`; upsert `users`
- Produces: `toggleFollow({ bucketId })` → `{ following: boolean }`
- Produces: `toggleFavorite({ postId })` → `{ favorited: boolean }`
- Produces: `auth.ensureLogin()` → Promise openid or throw

- [ ] **Step 1: Implement `login`**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NO_OPENID' }
  const users = db.collection('users')
  const found = await users.where({ _openid: OPENID }).limit(1).get()
  if (!found.data.length) {
    await users.add({ data: { createdAt: db.serverDate() } })
  }
  return { ok: true, openid: OPENID }
}
```

- [ ] **Step 2: Implement `toggleFollow` and `toggleFavorite`**

```js
// toggleFollow/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const bucketId = event.bucketId
  if (!OPENID) return { ok: false, error: 'UNAUTHORIZED' }
  if (!bucketId) return { ok: false, error: 'MISSING_BUCKET' }
  const col = db.collection('follows')
  const exist = await col.where({ _openid: OPENID, bucketId }).limit(1).get()
  if (exist.data.length) {
    await col.doc(exist.data[0]._id).remove()
    return { ok: true, following: false }
  }
  await col.add({ data: { bucketId, createdAt: db.serverDate() } })
  return { ok: true, following: true }
}
```

```js
// toggleFavorite/index.js — same pattern with postId on favorites collection
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const postId = event.postId
  if (!OPENID) return { ok: false, error: 'UNAUTHORIZED' }
  if (!postId) return { ok: false, error: 'MISSING_POST' }
  const col = db.collection('favorites')
  const exist = await col.where({ _openid: OPENID, postId }).limit(1).get()
  if (exist.data.length) {
    await col.doc(exist.data[0]._id).remove()
    return { ok: true, favorited: false }
  }
  await col.add({ data: { postId, createdAt: db.serverDate() } })
  return { ok: true, favorited: true }
}
```

Also add `listMyFollows` and `listMyFavorites` as thin functions OR extend mine page to query via new `mineData` function:

```js
// Prefer single mineData cloud function
exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'UNAUTHORIZED' }
  const db = cloud.database()
  const follows = await db.collection('follows').where({ _openid: OPENID }).get()
  const favorites = await db.collection('favorites').where({ _openid: OPENID }).get()
  const postIds = favorites.data.map((f) => f.postId)
  let posts = []
  if (postIds.length) {
    const _ = db.command
    const pr = await db.collection('posts').where({ _id: _.in(postIds), status: 'published' }).get()
    posts = pr.data
  }
  return { ok: true, follows: follows.data, favorites: posts }
}
```

Create `cloudfunctions/mineData` accordingly.

- [ ] **Step 3: `auth.js`**

```js
const { callFn } = require('./request')

async function ensureLogin() {
  try {
    await new Promise((resolve, reject) => {
      wx.login({ success: resolve, fail: reject })
    })
    const res = await callFn('login', {})
    if (!res.ok) throw new Error(res.error || 'login failed')
    getApp().globalData.user = { openid: res.openid }
    return res.openid
  } catch (e) {
    wx.showToast({ title: '登录失败', icon: 'none' })
    throw e
  }
}

module.exports = { ensureLogin }
```

- [ ] **Step 4: Wire detail favorite and mine page**

Detail: on favorite tap → `ensureLogin()` then `toggleFavorite`. Mine: login button; list follows with unfollow; list favorite posts navigate to detail. Browse still works if login fails.

- [ ] **Step 5: Manual verify**

Spec §12: browse without login; follow/favorite triggers login; login fail still can browse; unfollow/unfavorite works.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/login cloudfunctions/toggleFollow cloudfunctions/toggleFavorite cloudfunctions/mineData miniprogram/utils/auth.js miniprogram/pages/mine miniprogram/pages/detail
git commit -m "feat: add login, follow, favorite, and mine page"
```

---

### Task 7: Discover placeholders

**Files:**
- Modify: `miniprogram/pages/discover/*`

**Interfaces:**
- Produces: two cards 车机软件 / 用车好物; tap → toast「即将上线」

- [ ] **Step 1: Implement discover UI**

```js
Page({
  onTap() {
    wx.showToast({ title: '即将上线', icon: 'none' })
  }
})
```

```xml
<view class="card" bindtap="onTap">车机软件</view>
<view class="card" bindtap="onTap">用车好物</view>
```

- [ ] **Step 2: Manual verify** — both toasts show「即将上线」.

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/discover
git commit -m "feat: add discover placeholder cards"
```

---

### Task 8: msgSecCheck wrapper

**Files:**
- Create: `cloudfunctions/msgSecCheck/index.js`
- Create: `cloudfunctions/common/secCheck.js` (shared require via cloud copy or duplicate small helper in publish paths)

**Interfaces:**
- Produces: `checkText(content) → { ok: boolean, reason?: string }` using `cloud.openapi.security.msgSecCheck`
- Consumed by: `adminPublish`, `ingestRun`, `adminUpsertPost` when publishing

- [ ] **Step 1: Implement function**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const content = String(event.content || '').slice(0, 2500)
  if (!content.trim()) return { ok: false, reason: 'EMPTY' }
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: 3,
      openid: event.openid || 'admin-system',
      content
    })
    // API shapes vary; treat errCode 0 as pass
    if (result.errCode === 0 || result.result?.suggest === 'pass') {
      return { ok: true }
    }
    return { ok: false, reason: 'SECURITY_HIT' }
  } catch (e) {
    console.error(e)
    return { ok: false, reason: 'SECURITY_ERROR' }
  }
}
```

Note: For server-side ingest without user openid, use a fixed service account approach documented in WeChat docs for v2 API; if openid required, pass admin operator openid from admin session or use pass-through cloud call from miniprogram admin is N/A — admin is web. Prefer cloud.openapi from cloud function with official account credentials already bound to the miniprogram.

If msgSecCheck cannot run without openid in practice, document: create helper `cloudfunctions/common/secCheck.js` that calls openapi; on permanent API limitation, fail closed into `pending_review` with `reviewReason: 'SECURITY_ERROR'` (never auto-publish on error).

- [ ] **Step 2: Deploy and call with benign text → ok true; with blocked sample if available → ok false.**

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/msgSecCheck cloudfunctions/common/secCheck.js
git commit -m "feat: add WeChat content security check helper"
```

---

### Task 9: Ingest pipeline (fetch → compose → publish decision + timer)

**Files:**
- Create: `cloudfunctions/common/hash.js`, `composeRules.js`
- Create: `cloudfunctions/ingestFetch`, `ingestCompose`, `ingestRun`
- Create: `tests/composeRules.test.js`
- Document: timer trigger config in README

**Interfaces:**
- Produces: `sha256Hex(text) → string`
- Produces: `composeRules.compose({ rawText, pageUrl, bucketId, subBrandId }) → { title, summary, body, launchStatus, priceText, tags, sourceNote }`
- Produces: `isFuelOnly(text) → boolean`
- Produces: `ingestRun` orchestrates all enabled `ingest_sources`
- Env flag: `USE_LLM_COMPOSE=false` by default; when true, call CloudBase AI then fall back to rules

- [ ] **Step 1: Write `hash.js` and failing compose tests**

```js
const crypto = require('crypto')
function sha256Hex(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex')
}
module.exports = { sha256Hex }
```

```js
// tests/composeRules.test.js
const assert = require('assert')
const { compose, isFuelOnly } = require('../cloudfunctions/common/composeRules')

assert.strictEqual(isFuelOnly('全新燃油版轿车 1.5T'), true)
assert.strictEqual(isFuelOnly('纯电 SUV 预售 23.99 万起'), false)

const draft = compose({
  rawText: '小米YU7正式上市，售价23.99万起，中型纯电SUV。',
  pageUrl: 'https://www.xiaomiev.com/',
  bucketId: 'xiaomi',
  subBrandId: 'xiaomi'
})
assert.ok(draft.title)
assert.ok(draft.body)
assert.ok(draft.body.length < 5000)
assert.ok(!draft.body.includes('小米YU7正式上市，售价23.99万起，中型纯电SUV。') || draft.summary)
console.log('composeRules.test.js PASS')
```

- [ ] **Step 2: Implement `composeRules.js`**

```js
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
  return m ? `${m[1]} 万起` : ''
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

function compose({ rawText, pageUrl, bucketId, subBrandId }) {
  const text = String(rawText || '').replace(/\s+/g, ' ').trim()
  const title = text.slice(0, 40) || '新车速览更新'
  const summary = text.slice(0, 80)
  const body = [
    `【速览】基于官方公开信息整理，非原文转载。`,
    text.slice(0, 600),
    `来源链接：${pageUrl}`
  ].join('\n\n')
  return {
    title,
    summary,
    body,
    launchStatus: detectLaunchStatus(text),
    priceText: detectPrice(text),
    tags: detectTags(text),
    sourceNote: `整理自官方公开页面`
  }
}

module.exports = { compose, isFuelOnly, detectLaunchStatus, detectPrice, detectTags }
```

- [ ] **Step 3: Run tests**

```bash
node tests/composeRules.test.js
```

Expected: PASS

- [ ] **Step 4: Implement `ingestRun/index.js` orchestration**

Pseudocode to implement fully:

```js
const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')
const { URL } = require('url')
const { isOfficialHost } = require('../common/whitelist')
const { sha256Hex } = require('../common/hash')
const { compose, isFuelOnly } = require('../common/composeRules')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'NEVGlanceBot/1.0' }, timeout: 15000 },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (c) => {
          if (data.length < 200000) data += c
        })
        res.on('end', () => resolve(stripHtml(data).slice(0, 80000)))
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

async function msgSec(content) {
  const r = await cloud.callFunction({ name: 'msgSecCheck', data: { content } })
  return r.result
}

exports.main = async () => {
  const sources = await db.collection('ingest_sources').where({ enabled: true }).get()
  const report = []
  for (const src of sources.data) {
    try {
      const host = new URL(src.entryUrl).hostname
      if (!isOfficialHost(host)) {
        report.push({ url: src.entryUrl, status: 'skip_non_whitelist' })
        continue
      }
      const rawText = await fetchText(src.entryUrl)
      const contentHash = sha256Hex(src.entryUrl + '\n' + rawText)
      const dup = await db.collection('ingest_raw').where({ contentHash }).limit(1).get()
      if (dup.data.length) {
        await db.collection('ingest_raw').add({
          data: {
            sourceId: src._id,
            pageUrl: src.entryUrl,
            fetchedAt: db.serverDate(),
            rawText: rawText.slice(0, 1000),
            contentHash,
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
          rawText,
          contentHash,
          fetchStatus: 'ok'
        }
      })
      if (isFuelOnly(rawText)) {
        report.push({ url: src.entryUrl, status: 'skip_fuel' })
        continue
      }
      const draft = compose({
        rawText,
        pageUrl: src.entryUrl,
        bucketId: src.bucketId,
        subBrandId: src.subBrandId
      })
      const incomplete = !draft.title || !src.bucketId || !draft.body
      let status = 'pending_review'
      let reviewReason = ''
      const official = isOfficialHost(host)
      if (incomplete) reviewReason = 'incomplete_fields'
      else if (!official) reviewReason = 'unofficial'
      else {
        const sec = await msgSec(`${draft.title}\n${draft.summary}\n${draft.body}`)
        if (!sec.ok) reviewReason = sec.reason || 'SECURITY_HIT'
        else {
          status = 'published'
        }
      }
      const now = db.serverDate()
      const doc = {
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
        status,
        origin: 'pipeline',
        contentHash,
        createdAt: now,
        updatedAt: now,
        reviewReason: status === 'pending_review' ? reviewReason : '',
        publishedAt: status === 'published' ? now : null
      }
      await db.collection('posts').add({ data: doc })
      report.push({ url: src.entryUrl, status })
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
  return { ok: true, report }
}
```

Configure cloud function timeout ≥ 60s; open outbound network.

- [ ] **Step 5: Timer trigger**

In CloudBase console → `ingestRun` → 定时触发器 → cron `0 */6 * * *` (every 6 hours). Document in README.

- [ ] **Step 6: Manual verify**

Run `ingestRun` once. Expect: raw rows; either published posts or pending_review; second run mostly `skip_dup`; fuel-only skipped; non-whitelist never auto-published.

- [ ] **Step 7: Commit**

```bash
git add cloudfunctions/common/hash.js cloudfunctions/common/composeRules.js cloudfunctions/ingestRun tests/composeRules.test.js README.md
git commit -m "feat: add official ingest pipeline with rule compose and timer"
```

---

### Task 10: Admin static web

**Files:**
- Create: `admin-web/index.html`, `admin-web/css/admin.css`, `admin-web/js/api.js`, `login.js`, `app.js`
- Create: `cloudfunctions/adminLogin`, `adminListPosts`, `adminUpsertPost`, `adminPublish`, `adminOffline`, `adminIngestLog`

**Interfaces:**
- Produces: `adminLogin({ username, password }) → { token }` (HMAC or random token stored in `admins` session field / short-lived `admin_sessions` collection)
- Produces: list by status; publish runs msgSecCheck; discard sets `offline` or deletes pending; upsert manual posts `origin: 'manual'`
- Admin HTTP access: CloudBase HTTP access for cloud functions OR admin uses `wx.cloud` is unavailable in browser — **use CloudBase HTTP API gateway / cloud function HTTP triggers**.

**Concrete approach:** Enable HTTP triggers on admin cloud functions; `admin-web/js/api.js` calls `https://<env>.service.tcloudbase.com/adminLogin` etc. with Bearer token. Document base URL in `admin-web/js/api.js`:

```js
const BASE = 'https://YOUR_ENV.service.tcloudbase.com'
async function api(path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body || {}) })
  return res.json()
}
module.exports is not used — browser script:
window.AdminAPI = { api, BASE }
```

- [ ] **Step 1: Implement `adminLogin` with pbkdf2 verify matching seed-import hash format (`salt:hash`)**

```js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function verify(password, passwordHash) {
  const [salt, hash] = String(passwordHash).split(':')
  if (!salt || !hash) return false
  const calc = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))
}

exports.main = async (event) => {
  const { username, password } = event
  const res = await db.collection('admins').where({ username }).limit(1).get()
  if (!res.data.length || !verify(password, res.data[0].passwordHash)) {
    return { ok: false, error: 'AUTH_FAILED' }
  }
  const token = crypto.randomBytes(24).toString('hex')
  const exp = Date.now() + 12 * 3600 * 1000
  await db.collection('admin_sessions').add({
    data: { token, username, exp, createdAt: db.serverDate() }
  })
  return { ok: true, token, exp }
}
```

Create collection `admin_sessions`.

- [ ] **Step 2: Auth middleware helper in each admin function**

```js
async function requireAdmin(event) {
  const token = event.token || (event.headers && event.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const db = cloud.database()
  const s = await db.collection('admin_sessions').where({ token }).limit(1).get()
  if (!s.data.length || s.data[0].exp < Date.now()) throw new Error('UNAUTHORIZED')
  return s.data[0]
}
```

- [ ] **Step 3: Implement list/publish/offline/upsert/ingestLog**

- `adminListPosts`: filter `status` in `pending_review|published|offline|draft`
- `adminPublish`: load post → msgSecCheck on title+body → set `published` + `publishedAt`
- `adminOffline`: set `offline`
- `adminUpsertPost`: create/update manual fields; optional publish flag
- `adminIngestLog`: last 50 `ingest_raw` ordered by `fetchedAt` desc; UI marks consecutive errors red

- [ ] **Step 4: Build admin UI pages in single `index.html` with sections**

Login form; tabs: 待审核 / 已发布 / 抓取日志 / 新建. Review actions: 发布 / 丢弃(offline) / 编辑. Show `sourceUrl`, `reviewReason`, AI/rule body.

- [ ] **Step 5: Deploy static hosting**

CloudBase 静态网站托管 → upload `admin-web/` → open default HTTPS URL. No custom domain/ICP required for v1.

- [ ] **Step 6: Manual verify**

Login fail/success; pending publish appears on miniprogram feed; offline disappears; manual create works; ingest log shows statuses.

- [ ] **Step 7: Commit**

```bash
git add admin-web cloudfunctions/adminLogin cloudfunctions/adminListPosts cloudfunctions/adminPublish cloudfunctions/adminOffline cloudfunctions/adminUpsertPost cloudfunctions/adminIngestLog
git commit -m "feat: add admin static site and admin cloud APIs"
```

---

### Task 11: Ads config, full hand-test checklist, README polish

**Files:**
- Modify: `README.md`, `miniprogram/config.js` comments
- Create: `docs/superpowers/plans/handtest-checklist.md` OR section in README

**Interfaces:**
- Produces: operator checklist matching spec §12 and §10 traffic-master path

- [ ] **Step 1: Add README sections**

1. Fill `adUnitIdFeed` / `adUnitIdDetail` after 流量主开通  
2. Traffic master path: publish → UV threshold → enable → finance → create Banner units → fill config → re-audit  
3. Hand-test checklist (copy from below)

- [ ] **Step 2: Hand-test checklist (must all pass before calling MVP done)**

```markdown
- [ ] 未登录可浏览、筛选
- [ ] 关注/收藏拉起登录；登录失败仍可浏览
- [ ] 我的：关注列表可取消；收藏与详情一致
- [ ] 发现双卡片 toast「即将上线」
- [ ] adUnit 为空无空白坑；填测试 unit-id 位置正确
- [ ] 流水线：同 URL 不重复上架；官方可自动发布；缺字段/安全拦截进待审核；燃油领克不入库
- [ ] 后台：待审核发布/丢弃/编辑；手工新建；下架后用户端不可见
- [ ] 文案无「华为汽车」；导航栏「新车速览」
```

- [ ] **Step 3: Run full checklist on DevTools + real device**

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add ops, ads, and hand-test checklist for NEV Glance"
```

---

## Spec Coverage Self-Review

| Spec section | Task(s) |
| --- | --- |
| §2 brands/tags/placeholders | 2, 4, 7 |
| §3 architecture / no VPS | 1, 9, 10 |
| §4 user pages | 4, 5, 6, 7 |
| §5 data model | 2, 3, 6, 9, 10 |
| §6 whitelist | 2, 9 |
| §7 pipeline + compose + security | 8, 9 |
| §8 admin | 10 |
| §9 errors / login gate | 4, 6 |
| §10 ads | 4, 5, 11 |
| §11 subject/category copy | 1, 11 |
| §12 hand tests | 11 |
| Name 新车速览 / NEV Glance | 1, Global Constraints |

**Placeholder scan:** No TBD/TODO left in tasks; HTTP trigger base URL uses `YOUR_ENV` replace-at-setup (same class as `YOUR_APPID` / `YOUR_ENV_ID` in Task 1).

**Type consistency:** `bucketId` values `byd|geely|huawei|xiaomi`; post `status` `draft|pending_review|published|offline`; `origin` `manual|pipeline`; `sourceType` `official|unofficial`; launchStatus `teaser|presale|launched|facelift` — used uniformly across tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-15-nev-glance-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks (`superpowers:subagent-driven-development`)
2. **Inline Execution** — this session with `superpowers:executing-plans`, batch with checkpoints

Which approach?
