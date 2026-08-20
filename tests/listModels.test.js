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
