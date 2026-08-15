# 新车速览 / NEV Glance

微信小程序：国内新能源车企（比亚迪族、吉利族、鸿蒙智行五界、小米）新车动态速览。  
技术栈：原生小程序 + 微信云开发（不自购云服务器）。

## 浏览器功能演示（无需微信开发者工具）

仓库内 `preview/` 是静态 HTML 原型，数据在 `preview/data/posts.json`（由官方白名单页抓取整理）。

```bash
# 刷新演示数据（可选）
node scripts/fetch-preview-data.js

# 在 preview 目录起静态服务（推荐，避免 file:// 无法加载 JSON）
npx --yes serve preview -p 5173
```

浏览器打开提示的本地地址（如 `http://localhost:5173`），可体验：

- 动态：品牌桶 / 子品牌 / 标签筛选与详情
- 发现：车机软件、用车好物「即将上线」
- 我的：模拟登录、关注、收藏（存浏览器 localStorage）

## 你需要准备的环境

1. [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. [微信公众平台](https://mp.weixin.qq.com) 小程序账号（可先个人主体）
3. Node.js LTS（跑 `tests/` 与生成管理员密码哈希）
4. Git（本仓库已对接 GitHub）

## 快速开始

1. **注册小程序**  
   - 名称：`新车速览`（占用则用 `绿牌速览`）  
   - 简介：`新能源车型上市与价格速览`（不要写「新闻聚合」）  
   - 类目：生活服务 / 信息查询类（以当时平台可选为准）

2. **克隆本仓库**，用微信开发者工具导入项目根目录。

3. **填写配置**  
   - `project.config.json` → `appid`  
   - `miniprogram/config.js` → `envId`  
   - 广告位 `adUnitIdFeed` / `adUnitIdDetail` 先留空

4. **开通云开发**（免费体验环境即可）  
   - 按 `scripts/seed-import.md` 建集合并导入 `brands.json`、`ingest_sources.json`  
   - 生成管理员写入 `admins`

5. **部署全部云函数**（右键每个函数「上传并部署：云端安装依赖」）  
   - 特别注意：`ingestRun` 依赖本地包 `nev-common`，需在含 `cloudfunctions/common` 的结构下安装依赖  
   - `ingestRun` 超时建议 ≥ 60s，并开启公网出访

6. **定时触发器**  
   - 为 `ingestRun` 配置 cron：`0 */6 * * *`（每 6 小时）

7. **管理后台**  
   - 云开发静态网站托管上传 `admin-web/`  
   - 为 `adminLogin`、`adminListPosts`、`adminPublish`、`adminOffline`、`adminUpsertPost`、`adminIngestLog` 开启 HTTP 访问  
   - 修改 `admin-web/js/api.js` 中 `BASE` 为你的 HTTP 根地址

## 本地单测（无需微信工具）

```bash
node tests/whitelist.test.js
node tests/listPostsQuery.test.js
node tests/composeRules.test.js
```

## 手测清单

- [ ] 未登录可浏览、筛选
- [ ] 关注/收藏拉起登录；登录失败仍可浏览
- [ ] 我的：关注可取消；收藏与详情一致
- [ ] 发现双卡片 toast「即将上线」
- [ ] adUnit 为空无空白坑
- [ ] 流水线：同 URL 不重复；官方可自动发布；安全/缺字段进待审核；燃油页不入库
- [ ] 后台：待审核发布/丢弃；手工新建；下架后用户端不可见
- [ ] 文案无「华为汽车」；导航栏「新车速览」

## 流量主（以后）

访客达标后在公众平台开通流量主 → 建 Banner 广告位 → 填入 `config.js` → 重新提审。  
盈利是「展示广告分成」，不是花钱投放。

## 目录

- `preview/` 浏览器功能演示（本地 JSON）
- `miniprogram/` 用户端
- `cloudfunctions/` 云函数
- `admin-web/` 管理后台静态站
- `scripts/` 种子数据与 `fetch-preview-data.js`
- `docs/superpowers/` 设计与实现计划
- `tests/` Node 断言测试

## License

Private / 自用项目，按需自行补充。
