# 部署 witlu.com：Cloudflare Pages 与 Squarespace

核对日期：2026-11-15。仓库使用 GPL-3.0，upstream 为固定 commit 子模块；CHGIS 衍生数据仅构建时生成。本文提供操作步骤，不代表已修改账户、DNS 或发布站点。当前域名的检查结果见 `docs/progress/performance/P11/live.json`。

## 1. GitHub 连接 Cloudflare Pages

1. 将本地已验证的 commit 推送到自己的 GitHub 仓库 `wangleiwangyueyi-ui/witlu`；确认 `.gitmodules`、锁文件和 scripts 都存在。生产分支为 `main`。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，选账户 → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**。
3. 选择 **GitHub**；授权页选 **Only select repositories** → 勾选 `witlu` → **Install & Authorize**。回到 Cloudflare 选仓库 → **Begin setup**。
4. Project name 填可用名称（下文 `<project>` 代表这个真实名称）；Production branch 选 `main`；Framework preset 选 `None`。
5. Build command 填 `git submodule update --init --recursive && pnpm build`；Build output directory 填 `packages/web/dist`；Root directory 留空。
6. Environment variables 添加 `NODE_VERSION=22.19.0`、`PNPM_VERSION=10.20.0`，Production 与 Preview 都设置。点 **Save and Deploy**，查看构建日志。
7. 成功后点 **Continue to project** → **Deployments**，保存真实的 `https://<project>.pages.dev`。打开 `/release.json`，应看到 `application: witlu` 和当前瓦片版本。
8. **Settings → Builds & deployments → Branch control**：Production 保持 main，Preview 允许全部非生产分支。之后推送 `codex/*` 分支，在 **Deployments → Preview → View build / Aliases** 取每个 commit 的预览链接。合并到 main 后更新生产。

界面名称可能随 Cloudflare 调整；选择 Pages 的 Git 集成。参考 [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) 与 [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)。

## 2. 构建资源与限额

`pnpm build` 导入上游 → 生成音频、书法、瓦片与海岸场 → 专题页 → 198 张静态兜底图 → strict typecheck → Vite → 版本化瓦片目录 → Service Worker。输出约一万余文件，具体数量由 `pnpm verify:bundle` 报告。

Cloudflare Free Pages 上限为 20,000 文件、单文件 25 MiB，构建 20 分钟超时；本仓库检查前两项。首次全量瓦片下载较慢，后续应保存 `packages/web/public/tiles` 与 `.cache/terrain` 缓存；Pages 不保证保留这些自定义目录。若冷构建超过 20 分钟，可在 GitHub Actions 运行相同构建、缓存生成目录，再使用 Pages 的 Wrangler CI 上传；不要删图层绕过限额。超过文件或体积上限时再将瓦片迁到同域 R2。参见 [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)。

## 3. 方案 A：Cloudflare 托管 DNS（推荐）

1. 先在 Squarespace 的 **Domains → witlu.com → DNS → DNS Settings** 保存现有记录，尤其 MX、TXT、SPF、DKIM、DMARC。切换 NS 不会自动搬迁邮件记录。
2. Cloudflare 账户 → **Add a domain / Onboard a domain** → 输入 `witlu.com` → 选择适用套餐 → 检查扫描到的 DNS；补齐上一步邮件记录，邮件相关主机使用 DNS only。
3. 继续到 Nameservers 页面，复制 Cloudflare 分配给该域名的两个 NS；不要用教程示例地址。
4. Squarespace **Domains → witlu.com → DNS → Domain Nameservers → Use Custom Nameservers**；按提示验证密码或 2FA，按界面流程处理旧 DNSSEC；填 Nameserver 1 / 2 → **Save**。
5. 回 Cloudflare 域名 Overview 确认 Active。DNS 生效期间不要反复切换；如启用 Cloudflare DNSSEC，按其给出的 DS 在注册商同步。
6. **Workers & Pages → 项目 → Custom domains → Set up a domain**，依次添加 `witlu.com`、`www.witlu.com`；按提示确认 CNAME，等待两个域名均为 Active / 证书就绪。
7. 域名 **SSL/TLS → Edge Certificates** 开启 **Always Use HTTPS**。不要将已有邮件记录改成网页指向。
8. 可保留两个域名均能提供页面；若把 www 统一到根域，使用 **Rules → Redirect Rules → Create rule**，匹配 hostname `www.witlu.com`，动态目标 `concat("https://witlu.com", http.request.uri.path)`，301，勾选保留 query string。测试 `?year=230&lang=en` 必须保留。

