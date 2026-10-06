# Phycat 维护与发布

运行时源码为 `theme.css`。`theme-origin.css` 保留历史参考，不再作为打包输入。主题安装包不包含历史源码、开发依赖、本地设置或备份目录。

## 验证

克隆仓库后使用 Node.js 24：

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run generator:sync
npm run check
npm test
npm run build
```

`check` 校验版本、CSS/YAML、预设完整性、静态对比度和文档本地链接。`test` 在 Chromium 中验证默认值、配色、原生强调色优先级、阅读与编辑代码注释、链接、任务复选框、图标、焦点和减少动态效果，并在断网的浏览器环境中通过 `file://` 验证生成器预览、12 套预设、下载、原子导入和窄屏布局。CI 使用最小宿主样式，不包含 Obsidian 的应用程序代码。

本机可设置 `OBSIDIAN_ASAR` 指向已安装 Obsidian 的 `resources/obsidian.asar`，使用实际应用 CSS 运行同一组渲染检查。需要使用已安装的 Edge 时，设置 `PLAYWRIGHT_CHANNEL=msedge`。这仍是浏览器渲染检查，不能替代应用内交互、设备触控和配置重启验收。

测试结果与预览保存在 `test-results/`，发布产物保存在 `dist/`；两者均不提交到仓库。依赖版本由 `package-lock.json` 固定。

`color-generator/` 是可直接打开的离线网页，预览读取根目录的 `theme.css`。修改 CSS、预设或版本后运行 `npm run generator:sync`，更新本地颜色目录；新增颜色还需要补充 `palette.js` 的生成规则。`npm run generator:test` 检查 194 项规则、12 套预设、模式隔离、锁定和原子导入；`npm run check` 也会执行这些检查。目录内的 `package.json` 仅用于让维护脚本在主项目的 ES Module 环境中正确读取浏览器脚本，日常使用网页不需要 Node.js。

## 版本更新

1. 在 `releases/X.Y.Z.md` 写好版本说明，第一行使用 `# Phycat X.Y.Z`；同步更新 CHANGELOG。
2. 运行 `npm run release:prepare -- X.Y.Z`。脚本校验版本递增与标签未存在，再同步 manifest、package、lockfile 及生成器数据。
3. 执行上述验证、浏览器测试和构建，检查文件清单及 SHA256SUMS。
4. 提交到 `main`，创建与 manifest 一致的 `X.Y.Z` 标签（不加 `v`），推送分支和标签。
5. 检查 GitHub Actions 的验证与发布结果，再检查 Releases 的实际下载文件。

分支推送与 PR 只验证；数字开头的标签触发发布，并且必须完整匹配 manifest 版本。发布说明来自版本文件，不从提交消息拼接 shell 命令。发布任务只有在验证完成后获得仓库写权限。

完整 ZIP 包含 `Phycat/` 文件夹及离线配色生成器、预设、说明、图片和许可证；同时提供 Obsidian 自动更新需要的 `manifest.json`、`theme.css`、独立预设 ZIP 和 `SHA256SUMS`。Obsidian 自动更新器只获取核心文件，配色生成器需要从完整 ZIP 或仓库获取。

系统代理与认证由使用者的 Git 环境管理，仓库不保存代理地址或凭据。
