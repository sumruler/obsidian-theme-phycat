# Phycat 0.3 升级说明

0.3 使用 Style Settings 调色盘和 JSON 预设替代旧版配色下拉框。最低 Obsidian 版本继续为 1.9.0。

## 从 0.2.x 升级

1. 在 Style Settings 顶部点击 **Export**，保存现有设置并记下亮暗配色名称。
2. 更新主题；自动更新后如没有预设文件，另行下载 Releases 中的 `phycat-presets-X.Y.Z.zip`。
3. 使用 **Import → Import from file**，分别导入对应的亮色、暗色 JSON。Ocean 对应 Mint；Cheery 对应 Cherry。
4. 保留并检查原有布局、间距、标题大小等设置。预设只写入对应模式的颜色及 H1–H6 文字颜色。
5. 若外观中设置过自定义主题色，它仍优先于预设主色。需要完全恢复预设时，重置 **外观 → 主题色**。

旧下拉框的数据不再驱动颜色；主题 CSS 无法自动读取并转换旧插件配置。没有导入预设时显示 Sakura / Vampire。

## 已使用调色盘的用户

0.3.3 调整了预设中的代码注释和强调色文字颜色。已保存的颜色不会被更新自动覆盖；重新导入相同预设可应用这些改进，但会替换对应模式的自定义颜色及标题文字颜色。请先 Export 备份。

强调色文字默认自动选择黑色或白色。如果希望继续使用自己设定的导航、行内代码悬停文字和对勾颜色，请开启 **配色设置 → 手动设置强调色上的文字**，并自行检查对比度。

亮色胶囊 H2 的文字在 **配色设置 → 标题装饰 → H2 胶囊标题文字** 设置；其他样式使用 **标题设置 → 标题文字颜色**。H2 前后间距统一默认值为 1.5。

文件与文件夹图标分别开关。识别到插件注入的图标时，主题图标自动隐藏；特殊插件结构可以手动关闭对应图标开关。自定义 CSS snippets 的优先级也可能影响最终显示。

## English migration notes

Export Style Settings before upgrading from 0.2.x. Record the old light/dark schemes, update the theme, then import their JSON presets separately. Ocean maps to Mint; Cheery maps to Cherry. Existing layout and spacing settings remain separate from palette imports. Native Appearance accent overrides the preset primary until reset.

Existing palette users must re-import a preset to receive its improved comment and text colors; doing so replaces that mode's saved palette and heading colors. Back up custom colors first. Enable **Manual accent text colors** if you prefer your own accent text colors. Light capsule H2 text uses its own palette control.
