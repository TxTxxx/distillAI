---
name: 观研 · Alphabet Storm
description: 冷白研究空间中，重黑中文问题化为两束文字流，再回到稳定的阅读与操作。
colors:
  ink: "#11151b"
  muted: "#616977"
  line: "#d9dee7"
  paper: "#fbfcfe"
  blue: "#1847f7"
  teal: "#15796f"
  blue-hover: "#1744bd"
  white: "#ffffff"
  hover-surface: "#eef1f6"
  selected-surface: "#eaf0ff"
  inset-surface: "#f5f7fa"
  chip-surface: "#edf1f8"
  danger: "#a93038"
typography:
  display:
    fontFamily: '"Bitcount Grid Single", ResearchDisplay, "PingFang SC", sans-serif'
    fontSize: "clamp(70px, 11.83vw, 178px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.04em"
  wordmark:
    fontFamily: 'ResearchDisplay, "PingFang SC", sans-serif'
    fontSize: "46px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "clamp(24px, 2.3vw, 34px)"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  question-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "calc(26 * var(--layout-unit, 1px))"
    fontWeight: 750
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "17px"
    lineHeight: 1.95
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
  prompt:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    lineHeight: 1.85
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.88em"
rounded:
  inline-code: "3px"
  compact-control: "4px"
  control: "5px"
  dialog: "8px"
  homepage-control: "calc(5 * var(--layout-unit, 1px))"
spacing:
  desktop-layout-unit: "calc(100vw / 1505)"
  compact: "8px"
  control-gap: "12px"
  group-gap: "20px"
  section-gap: "24px"
  panel-inset: "28px"
  spacious-gap: "30px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
    textColor: "{colors.white}"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-text:
    textColor: "{colors.blue}"
    padding: "10px 12px"
  input:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation:
    textColor: "{colors.ink}"
    height: "calc(96 * var(--layout-unit, 1px))"
  source-chip:
    backgroundColor: "{colors.chip-surface}"
    textColor: "{colors.ink}"
    padding: "3px 8px"
  agent-control:
    textColor: "{colors.ink}"
    rounded: "{rounded.homepage-control}"
    padding: "calc(14 * var(--layout-unit, 1px)) calc(15 * var(--layout-unit, 1px))"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    width: "min(600px, calc(100vw - 32px))"
---

# Design System: 观研

## Overview

**Creative North Star: "Alphabet Storm · 文字流动"**

冷白纸面、重黑中文与有方向的文字碎片共同构成观研的视觉世界。问题具有强烈的字形尺度，钴蓝让操作明确，青绿区分质疑与检验的研究角色。界面强调真实可编辑的研究问题和清楚的工作边界。

进入讨论后，视觉密度转为适合长文的连续阅读流。文字风暴是提问表面的局部表达；输入框、操作和正文保持稳定。资料、模型、角色与私人助教沿用同一套细边界和轻微圆角。

**Key Characteristics:**

- 冷白底、墨黑文字、钴蓝动作、青绿角色。
- 超大中文标题与细分隔线形成尺度对比。
- 两束文字碎片连接问题字形；动效有限时长。
- 扁平工作面、舒展正文、少量状态底色。

本文件由实际 `src/styles.css`、`src/App.tsx` 与 Launch、QuestionLibrary、GlyphField、Room、AgentEditor、Settings 组件提取。方向来自用户选择的「文字流动」，最终 index 构图由用户授权选择，批准图为 `.impeccable/mocks/index.png`。这是实现记录，不是质量验收证书。

## Colors

主色保持冷、清楚、有墨色重量。前言中的颜色值是规范来源；`ink`、`muted`、`line`、`paper`、`blue`、`teal` 对应 CSS 同名自定义属性，其余为代码中重复使用的字面值。

### Primary

- **钴蓝 `blue`**：开始、提交、文字动作、焦点、当前筛选线和角色 A。主按钮悬停使用 `blue-hover`。

