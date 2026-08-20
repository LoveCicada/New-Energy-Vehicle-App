# 看Car 车型手册 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把看Car 动态/详情/发现改成「一款车一张纵向大封面卡」的选车手册，数据与封面全部打进小程序包。

**Architecture:** 车型数组仍从 `miniprogram/utils/posts-data.js` 用 `require` 加载；`listPosts` 按 `bucketId` + 单个 `powerTag`（对 `powerTags` 做 OR）过滤。发现页把筛选意图写入 `wx.setStorageSync('kancar_feed_intent')` 再 `switchTab` 到动态。封面为 `miniprogram/assets/models/*.png`，裂图时卡片色块兜底。

**Tech Stack:** 原生微信小程序（WXML/WXSS/JS）、本地 `posts-data.js`、Node `assert` 测试。不引入 npm UI 库、不调用 `wx.request` / `wx.cloud`。

## Global Constraints

- 产品名「看Car」；文案禁止「华为汽车」；鸿蒙智行称「华为系列」或子品牌名。
- 第一版不使用云开发；列表/详情只读 `utils/posts.js`。
- 关注/收藏只走 `utils/storage.js` 本机存储。
- 动态筛选只有品牌桶 + 动力（纯电/插混/增程），不要 SUV/轿车多选 chips。
- 列表卡片形态为纵向大封面，不要左图右文。
- 发现页不要「车机软件/用车好物/即将上线」。
- 不用未授权官网实拍图；封面用示意色块图或自绘/生成图。
- `scripts/fetch-preview-data.js` 本轮不接入手册数据。
- 提交只 `git commit` 到本地，除非用户明确要求 `git push`。
- 每个任务的 Requirements 都隐含本节。

---

## File map

| File | Role |
| --- | --- |
| `tests/listModels.test.js` | Node 断言：`listPosts` 品牌/动力过滤、`getPost` |
| `miniprogram/utils/posts-data.js` | 15 条车型记录（唯一数据源） |
| `miniprogram/utils/posts.js` | `listPosts({ bucketId, powerTag })`、`decorate` 增加 `powerText`/`bodyType` |
| `miniprogram/utils/storage.js` | `setFeedIntent` / `consumeFeedIntent` |
| `miniprogram/assets/models/*.png` | 每车一张封面，81 以外的大图约 750×420 |
| `miniprogram/pages/feed/feed.js/.wxml/.wxss` | 两行筛选 + 纵向封面卡 + 读 intent |
| `miniprogram/pages/detail/detail.js/.wxml/.wxss` | 手册详情（要点、三栏） |
| `miniprogram/pages/discover/discover.js/.wxml/.wxss` | 动力/品牌目录 |
| `miniprogram/pages/mine/mine.wxml/.wxss` | 收藏缩略图 + 价 |
| `miniprogram/data/posts.json` | 与 `posts-data.js` 同步一份，避免旧 JSON 误导 |

---

### Task 1: 车型过滤的 Node 测试

**Files:**
- Create: `tests/listModels.test.js`
- Modify: `miniprogram/utils/posts.js`（Task 2 才会让测试全绿；本任务先写测试并确认失败点）
- Test: `tests/listModels.test.js`

**Interfaces:**
- Consumes: 无（测试描述目标 API）
- Produces: 测试约定 `listPosts({ bucketId?: string, powerTag?: string })` 返回带 `id`、`powerTags` 的数组；`getPost(id)` 返回单条或 `null`

- [ ] **Step 1: Write the failing test**

Create `tests/listModels.test.js`:

