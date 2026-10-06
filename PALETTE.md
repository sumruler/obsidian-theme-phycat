# Phycat 颜色自定义与预设

主题使用 Style Settings 调色盘，分别保存亮色和暗色颜色。基础配色常驻显示，界面、标题装饰、代码、提示框、彩虹文件夹和高级组件颜色默认折叠。原有字体、排版、卡片布局与动效继续使用原来的设置。

彩虹文件夹采用浅色圆角标题行、彩色文件夹图标和细层级线，展开内容保持透明。七种颜色继续在 **Phycat 配色设置 → 彩虹文件夹** 中调整；选中文件跟随全局主色。折叠箭头位于标题右侧，关闭自定义文件夹图标时仍可使用，也便于配合 Iconize。

## 开始调色

1. 在 Obsidian 的社区插件中安装并启用 **Style Settings**。
2. 打开 **设置 → Style Settings → 🎨 Phycat 配色设置**。
3. 点击颜色按钮，在调色盘中选择颜色，也可以输入颜色值。每个项目有亮色、暗色两个按钮；带透明度的颜色可以同时调整透明度。
4. 标题文字颜色继续在 **Phycat 标题设置 → 标题文字颜色设置** 中调整，保留原有的 H1–H6 设置。

分组标题同时显示英文与中文。亮色 H2 胶囊的文字使用 **配色设置 → 标题装饰 → H2 胶囊标题文字**，其余 H2 样式使用标题文字颜色设置。默认强调色背景上的导航、行内代码悬停文字与对勾会自动选择黑白；开启 **手动设置强调色上的文字** 后，使用对应调色盘颜色。

颜色在保存后立即生效。全局主色优先在 **设置 → 外观 → 主题色** 中选择；Style Settings 的 **默认主色（预设）** 分别保存亮色、暗色的默认值，仅在原生主题色重置后使用。使用主色的标题装饰、列表、表格、标签和交互控件会统一跟随全局主色。渐变端点、光晕、代码高亮、提示框和其他独立颜色可以分别调整；导入预设后，这些独立颜色不会随着主色自动重新生成。

通过命令面板执行 **Style Settings: Show style settings view**，可以在独立面板中边看笔记边调色。

未安装或关闭 Style Settings 时，主题仍提供默认的亮色 **Sakura**、暗色 **Vampire**。插件保存的自定义颜色需要启用插件才能应用。

## 导入配色预设

在 **Style Settings** 面板顶部点击 **Import**：

- **文件导入**：点击 **Import from file**，选择下面的一份 JSON 文件。
- **粘贴导入**：打开 JSON 文件，复制全部内容，粘贴到导入窗口，再点击 **Save**。

亮色与暗色文件可以任意组合。每次导入完整覆盖对应模式的主题颜色和 H1–H6 标题文字颜色，保留另一模式、布局、字体、间距及其他插件的设置。导入之后仍可以继续用调色盘修改。

| 模式 | 配色 | 文件 |
| --- | --- | --- |
| 亮色 | 🌸 Sakura · 樱花（默认） | [sakura.json](presets/light/sakura.json) |
| 亮色 | 🌊 Mint · 薄荷 | [mint.json](presets/light/mint.json) |
| 亮色 | ☁️ Sky · 天空 | [sky.json](presets/light/sky.json) |
| 亮色 | 🌲 Forest · 森林 | [forest.json](presets/light/forest.json) |
| 亮色 | 🟣 Mauve · 锦葵紫 | [mauve.json](presets/light/mauve.json) |
| 亮色 | 🌅 Golden Hour · 午后黄昏 | [golden.json](presets/light/golden.json) |
| 亮色 | 🍒 Cherry · 樱桃 | [cherry.json](presets/light/cherry.json) |
| 亮色 | ⚓ Prussian · 普鲁士蓝 | [prussian.json](presets/light/prussian.json) |
| 暗色 | 🧛 Vampire · 吸血鬼（默认） | [vampire.json](presets/dark/vampire.json) |
| 暗色 | 🌌 Abyss · 深渊 | [abyss.json](presets/dark/abyss.json) |
| 暗色 | ☢️ Radiation · 生化辐射 | [radiation.json](presets/dark/radiation.json) |
| 暗色 | 🌲 Everforest · 暖绿森林 | [everforest.json](presets/dark/everforest.json) |

主题更新器通常只安装 `theme.css` 和 `manifest.json`。如果主题文件夹没有 `presets` 目录，请另外从主题发布包或仓库下载所需 JSON，再通过 Import 导入。