### Secondary

- **研究青绿 `teal`**：角色 B、质疑与检验身份，以及运行状态点。身份仍由名称和文字标注。

### Neutral

- **墨黑 `ink`**：标题、正文、默认控件。
- **冷白 `paper`**：页面与弹窗表面；`white` 为实心动作上的文字。
- **石灰蓝 `muted`**：说明、元信息、次要标注。
- **薄雾边界 `line`**：工作区、条目、对话段与表单的细分隔。
- **交互雾面 `hover-surface`**：悬停与代码背景。
- **选中浅蓝 `selected-surface`**：已选角色、配置项和正在朗读的段落。
- **内嵌纸面 `inset-surface`**：提示词编辑区；`chip-surface` 用于已导入资料。

### Status

- **删除红 `danger`**：破坏性动作；错误说明另有就地红色文字。状态始终配合可读的文字，不依赖色彩单独传达。

**The Role Color Rule.** 角色 A 沿用钴蓝，角色 B 沿用青绿；保留角色名字和职责，不能只靠颜色辨认。

## Typography

**Display Font:** 自托管 `ResearchDisplay`，实际文件是 Noto Sans SC 的 900 字重中文子集，位于 `public/fonts/research-display.ttf`，使用 `font-display: swap`。来源记录在 `public/fonts/ORIGIN.md`，SIL Open Font License 1.1 保存在 `public/fonts/OFL.txt`。子集外文字使用系统字体。标题 CSS 首位仍列有 `Bitcount Grid Single`，但仓库没有提供该字体；不得将它描述为已加载的字体资产。

**Body Font:** macOS/iOS 系统字体、PingFang SC、Microsoft YaHei 和 sans-serif 回退。**Code Font:** 系统等宽字体。中文讲解保留 World Model、VLA、WAM 等常用英文术语。

### Hierarchy

- **Display**：前言为大桌面（≥1301px）两行短标题的最终样式，另叠加水平压缩（0.78）、文字描边（1.1px）和向右消散遮罩。通用样式为 `clamp(70px, 12.42vw, 187px)`、行高 1.04、水平压缩 0.76；≤900px 使用 12vw；≤680px 使用 `clamp(65px, 19vw, 125px)`、行高 1.1、水平压缩 0.81。
- **Long title**：单段或自定义题目用 `clamp(40px, 5vw, 78px)`、行高 1.4，自然换行并取消水平压缩。手机降为 35px、行高 1.5。编辑内置题目名称后，标题同步显示已编辑文字。
- **Wordmark**：桌面如前言；平板为 38px，手机为 32px。
- **Headline / Question title**：讨论主题使用 headline；题库列表使用 question-title，在大桌面随布局单位比例变化；窄桌面、平板、手机分别调整为 23px、20px、21px。
- **Body**：长文采用前言 body；手机仍保留 17px，行高为 1.9。单条讨论正文最大宽度 780px。
- **Label / Prompt**：13px 标签用于状态与工具；提示词编辑采用 prompt。小屏部分紧凑辅助说明为 10–12px；这记录当前实现，不代表所有小字已经通过放大验收。

**The Stable Reading Rule.** 研究正文与真实输入保持自然文字布局；超大、压缩、遮罩字形只服务于短问题的展示层。

## Layout

首页是全宽工作台。以下桌面尺寸以批准构图宽度 1505px 为基准：顶部栏高度 96px、左右内边距 36px；问题索引与起草区按 31.3% / 剩余宽度分栏。索引内边距为 48px 34px 24px，起草区为 54px 38px 24px。分隔来自细线，页面没有总宽度上限。