```javascript
const assert = require('assert')
const { listPosts, getPost } = require('../miniprogram/utils/posts')

const all = listPosts()
assert.ok(all.length >= 12, 'expected at least 12 published models, got ' + all.length)

const ids = all.map(function (p) { return p.id })
assert.ok(ids.indexOf('model_byd_han') >= 0)
assert.ok(ids.indexOf('model_xiaomi_su7') >= 0)

const byd = listPosts({ bucketId: 'byd' })
assert.strictEqual(byd.length, 5)
byd.forEach(function (p) {
  assert.strictEqual(p.bucketId, 'byd')
})

const range = listPosts({ powerTag: '增程' })
assert.ok(range.length >= 3)
range.forEach(function (p) {
  assert.ok((p.powerTags || []).indexOf('增程') >= 0)
})

const bydRange = listPosts({ bucketId: 'byd', powerTag: '增程' })
assert.ok(bydRange.length >= 1)
assert.ok(bydRange.some(function (p) { return p.id === 'model_byd_xia' }))

const han = getPost('model_byd_han')
assert.ok(han)
assert.strictEqual(han.modelName, '汉')
assert.ok(Array.isArray(han.bullets) && han.bullets.length === 3)
assert.ok(han.title.indexOf('华为汽车') < 0)

assert.strictEqual(getPost('missing'), null)

const blob = JSON.stringify(all)
assert.ok(blob.indexOf('华为汽车') < 0)

console.log('listModels.test.js PASS')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/listModels.test.js`

Expected: FAIL（当前数据没有 `model_byd_han` / `powerTags`，或条数对不上）

- [ ] **Step 3: Commit the test only**

```bash
git add tests/listModels.test.js
git commit -m "test: add listPosts model-catalog assertions"
```

---

### Task 2: 15 条车型数据 + `listPosts` 动力过滤

**Files:**
- Modify: `miniprogram/utils/posts-data.js`（整文件替换）
- Modify: `miniprogram/utils/posts.js`
- Modify: `miniprogram/data/posts.json`（与 JS 数组 JSON.stringify 同步）
- Test: `tests/listModels.test.js`

**Interfaces:**
- Consumes: Task 1 测试约定
- Produces: `listPosts(opts)`：`opts.bucketId`、`opts.powerTag`；每条含 `id, bucketId, subBrandId, subBrandName, modelName, title, cover, priceText, launchStatus, powerTags, bodyType, tags, bullets, sourceUrl, sourceNote, status, publishedAt`；`decorate` 增加 `launchStatusText, bucketText, subBrandText, powerText`

- [ ] **Step 1: Replace `posts-data.js` with this module**

`module.exports` 为下面 15 个对象构成的数组（封面路径先写上，图在 Task 3 补文件）。`cover` 一律 `/assets/models/<file>.png`。

| id | bucketId | subBrandId | title | powerTags | bodyType | priceText | cover file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| model_byd_han | byd | byd | 比亚迪 汉 | 插混, 纯电 | 轿车 | 指导价约 20.98 万起 | han.png |
| model_byd_xia | byd | byd | 比亚迪 夏 | 增程 | MPV | 指导价约 17.98 万起 | xia.png |
| model_denza_d9 | byd | denza | 腾势 D9 | 插混, 纯电 | MPV | 指导价约 33.98 万起 | d9.png |
| model_yangwang_u8 | byd | yangwang | 仰望 U8 | 纯电 | SUV | 指导价约 109.80 万起 | u8.png |
| model_fcb_leopard5 | byd | fangchengbao | 方程豹 豹5 | 增程 | SUV | 指导价约 23.98 万起 | leopard5.png |
| model_geely_galaxy | geely | geely | 吉利银河 | 插混, 纯电 | 轿车 | 指导价以官网为准 | galaxy.png |
| model_lynkco_08 | geely | lynkco | 领克 08 | 插混 | SUV | 指导价约 15.58 万起 | lynkco08.png |
| model_zeekr_007 | geely | zeekr | 极氪 007 | 纯电 | 轿车 | 指导价约 20.99 万起 | zeekr007.png |
| model_aito_m9 | huawei | aito | 问界 M9 | 增程, 纯电 | SUV | 指导价约 46.98 万起 | m9.png |
| model_zhijie_r7 | huawei | zhijie | 智界 R7 | 纯电 | SUV | 指导价约 24.98 万起 | r7.png |
| model_xiangjie_s9 | huawei | xiangjie | 享界 S9 | 纯电 | 轿车 | 指导价约 39.98 万起 | s9.png |
| model_zunjie_s800 | huawei | zunjie | 尊界 S800 | 纯电 | 轿车 | 指导价以官网为准 | s800.png |
| model_shangjie_h5 | huawei | shangjie | 尚界 H5 | 增程, 纯电 | SUV | 指导价以官网为准 | h5.png |
| model_xiaomi_su7 | xiaomi | xiaomi | 小米 SU7 | 纯电 | 轿车 | 售价以官网为准 | su7.png |
| model_xiaomi_yu7 | xiaomi | xiaomi | 小米 YU7 | 纯电 | SUV | 售价以官网为准 | yu7.png |

