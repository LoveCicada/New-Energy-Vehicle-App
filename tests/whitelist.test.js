const assert = require('assert')
const { isOfficialHost } = require('../cloudfunctions/common/whitelist')

assert.strictEqual(isOfficialHost('www.byd.com'), true)
assert.strictEqual(isOfficialHost('hima.auto'), true)
assert.strictEqual(isOfficialHost('www.autohome.com.cn'), false)
assert.strictEqual(isOfficialHost('mp.weixin.qq.com'), false)
console.log('whitelist.test.js PASS')