当视口 ≥1301px 且不在阅读模式时，`.app:not(.reading-mode)` 设置 `--layout-unit: calc(100vw / 1505)`，对应前言的 `spacing.desktop-layout-unit`。首页与顶栏相关布局值使用 `calc(N * var(--layout-unit, 1px))`；因此上述尺寸在 1505px 保持原样，在 1440px 按约 0.957 缩放，顶栏约为 91.85px。固定 1px 边线保留清晰度。字标、控件及正文的字体尺寸保持现有值；题库大标题行、条目说明与筛选文字随布局单位缩放，原 15px 的说明在 1301px 约为 12.97px。主展示标题仍使用自身的响应式字号。阅读模式不设置此变量，采用 1px 回退；≤1300px 的既有断点规则不受此次大桌面修正改变。

| 范围    | 当前实现                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| ≥1301px | 大标题最终构图；首页几何尺寸用视口 / 1505 的布局单位。导航间距基准 52px、主动作高度基准 60px；原绝对定位偏移与留白同样按该单位变化。                  |
| ≤1300px | 索引标题允许换行；两栏内距缩为 24px / 28px；隐藏模式说明，压缩伙伴与收束设置。                                                                        |
| ≤1150px | 讨论室私人助教栏从 360px 缩为 310px。                                                                                                                 |
| ≤900px  | 顶栏 78px；首页分栏变为 33% / 剩余宽度；伙伴和控制可换行。讨论室变单栏，助教以最大 440px 的侧面板打开。                                               |
| ≤680px  | 顶栏 68px，导航用有可访问名称的图标；首页先起草后题库。起草区水平内距 20px，动作高 48px；助教改为覆盖全屏的面板。编辑角色变横向标签，设置表单变单列。 |

讨论室占视口剩余高度，主讨论区独立滚动。代码块、表格和公式提供局部横向滚动；长题目和正文可断行。弹窗最大高度为 90dvh，普通 / 宽弹窗的最大宽度分别为 600px / 1020px，左右至少保留 16px。

**记录与验收边界：** 本次重建的界面 brief 与最终桌面比例规则已同步，平板顶栏 78px、手机 68px。主流程报告最新 mechanical responsive gate 已通过并从 responsive 推进到 review，桌面对比约 87%。旧失败记录曾读取过期的 `desktop.png.png` 解码中间文件；该缓存归档并重跑，导航整体、题库操作、筛选与模式选择的参考框也按批准构图修正。最新桌面比例修正已获独立复核确认，1440px / 1505px 未发现回归，此前两项实质修正也已解决；最终 disposition 为 ship，构建流程全部阶段于 2026-09-12T21:41:16.896Z 关闭。该结论限定于此次视觉与实现复核范围；200% 文字缩放、真实 API 调用和长时间 TTS 播放仍未独立验收。以上断点描述当前 CSS 行为，应随后续修复刷新。

## Elevation & Depth

默认表面是扁平的，使用边线、间距与浅色块划分层级。弹窗以半透明墨色遮罩（`#10182366`）隔开上下文，不添加通用卡片投影。实际例外有两个：正在朗读的段落用 `0 0 0 8px #eaf0ff` 扩展高亮；≤900px 的助教侧面板用 `-16px 0 40px #172e5020` 表示覆盖。手机全屏助教取消该阴影。

**The Flat Worksurface Rule.** 普通工作面依赖边线和留白；只有覆盖面板和朗读状态使用现有阴影词汇。

## Shapes

表单、按钮和伙伴控件使用轻微圆角，弹窗略大；详见前言 rounded。首页伙伴控件与部分紧凑控件的圆角也应用大桌面布局单位，通用表单与弹窗保留固定圆角。索引条目和正文是开放行，保持直线边界。图标按钮为紧凑方形命中区；运行点为圆形。不要把所有内容重新包进圆角卡片。

## Components

### Buttons

主动作使用实心钴蓝与白字，最小高度 44px；次动作保持透明底、`#abb4c3` 边线；文字动作使用钴蓝。一般悬停为浅灰蓝，主动作悬停为更深蓝。禁用时透明度 0.45、不可用光标。按钮、链接和表单键盘焦点采用 2px 钴蓝轮廓，偏移 4px。状态色过渡为 180ms ease-out。开始研讨使用更宽、更高的主动作变体，并在尚未加载或问题为空时禁用。

