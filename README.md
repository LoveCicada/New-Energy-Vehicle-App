# 看Car / NEV Glance

微信小程序：国内新能源车企（比亚迪族、吉利族、鸿蒙智行五界、小米）新车动态速览。  
第一版**不使用微信云开发**。数据在电脑上抓取后写入包内 JSON，再手动上传发布。

## 导入（不使用云服务）

1. 用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)导入**本仓库根目录**（含 `project.config.json` 和 `miniprogram/` 的那份代码）。
2. 导入对话框选 **「不使用云服务」**，不必勾选云开发服务条款。
3. AppID 已写入：`wxb2f1332cae0882b1`。

注意：若本机还有 `E:\code\AI\New-Energy-Vehicle-App` 之类的目录，请确认导入的是含 `miniprogram/` 的这份仓库（例如 `E:\code\AI\WeChatAppp`）。

## 数据怎么更新

用户端**不会**自动联网刷新。流程：

```text
本机脚本抓取官方页 → miniprogram/data/posts.json → 开发者工具上传并发布 → 用户看到新内容
```

```bash
# 抓取并同时写入 preview/data/posts.json 与 miniprogram/data/posts.json
node scripts/fetch-preview-data.js
```

然后在微信开发者工具里上传、提交审核/发布。每次改内容都要重新发一版（有审核周期）。包内 JSON 不宜过大（主包有体积上限）。

关注 / 收藏用 `wx.setStorageSync` 存在用户手机，不登录云端、不跨设备同步。浏览不强制登录。

## 浏览器功能演示（无需微信开发者工具）

仓库内 `preview/` 是静态 HTML 原型，数据在 `preview/data/posts.json`。

```bash
node scripts/serve-preview.js
```

浏览器打开 `http://127.0.0.1:5173`。若坚持使用 `npx serve` 遇到 `ERR_SOCKET_TIMEOUT`，可先换国内镜像，或直接用上面的零依赖脚本。

## 你需要准备的环境

1. 微信开发者工具
2. 微信公众平台小程序账号（已注册名称：看Car）
3. Node.js LTS（跑抓取脚本与 `tests/`）
4. Git

广告位 `miniprogram/config.js` 里的 `adUnitIdFeed` / `adUnitIdDetail` 先留空即可。`envId` 可留空。

`cloudfunctions/` 与 `admin-web/` 仍保留在仓库，第一版小程序不部署。

## 本地单测

```bash
node tests/whitelist.test.js
node tests/listPostsQuery.test.js
node tests/composeRules.test.js
```

## 手测清单

- [ ] 导入时选「不使用云服务」，模拟器能打开列表（不报云函数错误）
- [ ] 未登录可浏览、筛选
- [ ] 关注/收藏写入本机；「我的」与详情一致
- [ ] 发现双卡片 toast「即将上线」
- [ ] adUnit 为空无空白坑
- [ ] 文案无「华为汽车」；导航栏「看Car」

## 流量主（以后）

访客达标后在公众平台开通流量主 → 建 Banner 广告位 → 填入 `config.js` → 重新提审。  
盈利是「展示广告分成」，不是花钱投放。

## 目录

- `preview/` 浏览器功能演示
- `miniprogram/` 用户端（读 `data/posts.json`）
- `cloudfunctions/` 云函数（第一版不部署）
- `admin-web/` 管理后台静态站（第一版不用）
- `scripts/` 种子数据与抓取脚本
- `docs/superpowers/` 设计与实现计划
- `tests/` Node 断言测试

## License

Private / 自用项目，按需自行补充。