每条还必须有：

- `modelName`：汉 / 夏 / D9 / U8 / 豹5 / 银河 / 08 / 007 / M9 / R7 / S9 / S800 / H5 / SU7 / YU7
- `launchStatus`：在售用 `launched`；尊界 S800、尚界 H5、YU7 用 `presale`
- `tags`：`powerTags.concat([bodyType])`
- `bullets`：恰好 3 句，基于官方公开信息改写，不出现「华为汽车」
- `sourceNote`: `整理自官方公开页面，价格以官网为准`
- `sourceUrl`: 沿用现有品牌官网（汉/夏→`https://www.byd.com/cn`，D9→denza.com，U8→yangwangauto.com，豹5→fangchengbao.com，银河→`https://dh.geely.com/Home`，08→lynkco.com.cn，007→zeekrlife.com，问界/智界/享界/尊界/尚界→对应 hima.auto 路径，小米→xiaomiev.com）
- `status`: `published`
- `publishedAt`: `2026-08-20T12:00:00.000Z` 起每条减 1 分钟，保证排序稳定

汉的 `bullets` 示例：

```javascript
[
  '王朝系列中型轿车，官网提供 EV 与 DM-i 等版本。',
  '关注改款与指导价时以比亚迪车型页为准。',
  '本页为公开信息速览，不转载全文。'
]
```

其余车型同样 3 句结构：定位 + 动力/空间 + 以官网为准。

- [ ] **Step 2: Change `listPosts` filter in `miniprogram/utils/posts.js`**

Replace the `tags` / `subBrandId` feed-facing filter with `powerTag`（保留 `subBrandId` 过滤以备后用，动态页不再传入）：

```javascript
function decorate(p) {
  return Object.assign({}, p, {
    _id: p.id || p._id,
    launchStatusText: launchStatusText(p.launchStatus),
    bucketText: bucketText(p.bucketId),
    subBrandText: SUB_BRANDS[p.subBrandId] || p.subBrandName || p.subBrandId || '',
    powerText: (p.powerTags || []).join(' / '),
    bodyType: p.bodyType || ''
  })
}

function listPosts(opts) {
  opts = opts || {}
  let list = published()
  if (opts.bucketId) {
    list = list.filter(function (p) {
      return p.bucketId === opts.bucketId
    })
  }
  if (opts.subBrandId) {
    list = list.filter(function (p) {
      return p.subBrandId === opts.subBrandId
    })
  }
  if (opts.powerTag) {
    list = list.filter(function (p) {
      return (p.powerTags || []).indexOf(opts.powerTag) >= 0
    })
  }
  list = list.slice().sort(function (a, b) {
    return String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))
  })
  const page = opts.page || 1
  const pageSize = opts.pageSize || 50
  const start = (page - 1) * pageSize
  return list.slice(start, start + pageSize).map(decorate)
}
```

删除对 `opts.tags` 的依赖。

- [ ] **Step 3: Sync JSON**

Run:

```bash
node -e "const p=require('./miniprogram/utils/posts-data.js'); require('fs').writeFileSync('miniprogram/data/posts.json', JSON.stringify(p,null,2)); console.log(p.length)"
```

Expected: `15`

- [ ] **Step 4: Run tests**

Run: `node tests/listModels.test.js`

Expected: `listModels.test.js PASS`

Also run: `node tests/whitelist.test.js`（不应被本任务破坏）

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/posts-data.js miniprogram/utils/posts.js miniprogram/data/posts.json tests/listModels.test.js
git commit -m "feat: replace feed data with 15 local model records"
```

---

### Task 3: 本地封面图（色块示意，可进包）

**Files:**
- Create: `miniprogram/assets/models/han.png` 等 15 个文件（文件名与 Task 2 的 `cover` 一致）
- Create: `scripts/make-model-covers.js`（一次性用 Node 写最小 PNG 亦可；Windows 可用 PowerShell System.Drawing）

**Interfaces:**
- Consumes: Task 2 的 `cover` 路径 `/assets/models/<name>.png`
- Produces: 15 张约 750×420、带车名文字的 PNG，单张尽量 &lt; 80KB

- [ ] **Step 1: Generate 15 PNGs**

在 `E:\code\AI\WeChatAppp\miniprogram\assets\models\` 为每个文件画：横向渐变（不同色相区分品牌）+ 居中白字车名（如「HAN」）。不要用官网实拍。PowerShell 示例（对每个 name/hex/label 调一次）：

```powershell
Add-Type -AssemblyName System.Drawing
$dir = 'E:\code\AI\WeChatAppp\miniprogram\assets\models'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
function Save-Cover($file, $hex, $label) {
  $bmp = New-Object System.Drawing.Bitmap 750, 420, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $c = [System.Drawing.ColorTranslator]::FromHtml($hex)
  $g.Clear($c)
  $font = New-Object System.Drawing.Font 'Segoe UI', 36, [System.Drawing.FontStyle]::Bold
  $brush = [System.Drawing.Brushes]::White
  $sz = $g.MeasureString($label, $font)
  $g.DrawString($label, $font, $brush, (750-$sz.Width)/2, (420-$sz.Height)/2)
  $bmp.Save("$dir\$file", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $font.Dispose(); $bmp.Dispose()
}
# 调用 15 次：han.png #1a2744 HAN  … 与 Task 2 文件名对齐
```

色值建议：比亚迪 `#1a2744`，腾势 `#3a2a18`，仰望 `#222222`，方程豹 `#3d2a12`，吉利 `#0b3d2e`，领克 `#333333`，极氪 `#1a1a1a`，问界 `#0b6e4f`，智界 `#1e4d6b`，享界 `#2c2c3a`，尊界 `#1a1520`，尚界 `#2a4038`，小米 `#ff6900` 过饱和则改 `#4a4a4a` 以免抢品牌绿。

- [ ] **Step 2: Check sizes**

Run: `Get-ChildItem miniprogram/assets/models | Measure-Object Length -Sum`

Expected: 15 个文件；Sum 最好 &lt; 1.5MB。过大则降分辨率到 600×336。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/assets/models
git commit -m "chore: add local model cover placeholders"
```

---

### Task 4: 筛选意图 storage

**Files:**
- Modify: `miniprogram/utils/storage.js`
- Test: 在 `tests/listModels.test.js` **不要**测 `wx`；本任务无 Node 测，用手测发现→动态。

**Interfaces:**
- Consumes: 现有 `KEYS` 对象
- Produces:
  - `setFeedIntent({ bucketId: string, powerTag: string })`
  - `consumeFeedIntent()` → `{ bucketId: string, powerTag: string } | null`（读后删除）

- [ ] **Step 1: Add to `storage.js`**

```javascript
const KEYS = {
  user: 'kancar_user',
  follows: 'kancar_follows',
  favorites: 'kancar_favorites',
  feedIntent: 'kancar_feed_intent'
}

function setFeedIntent(intent) {
  intent = intent || {}
  wx.setStorageSync(KEYS.feedIntent, {
    bucketId: intent.bucketId ? String(intent.bucketId) : '',
    powerTag: intent.powerTag ? String(intent.powerTag) : ''
  })
}

function consumeFeedIntent() {
  const v = wx.getStorageSync(KEYS.feedIntent)
  wx.removeStorageSync(KEYS.feedIntent)
  if (!v || typeof v !== 'object') return null
  return {
    bucketId: v.bucketId || '',
    powerTag: v.powerTag || ''
  }
}
```

`module.exports` 增加 `setFeedIntent`、`consumeFeedIntent`。

- [ ] **Step 2: Commit**

```bash
git add miniprogram/utils/storage.js
git commit -m "feat: pass discover filters to feed via storage intent"
```

---

### Task 5: 动态页纵向大封面

**Files:**
- Modify: `miniprogram/pages/feed/feed.js`
- Modify: `miniprogram/pages/feed/feed.wxml`
- Modify: `miniprogram/pages/feed/feed.wxss`
- Delete usage of: `feed.wxs` 若不再需要 `indexOf`（动力单选可用 `powerTag === item`），可停止引用 wxs

**Interfaces:**
- Consumes: `listPosts({ bucketId, powerTag })`；`consumeFeedIntent()`；`toCard` 字段 `id,title,cover,priceText,launchStatusText,tags,powerText,bodyType`
- Produces: 页面 data：`buckets, powerOptions, bucketId, powerTag, displayList, empty, loading`

- [ ] **Step 1: Rewrite `feed.js` page logic**

`toCard`:

```javascript
function toCard(p) {
  return {
    id: p.id,
    title: p.title,
    cover: p.cover || '',
    priceText: p.priceText,
    launchStatusText: p.launchStatusText,
    powerText: p.powerText,
    bodyType: p.bodyType,
    tags: p.tags || [],
    coverOk: true
  }
}
```

`data` 初始：`powerTag: ''`，`powerOptions: ['','纯电','插混','增程']` 配中文名在 wxml 用对象数组：

```javascript
const POWERS = [
  { id: '', name: '全部动力' },
  { id: '纯电', name: '纯电' },
  { id: '插混', name: '插混' },
  { id: '增程', name: '增程' }
]
```

`onShow`：先 `consumeFeedIntent()`，若有则 `setData` 对应 `bucketId`/`powerTag`（无子品牌行）。然后设 `buckets`/`powers`，再 `reload`。

`reload` 调用：

```javascript
listPosts({
  bucketId: this.data.bucketId || undefined,
  powerTag: this.data.powerTag || undefined,
  page: 1,
  pageSize: 50
}).map(toCard)
```

`onBucket`：只 `setData({ bucketId, powerTag: '' })`，不要 `subBrands`/`selectedTags`。

`onPower`：`dataset.id` 为 `all` 时 `powerTag=''`。

`onCoverError`：`displayList` 里对应项 `item.coverOk = false`（拷贝数组再 setData）。

删 `onSubBrand`、`onTag`、`selectedTags`、`subBrands`。

- [ ] **Step 2: Replace `feed.wxml`**

```xml
<view class="feed">
  <view class="chips">
    <view
      wx:for="{{buckets}}"
      wx:key="id"
      class="chip {{bucketId === item.id ? 'chip-on' : ''}}"
      hover-class="chip-hover"
      data-id="{{item.id || 'all'}}"
      catchtap="onBucket"
    >{{item.name}}</view>
  </view>
  <view class="chips">
    <view
      wx:for="{{powers}}"
      wx:key="id"
      class="chip {{powerTag === item.id ? 'chip-on' : ''}}"
      hover-class="chip-hover"
      data-id="{{item.id || 'all'}}"
      catchtap="onPower"
    >{{item.name}}</view>
  </view>
  <view wx:if="{{loading}}" class="empty">加载中</view>
  <view wx:elif="{{empty}}" class="empty">
    <view>暂时还没有动态</view>
    <view class="empty-clear" catchtap="clearFilters">清除筛选</view>
  </view>
  <block wx:for="{{displayList}}" wx:key="id">
    <view wx:if="{{item.type === 'post'}}" class="card" data-id="{{item.id}}" catchtap="goDetail">
      <view class="cover-wrap">
        <view class="cover-fallback">{{item.item.title}}</view>
        <image
          wx:if="{{item.item.cover && item.item.coverOk}}"
          class="cover"
          src="{{item.item.cover}}"
          mode="aspectFill"
          data-id="{{item.id}}"
          binderror="onCoverError"
        />
      </view>
      <view class="card-body">
        <view class="title">{{item.item.title}}</view>
        <view class="price">{{item.item.priceText}}</view>
        <view class="tagrow">
          <text class="mini">{{item.item.launchStatusText}}</text>
          <text wx:if="{{item.item.powerText}}" class="mini">{{item.item.powerText}}</text>
          <text wx:if="{{item.item.bodyType}}" class="mini">{{item.item.bodyType}}</text>
        </view>
      </view>
    </view>
    <ad-banner wx:elif="{{item.type === 'ad'}}" unit-id="{{item.unitId}}" />
  </block>
</view>
```

- [ ] **Step 3: Cover CSS**

在 `feed.wxss` 增加（沿用 token）：

```css
.cover-wrap {
  position: relative;
  height: 340rpx;
  background: var(--color-brand);
}
.cover-fallback {
  position: absolute;
  left: 0; right: 0; top: 0; bottom: 0;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
}
.cover {
  position: relative;
  width: 100%;
  height: 340rpx;
  display: block;
}
.price {
  margin-top: 8rpx;
  color: var(--color-brand);
  font-size: 30rpx;
  font-weight: 700;
}
.tagrow { margin-top: 12rpx; }
.mini {
  display: inline-block;
  margin-right: 8rpx;
  padding: 4rpx 12rpx;
  background: var(--color-tag-bg);
  color: var(--color-brand);
  font-size: 20rpx;
  border-radius: 6rpx;
}
```

删掉 `.summary` 若不再用。

- [ ] **Step 4: Hand-test in DevTools**

编译后：全部应 15 张大封面卡；比亚迪 5 张；增程至少夏、豹5、问界；空筛选可清除。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/feed
git commit -m "feat: render feed as vertical model-cover catalog"
```

---

### Task 6: 详情手册页

**Files:**
- Modify: `miniprogram/pages/detail/detail.wxml`
- Modify: `miniprogram/pages/detail/detail.wxss`
- Modify: `miniprogram/pages/detail/detail.js`（`post` 已含 `bullets`、`powerText`、`bodyType`；裂图 `coverOk`）

**Interfaces:**
- Consumes: `getPost(id)` 装饰后的车型
- Produces: 详情顺序：封面 → 名 → 价 → 三栏 → 3 要点 → 来源 → 收藏 → ad-banner

- [ ] **Step 1: Replace `detail.wxml`**

```xml
<view wx:if="{{post}}" class="detail">
  <view class="hero">
    <view class="hero-fallback">{{post.title}}</view>
    <image
      wx:if="{{post.cover && coverOk}}"
      class="cover"
      src="{{post.cover}}"
      mode="aspectFill"
      binderror="onCoverError"
    />
  </view>
  <view class="pad">
    <view class="title">{{post.title}}</view>
    <view class="price">{{post.priceText}}</view>
    <view class="specs">
      <view class="spec"><view class="spec-v">{{post.launchStatusText}}</view><view class="spec-k">状态</view></view>
      <view class="spec"><view class="spec-v">{{post.powerText}}</view><view class="spec-k">动力</view></view>
      <view class="spec"><view class="spec-v">{{post.bodyType}}</view><view class="spec-k">车身</view></view>
    </view>
    <view class="h">速览要点</view>
    <view wx:for="{{post.bullets}}" wx:key="*this" class="bullet">{{item}}</view>
    <view class="source" bindtap="openSource">
      <text>{{post.sourceNote}}</text>
      <text wx:if="{{post.sourceUrl}}" class="link">（点击复制原文链接）</text>
    </view>
    <button class="fav" bindtap="onFavorite">{{favorited ? '取消收藏' : '收藏本机'}}</button>
  </view>
  <ad-banner unit-id="{{adUnitIdDetail}}" />
</view>
```

`data.coverOk` 默认 `true`；`onCoverError` 设 `false`。`load` 时重置 `coverOk: true`。

- [ ] **Step 2: Specs CSS**

```css
.hero { position: relative; height: 400rpx; background: var(--color-brand); }
.hero-fallback { position: absolute; inset: 0; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.cover { width: 100%; height: 400rpx; position: relative; display: block; }
.price { margin-top: 12rpx; color: var(--color-brand); font-size: 36rpx; font-weight: 700; }
.specs { display: flex; margin-top: 24rpx; border: 1rpx solid var(--color-line); border-radius: 12rpx; overflow: hidden; }
.spec { flex: 1; text-align: center; padding: 20rpx 8rpx; }
.spec + .spec { border-left: 1rpx solid var(--color-line); }
.spec-v { font-size: 26rpx; font-weight: 600; }
.spec-k { margin-top: 6rpx; font-size: 20rpx; color: var(--color-text-3); }
.h { margin-top: 32rpx; font-size: 30rpx; font-weight: 600; }
.bullet { margin-top: 12rpx; font-size: 28rpx; line-height: 1.6; color: #333; padding-left: 8rpx; }
```

不要再绑定 `post.body` 长文本。

- [ ] **Step 3: Hand-test**

点「比亚迪 汉」：三栏与 3 条要点；复制链接 toast；收藏后「我的」能进同一 id。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/detail
git commit -m "feat: turn detail page into a model handbook sheet"
```

---

### Task 7: 发现目录 + 我的缩略图

**Files:**
- Modify: `miniprogram/pages/discover/discover.wxml`
- Modify: `miniprogram/pages/discover/discover.wxss`
- Modify: `miniprogram/pages/discover/discover.js`
- Modify: `miniprogram/pages/mine/mine.wxml`
- Modify: `miniprogram/pages/mine/mine.wxss`

**Interfaces:**
- Consumes: `setFeedIntent`；`getPostsByIds` 已 decorate 的 `cover`/`priceText`/`title`
- Produces: 发现点击后动态筛选亮起；我的收藏显示小图+价

- [ ] **Step 1: Discover wxml/js**

`discover.js`:

```javascript
const { setFeedIntent } = require('../../utils/storage')

Page({
  openFeed(e) {
    const bucketId = e.currentTarget.dataset.bucket || ''
    const powerTag = e.currentTarget.dataset.power || ''
    setFeedIntent({ bucketId: bucketId, powerTag: powerTag })
    wx.switchTab({ url: '/pages/feed/feed' })
  }
})
```

`discover.wxml`：

```xml
<view class="discover">
  <view class="sec">按动力看</view>
  <view class="grid">
    <view class="tile" data-power="纯电" catchtap="openFeed"><view class="t">纯电</view><view class="s">SU7 · 007 · 汉 EV</view></view>
    <view class="tile" data-power="插混" catchtap="openFeed"><view class="t">插混</view><view class="s">汉 DM · 领克 08</view></view>
    <view class="tile" data-power="增程" catchtap="openFeed"><view class="t">增程</view><view class="s">夏 · 豹5 · 问界</view></view>
    <view class="tile" catchtap="openFeed"><view class="t">全部车型</view><view class="s">打开动态手册</view></view>
  </view>
  <view class="sec">按品牌看</view>
  <view class="tile" data-bucket="byd" catchtap="openFeed"><view class="t">比亚迪族</view><view class="s">汉 / 夏 / 腾势 / 仰望 / 方程豹</view></view>
  <view class="tile" data-bucket="geely" catchtap="openFeed"><view class="t">吉利族</view><view class="s">银河 / 领克 / 极氪</view></view>
  <view class="tile" data-bucket="huawei" catchtap="openFeed"><view class="t">鸿蒙智行</view><view class="s">问界 / 智界 / 享界 / 尊界 / 尚界</view></view>
  <view class="tile" data-bucket="xiaomi" catchtap="openFeed"><view class="t">小米</view><view class="s">SU7 / YU7</view></view>
</view>
```

`discover.wxss`：`.grid{display:flex;flex-wrap:wrap;}` `.tile{width:48%;}` 第二段品牌 `tile` 宽度 100%。`padding-bottom: calc(16rpx + env(safe-area-inset-bottom));`

删掉 `onTap` toast。

- [ ] **Step 2: Mine favorite row**

```xml
<view class="fav-item" ...>
  <image wx:if="{{item.cover}}" class="fav-cover" src="{{item.cover}}" mode="aspectFill" />
  <view class="fav-text">
    <view class="fav-title">{{item.title}}</view>
    <view class="fav-meta">{{item.priceText}}</view>
  </view>
</view>
```

`.fav-item{display:flex;align-items:center;}` `.fav-cover{width:120rpx;height:80rpx;border-radius:8rpx;margin-right:16rpx;}`

- [ ] **Step 3: Hand-test**

发现「纯电」→ 动态「纯电」亮起且列表为纯电车。发现「比亚迪族」→ 五款。收藏缩略图与标题一致。全仓搜索「即将上线」「华为汽车」应无用户可见文案（`discover` 页不再 toast 即将上线）。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/discover miniprogram/pages/mine
git commit -m "feat: turn discover into catalog index and show favorite thumbs"
```

---

### Task 8: 对照 spec 做手测清单

**Files:** 无必须改动；若手测发现文案问题再小修并提交。

- [ ] **Step 1: Run Node tests**

```bash
node tests/listModels.test.js
node tests/whitelist.test.js
node tests/composeRules.test.js
```

Expected: 全部 `PASS`

- [ ] **Step 2: DevTools checklist**

- 动态全部 15 卡、纵向大图
- 比亚迪 5 卡含汉、夏、腾势 D9、仰望 U8、豹5
- 增程筛选非空
- 详情三栏 + 3 要点 + 复制链接
- 发现动力/品牌跳转筛选正确
- 我的收藏缩略图
- tab 图标仍在
- 「开始使用」文案仍在
- 控制台无 `callFunction` / 云环境错误（可忽略未选环境警告）

- [ ] **Step 3: Commit only if you fixed bugs**

```bash
git commit -m "fix: handbook UI issues found in smoke test"
```

若无改动则不要空提交。

---

## Spec coverage

| Spec 节 | Task |
| --- | --- |
| 一卡一款车、15 条、字段 | 2 |
| 品牌+动力筛选、禁止车身多选滤空 | 2, 5 |
| 纵向大封面、裂图兜底 | 3, 5 |
| 详情手册结构 | 6 |
| 发现目录 + intent | 4, 7 |
| 我的缩略图、开始使用 | 7 |
| 本地图、不联网、不云 | 全程 |
| 不写华为汽车、不即将上线 | 2, 7, 8 |
| 不改抓取脚本 | 未列入任务 |

## Placeholder scan

无 TBD；`listPosts`/`setFeedIntent`/`consumeFeedIntent`/`toCard` 名称前后一致。封面生成用色块示意，符合 spec「缺图色块 / 自绘示意、不用官网实拍」。