### Navigation / Filters

桌面导航为文字，当前页由底部 2px 钴蓝线标识。手机隐藏可见文字，保留图标与可访问名称。题库方向筛选是可横滚的文字标签，选中项加重并加底线；模式切换则是同一细边框内的实心蓝选中区。

### Question Index

问题是可选择的开放条目，标题、简短说明和向右箭头构成一行组。选中条目边界变蓝，悬停箭头移动基准 5px，大桌面按布局单位缩放。编辑模式缩小条目字体并显示编辑动作；新增、编辑、删除后撤销、恢复内置条目、保存中、错误、空列表均保留实际状态文案。选择问题会更新起草问题；自定义长标题进入自然换行样式。

### Inputs / Source Chips

普通输入为透明底、细边框、轻圆角；文字光标为钴蓝。研究主题是无框大输入，仍是可聚焦、可调整高度的 textarea。提示词使用内嵌浅底、多行编辑区；组合预览保留换行。已添加资料使用紧凑浅底标签与有名称的删除动作，长文件名可断行。材料输入范围是 PDF、文字、链接。

### Agent Controls / Dialogs

主页三个伙伴控件显示名字、职责与编辑箭头；角色 B 的身份图标为青绿。角色编辑在宽弹窗中使用 192px 左侧选项栏与正文提示词区，支持名称、职责、共同规范、组合预览和恢复默认。配置即时保存的说明属于操作上下文。Settings 复用弹窗、分段导航、配置标签与表单，明确展示检测中和实际返回结果。

### Reading Room

连续讨论按轮次、角色名称、正文和行内工具组织；角色 A 为蓝、角色 B 为青绿。助教位于独立侧栏，移动端用覆盖面板。朗读高亮依附当前段落，桌面播放按钮在悬停或键盘焦点出现，手机始终可见。资料和笔记与助教共享安静的辅助面板语言。

### Glyph Field

代码生成的 canvas 是辅助视觉，使用 `aria-hidden="true"`；可读标题仍是 DOM 文字。每次标题变化生成确定性随机的 2100 个字形，两束中心约在高度的 25% 与 66%，向右逐渐发散，避免矩形云团轮廓。过渡仅运行一次，时长 1200ms，采用 `1 - (1 - progress)^4` 收束；结束后停止持续动画帧。指针仅在局部 95px 半径产生最多 15px 位移，并按事件重绘。像素比最多取 2。

减少动态效果时直接绘制最终静态状态，关闭指针推力；全局 CSS 同时禁用动画、过渡和顺滑滚动。较长标题旁的字形流减弱透明度，手机也缩小覆盖面积。短标题的两束文字是此方向的签名，不要用无关插画代替。

## Do's and Don'ts

### Do:

- **Do** 保持冷白工作面、墨黑标题、钴蓝动作和青绿角色 B 的职责分工。
- **Do** 让真实输入、长题目、正文、公式和代码保持可读且可操作。
- **Do** 在题目切换后使用一次有界文字流，并尊重减少动态效果偏好。
- **Do** 为颜色、图标与状态提供名称、文字和键盘焦点。
- **Do** 将响应式实际代码、批准构图和测试结论分别记录。

### Don't:

- **Don't** 将研究首页恢复为侧边栏、营销英雄区和重复卡片的组合。
- **Don't** 为普通阅读面增加通用投影、装饰插画或持续循环的文字风暴。
- **Don't** 对自定义长问题套用两行超大标题的压缩与遮罩。
- **Don't** 把生成构图中的虚构账户、历史或不支持的材料类型带入产品。
- **Don't** 把视觉相似度、演示内容或本文视为响应式与真实 API 调用通过的证明。