Everforest 使用[官方暗色调色板](https://github.com/sainnhe/everforest/blob/master/palette.md)中的深绿灰背景 `#272E33`、暖灰文字 `#D3C6AA` 和森林绿主色 `#A7C080`，同时提供配套的代码高亮、提示框、标题和文件夹颜色。导入 `presets/dark/everforest.json` 后即可使用。

## 编辑模式代码块间距

在 **Style Settings → 📏 Phycat 文章间距设置** 中，使用 **编辑模式代码标题栏上下留白**（默认 `2px`）和 **编辑模式代码第一行顶部留白**（默认 `10px`）分别调整语言标题栏高度与第一行代码的间距。这两个选项只影响编辑模式；后续代码行距与阅读模式样式保持原来的设置。

## 升级旧版配色

新版移除了亮色／暗色配色下拉框，旧选择不会自动转换为调色盘配置。升级后分别导入对应的亮色和暗色预设，即可恢复那两套配色；旧下拉框的配置不再控制颜色。

例如，原先使用 **Mint + Radiation** 时，依次导入 `presets/light/mint.json` 和 `presets/dark/radiation.json`。建议升级前用 Style Settings 的 **Export** 保存现有配置，便于查阅原先的配色选择和其他自定义。

预设保留旧主题的渐变、代码区域背景及森林标题阴影，并调整代码注释、强调色文字与亮色胶囊文字的对比度。主色按下面的原生主题色规则统一；暗色 Bug 提示框同时修复了旧规则中的无效注释结束符。

## 原生主题色的优先级

**设置 → 外观 → 主题色**（原生强调色 / Accent color）优先控制全局主色。链接、按钮、复选框、激活状态，以及标题装饰、列表、表格、标签和引用装饰中使用主色的部分都会跟随它；交互悬停使用 Obsidian 的派生强调色。

原生主题色未自定义或点击重置后，全局主色恢复为当前亮色／暗色调色盘的 **默认主色（预设）**。自定义原生主题色时，亮暗模式共用这个主色；重置后恢复各自的默认主色。导入预设不会修改外观中的原生主题色，因此不会替换正在生效的自定义原生主色。

辅助色、背景、文字、独立标题颜色、渐变端点、光晕、代码高亮、提示框和彩虹文件夹继续使用对应的调色盘设置。主题通过原生 accent HSL 默认值提供预设主色，并通过 `--color-accent` 读取最终主色，遵循外观设置的优先级。颜色入口参考 [Obsidian 官方颜色文档](https://docs.obsidian.md/Reference/CSS%20variables/Foundations/Colors)；调色盘和配置格式使用 [Style Settings](https://github.com/community-archive/obsidian-style-settings#variable-themed-color)。

## 保存自己的配色

在 **🎨 Phycat 配色设置** 分组标题上点击 **Export settings**，导出主题调色盘配置。若还修改了标题文字颜色，也导出 **Phycat 标题设置 → 标题文字颜色设置** 分组的配置；这两个文件可以依次导入。面板顶部的 **Export** 会导出所有 Style Settings 设置，包括布局和其他主题、插件设置。

如需制作只针对一个模式的个人预设，保留配色 JSON 中以 `@@light` 或 `@@dark` 结尾的项目，并加上对应的 `phycat-headings@@h1-light-color` 至 `h6-light-color`，或 `h1-dark-color` 至 `h6-dark-color` 项目。不要加入布局和间距设置。内置预设可直接作为模板。

重新导入 Sakura 或 Vampire 可以恢复对应模式的完整默认颜色。使用配色分组的 **Reset all settings to default** 会同时重置亮暗两套调色盘；标题文字颜色需要在标题颜色分组单独重置。

## 验收检查

- 切换亮色／暗色，检查标题、代码、提示框和文件夹颜色。
- 切换平铺／卡片布局，检查背景、边框和弹窗。
- 在阅读模式与实时预览中检查代码、选区、链接与复选框。
- 连续导入两份同模式预设，确认第二份完整替换颜色，另一模式和间距设置保持原值。
- 设置原生主题色，检查交互和使用主色的标题装饰、列表、表格、标签同时跟随；切换亮暗模式并导入其他预设，确认原生主色保持优先。重置后确认恢复对应模式的预设主色；重新打开 Obsidian 后检查配置仍然生效。

发布流程验证 CSS、设置 YAML、预设键与颜色，并在 Chromium 中检查渲染与原生主题色优先级。本机还可使用 Obsidian 原生 CSS 验证；实际设置面板、移动端触控及应用重启需要应用内验收。
