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
assert.ok(draft.body.indexOf('【速览】') === 0 || draft.body.indexOf('【速览】') >= 0)
console.log('composeRules.test.js PASS')
