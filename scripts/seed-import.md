# 种子数据导入说明

## 1. 创建集合

在云开发控制台创建以下集合（权限建议：所有读写仅云函数，客户端不可直写）：

- `brands`
- `posts`
- `users`
- `follows`
- `favorites`
- `admins`
- `admin_sessions`
- `ingest_sources`
- `ingest_raw`

## 2. 导入 brands / ingest_sources

将本目录 `brands.json`、`ingest_sources.json` 通过云开发控制台「导入」写入对应集合。也可在开发者工具云函数临时脚本中批量 `add`。

同目录文件也复制到 `cloudfunctions/common/brandsSeed.json` 与 `sourcesSeed.json` 便于对照。

## 3. 创建管理员

在本地 Node 中运行：

```js
const crypto = require('crypto')
const salt = crypto.randomBytes(16).toString('hex')
const password = 'CHANGE_ME'
const passwordHash = salt + ':' + crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
console.log(JSON.stringify({ username: 'admin', passwordHash }, null, 2))
```

将输出写入 `admins` 集合一条记录。请立刻修改 `CHANGE_ME`。

示例结构见 `admin-user.example.json`（勿提交真实密码哈希到公开仓库以外的渠道时请自行保管）。

## 4. 索引建议

- `posts`: `status + publishedAt`
- `ingest_raw`: `contentHash`、`fetchedAt`
- `follows`: `_openid + bucketId`
- `favorites`: `_openid + postId`
- `admin_sessions`: `token`