Pages 的根域必须作为 Cloudflare zone 并使用其 NS；必须先在 Pages 绑定域名，再设置 CNAME。依据 [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)。Squarespace 的准确 NS 入口及 DNSSEC 流程见 [nameserver guide](https://support.squarespace.com/hc/en-us/articles/4404183898125-Review-change-or-reset-your-domain-s-nameservers)。

## 4. 方案 B：保留 Squarespace DNS，www 接 Pages

1. Cloudflare **Workers & Pages → 项目 → Custom domains → Set up a domain**，先添加 `www.witlu.com`，复制提示中的 `<project>.pages.dev`。
2. Squarespace **Domains → witlu.com → DNS → DNS Settings → Custom Records → Add record**：Type 选 CNAME，Host 填 `www`，Data 填 `<project>.pages.dev`（不带协议或路径），保存。只处理同名冲突的网页记录，保留邮件记录。
3. 回 Cloudflare Custom domains，等待 www 变为 Active。先直接访问 `https://www.witlu.com/` 和 `/release.json` 验证。
4. Squarespace **Domains → witlu.com → Website → Domain Forwarding Rules → Add rule**；验证身份后 Subdomain 填 `@`，Enter website URL 填 `www.witlu.com`，不要附加 `http://` 或 `https://`，也不要添加 www 为第二个转发源。
5. **Advanced settings** 选 **Permanent Redirect (301)**；**Path Forwarding** 选 **Maintain paths** → **Save**。若旧界面仍显示 SSL 开关，确认打开；新界面可能不再显示。
6. 检查根域 HTTP / HTTPS 都跳到 www，专题路径保留且没有循环。

**该方案不能完整满足本项目深链要求**：Squarespace 官方说明转发不会保留查询参数，因此根域 `witlu.com/?year=230` 可能丢失 year；直接访问 `www.witlu.com/?year=230` 不受影响。本项目二维码、canonical 与 MCP 仍使用 witlu.com，所以正式上线应采用 A；B 仅供明确接受这一限制时配置，不能标为深链验收通过。参见 [CNAME 设置](https://support.squarespace.com/hc/en-us/articles/31119879125645-DNS-records-for-web-hosting) 与 [Squarespace forwarding / query 参数限制](https://support.squarespace.com/hc/en-us/articles/214767107-Forwarding-a-domain)。

## 5. 缓存策略

`packages/web/public/_headers` 原样发布到 dist，Vite 本地服务不执行它；最终以域名响应头为准。

| 路径 | 策略 |
|---|---|
| HTML：首页、lab、专题 | no-cache，每次重新验证 |
| `/assets/*.js`、`*.css` | 文件名带内容哈希，一年 immutable |
| `/terrain/<version>/*` | 全部瓦片文件内容生成版本目录，一年 immutable |
| `/fallback/images/*` | 内容哈希文件名，一年 immutable |
| data、音频、字体、brand、书法 | 固定路径，max-age=0 + must-revalidate |
| sw.js、release、静态图索引、manifest、sitemap | no-cache |

版本化瓦片替代原固定 `/tiles` 发布路径，避免修改浮雕后仍命中旧的一年缓存。固定名称音频不会套用 JS 的 immutable。规则之间不重复设置同一缓存头，避免 Cloudflare 合并成冲突值；依据 [Headers](https://developers.cloudflare.com/pages/configuration/headers/)。

Service Worker 只预缓存应用入口的静态依赖、CSS 与印章；不预缓存 vConsole、全部实验室或分享导出模块。运行时缓存最多 100 项、每项 ≤2 MB；仅清理 witlu 自有缓存。离线支持外壳及已访问资源，不保证全朝代离线。新版本等待旧页面关闭后激活。

## 6. 上线检查与回滚

```powershell
pnpm verify
pnpm build
pnpm verify:bundle
pnpm verify:live
```

`verify:live` 读取 witlu.com 和 www 的 HTTP / HTTPS，逐跳记录状态码与有效 TLS，再检查首页身份、release、入口 JS、版本瓦片、SW 和专题缓存头。任一不符退出 1，输出 `docs/progress/performance/P11/live.json`。当前失败不应通过修改预期或返回码隐藏；域名正确绑定并发布后再执行。

再手工打开 `https://witlu.com/?year=230&lang=en` 和 www 版本，检查参数。真机按 [DEVICE-TESTS.md](DEVICE-TESTS.md) 执行。若新版本异常，进入 Pages **Deployments → 最近正常的 Production → … → Rollback to this deployment**，确认后重跑线上检查。DNS 回滚需使用前面保存的记录，而非删除全部记录。
