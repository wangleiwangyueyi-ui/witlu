# Cloudflare Pages 连接 GitHub · witlu

本仓库已经具备可直接运行的 Pages 构建、静态资源与响应头。以下首次账户连接需要在你自己的 Cloudflare / GitHub 页面完成；本阶段未创建 Pages 项目，也未声称已经取得线上预览链接。

步骤按 2026-11-12 查阅的 Cloudflare 官方 [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) 与 [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/) 编写。Cloudflare 同时提供 Workers，本项目按既定方案选择 **Pages**。

## 1. 确认 GitHub 上已有代码

仓库：<https://github.com/wangleiwangyueyi-ui/witlu>。`upstream/` 是固定 commit 的公开 Git submodule。生成的 CHGIS 数据不提交，Pages 在构建时读取子模块生成。

首次连接前，确认 GitHub 的 `main` 至少已有 P0 的 package.json、锁文件、构建脚本与 submodule；如果远端还只有方案文档，先在本项目终端运行 `git push origin main` 同步本地 P0 主分支。若远端已具备构建配置则跳过。

P1 代码放在本地 `codex/p1-liquid-glass` 分支。先完成下面的 Cloudflare 连接，再在第 3 节首次推送该分支，这样推送事件才会触发新的预览构建。不要假设连接前已有的分支会自动补建。若首次生产分支仍是 P0，生产地址先显示 P0 数据验收页；P1 界面通过分支预览地址检查，后续合并到 main 才更新生产版。

## 2. 在 Cloudflare 首次连接

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)，登录后选中你的账户。
2. 左侧进入 **Workers & Pages**，点 **Create application**。
3. 选择 **Pages**，再点 **Connect to Git**。不要选择 Direct Upload。
4. 选择 **GitHub**。若出现 GitHub 授权页，选择你的账户，选择 **Only select repositories**，只勾选 `witlu`，再点 **Install & Authorize**。已有授权则直接选仓库。
5. 回到 Cloudflare，选择 `wangleiwangyueyi-ui/witlu`，点 **Begin setup**。
6. 在 **Set up builds and deployments** 填写下表。项目名可以用 `witlu`；若已被占用，以界面实际允许的名称为准。

| 字段 | 值 |
|---|---|
| Project name | `witlu` 或你选择的可用名称 |
| Production branch | `main` |
| Framework preset | `None`（手工填写以下参数） |
| Build command | `git submodule update --init --recursive && pnpm build` |
| Build output directory | `packages/web/dist` |
| Root directory (advanced) → Path | 留空，使用仓库根目录；**不要**填 `packages/web` |

7. 展开 **Environment variables**，添加 `NODE_VERSION = 22.16.0` 和 `PNPM_VERSION = 10.20.0`。后续在 **Settings → Builds & deployments** 的环境变量编辑处，将这两个值同时配置到 **Production** 和 **Preview**。如界面使用 **Build / Variables and Secrets** 分栏，在对应构建环境填写相同值。
8. 点 **Save and Deploy**。构建日志应依次完成依赖安装、印章资源构建、全量数据导入、198 快照几何与配色、parity、strict typecheck 和 Vite build。字体子集与许可证已提交，构建不需要 Python，也不从 Google Fonts 下载任何文件。
9. 成功后点 **Continue to project**。**Deployments** 页面会显示真实的 `*.pages.dev` 地址。将这个界面返回的实际链接保存下来，不要把文档示例地址当成已部署地址。

## 3. 让每次推送自动产生预览

1. 在 **Workers & Pages → 你的 Pages 项目 → Settings → Builds & deployments** 找到 Git / Branch control，确认自动构建启用。
2. **Production branch** 保持 `main`；**Preview branches** 选择所有非生产分支构建（All non-production branches / All branches），不要排除 `codex/*`。
3. 推送 `codex/p1-liquid-glass` 这样的非生产分支。进入 **Deployments**，找到该 commit 对应的 **Preview** 记录，点 **View build** 查看状态和日志。
4. 成功记录会给出不可变的 `<hash>.<project>.pages.dev` 地址，并给分支生成始终指向最新成功构建的别名。`codex/p1-liquid-glass` 的别名形式为 `codex-p1-liquid-glass.<project>.pages.dev`，以页面的 **Aliases** 实际值为准。
5. 后续继续向同一分支推送，分支别名会更新。仓库内分支的 Pull Request 也会获得预览状态；从 fork 发起的 PR 不保证自动预览。推送到 `main` 更新的是生产站点及绑定域名，而非独立的预览分支。
6. 用手机打开实际预览 URL，末尾加 `?debug=1` 可显示验收控制台。点语言、展开抽屉、拖动、点音乐（默认静音，需手势播放）和“一键截图”。

默认预览链接可公开访问。如只给自己与朋友使用，可在项目 **Settings → General → Enable access policy** 开启 Cloudflare Access，并在 Access 中添加获准的访客。这项设置只保护预览域名，不自动保护生产域名或自定义域名。

## 4. 构建与验收排错

| 现象 | 检查 |
|---|---|
| 找不到 packages 或 scripts | Root directory 应留空；输出目录才是 `packages/web/dist` |
| 找不到 upstream/js | 确认 GitHub 中 upstream 是 gitlink，`.gitmodules` 已提交，构建命令包含 submodule update |
| Vite 报 Node 版本不符 | Preview / Production 都设 Node >=22.12；本指南固定 22.16.0 |
| 没有预览记录 | 检查推送是否到同一仓库、Preview branch control 是否启用、分支未被排除 |
| 手机打开仍是旧版本 | 对照 Deployment 的 commit 和 Aliases；HTML 使用 no-cache，数据须重新验证 |
| 字体缺字 | 本地更新标题键后运行 `pnpm fonts` 并提交 WOFF2 与 manifest；见 FONTS.md |

`public/_headers` 会由 Vite 原样复制到 dist，设置 HTML 不缓存、静态资源缓存、数据重新验证与基础响应头。Cloudflare 预览自身还会添加 `X-Robots-Tag: noindex`。本地 Vite 不应用 `_headers`，应在实际部署后通过浏览器 Network 检查响应头。

本阶段不修改域名或 DNS。后续绑定 witlu.com 时沿用 PLAN 第 10 节，在 Pages 项目 **Custom domains** 中添加域名，再依界面提示配置 DNS。
