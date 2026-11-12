# 自托管宋体子集

来源为 Adobe 官方 Source Han Serif SC SemiBold（思源宋体），SIL Open Font License 1.1。构建脚本从官方 release 分支下载，记录完整 SHA-256，保留原许可证；子集内部名称改为 **Witlu Song**，避开保留字体名称。生成的 WOFF2、来源 manifest 与 OFL 一起提交，网站运行时无需访问字体服务。

更新标题文字后运行 `pnpm fonts`。脚本收集三语标题文案（brand / chapterName / intro / aboutTitle / wei / shu / wu），以及上游 18 个时期标题及其繁体转换，不把整部历史正文装入标题字体。正文使用本机无衬线字体。新增宋体标题键时同时扩展脚本的标题键列表。

需要 Python 3。可只在工作区缓存安装工具：

```sh
python -m pip install --target .cache/font-tools "fonttools[woff]>=4.61,<5" "brotli>=1.1,<2"
pnpm fonts
```

`WITLU_PYTHON` 可指定 Python 可执行文件；`pnpm fonts --source /absolute/path/font.otf` 可使用已下载的同一官方源字体。若上游 release 更新，先检查字体许可和 manifest 的 SHA-256 变化再提交。字体文件已提交，Cloudflare 构建不需要 Python 或额外下载。
