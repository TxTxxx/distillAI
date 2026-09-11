# 观研 · Guanyan

具身智能私人研讨室。两位研究伙伴连续对谈，第三位助教独立答疑。面向 World Model、VLA 与 World Action Model。

## 本地运行

需要 Node.js 24 和 npm。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。网页设置中的密钥只保留在当前页面内存；刷新后重新填写。模型配置、会话、笔记与资料保存在 IndexedDB，不需要账号。

```sh
npm test
npm run build
npm run preview
```

## 第一次使用

1. 打开「模型与声音」。填写你的接口类型、Base URL、模型 ID 与密钥，点击「检测模型」。不要把密钥写进源代码、GitHub Secrets 的前端构建变量或备份文件。
2. 要联网检索，使用支持原生搜索工具的 OpenAI Responses、Claude 或 Gemini 模型，并单独点击「检测联网」。通用兼容聊天接口不假设支持原生搜索。
3. 三位角色可以共用配置，也可分别分配。助教配置还用于讨论摘要、笔记和公式/代码的口播改写。
4. 选择研究研讨或研究面试，输入主题，按需加入 PDF、Markdown、TXT、粘贴材料或论文链接。PDF 上限 30 MB。
5. 听讲需要独立配置语音密钥和音色。支持 OpenAI Speech 与 ElevenLabs；设置页可试听中文技术文本。启用「双角色听讲」后开始。
6. 可以暂停、继续、结束；选中段落中的文字后点击「追问这段」，让助教围绕原文解释。点击「交给主会场」才会改变后续主讨论。

首页「查看标注示例」是人工编写的交互演示，明确标注，不代表真实 API 调用或论文实证结果。助教提问、笔记生成和语音试听仍需要真实 API。

## 接口和数据边界

| 类型          | Base URL 示例                                      | 调用方式                                         |
| ------------- | -------------------------------------------------- | ------------------------------------------------ |
| OpenAI        | `https://api.openai.com/v1`                        | `/responses`，流式事件；联网使用 `web_search`    |
| Claude        | `https://api.anthropic.com/v1`                     | `/messages`，原生流式消息与搜索工具              |
| Gemini        | `https://generativelanguage.googleapis.com/v1beta` | `streamGenerateContent`，Google Search grounding |
| 通用兼容      | 你的服务提供的前缀                                 | `/chat/completions`，SSE                         |
| OpenAI Speech | `https://api.openai.com/v1`                        | `/audio/speech`                                  |
| ElevenLabs    | `https://api.elevenlabs.io/v1`                     | `/text-to-speech/{voice_id}/stream`              |

所有请求从浏览器直接发送到你指定的服务。服务必须支持 CORS、相应模型和请求协议；能在命令行调用并不代表浏览器可以直连。应用不会通过公共代理转发密钥。页面脚本能够访问本次输入的密钥，因此按个人自带密钥工具使用；不要在公开仓库中嵌入共享密钥。

材料读取状态分为用户材料、提取正文、搜索摘要、尚未读取。搜索结果链接不等于已读全文；跨域限制的 URL 保留为尚未读取。PDF.js 提取文字并渲染原页，不执行 OCR，也不声称理解图表；公式、多栏文档应结合原页检查。上下文按主题相关性选取带页码的片段。

音频按完整段落准备和播放，下一段可在当前段播放时准备，后续主发言等待当前发言播放结束。复杂公式、代码与表格会调用助教模型改写为口播，因此有额外用量和延迟。定位精度为段落，不是逐字字幕。音频故障保留文字，提供重试与文字模式。

会话 JSON 备份包含提取文字、资料信息、对话和笔记；不包含密钥、原 PDF 二进制和音频缓存。恢复后需要原页时重新上传 PDF。关闭或休眠后不保证继续生成，重新打开后手动恢复。浏览器本机存储可能被清除，请定期导出。

## GitHub Pages 与子域名

1. 将此项目推送到[TxTxxx/distillAI](https://github.com/TxTxxx/distillAI) 的 `main` 分支。
2. 在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。工作流会安装依赖、运行测试、构建并发布 `dist`。
3. 在 **Settings → Pages → Custom domain** 填写你的完整子域名，`distill.txtxx.me`。等待 GitHub 检查。
4. 在 DNS 提供商添加该子域名的 CNAME，指向`txtxxx.github.io`，不包含仓库路径。
5. DNS 生效、证书签发后启用 **Enforce HTTPS**，检查首页、会话哈希地址刷新、模型与语音请求。

使用 GitHub Actions 部署时，域名在仓库 Pages 设置中管理，不依赖构建目录中的 CNAME 文件。当前 `base: './'` 同时兼容仓库子路径与独立域名；页面采用哈希路由，不需要服务器重写。

指定仓库为 `TxTxxx/distillAI`，子域名为 `distill.txtxx.me`；DNS / HTTPS 状态见验收记录。当前实现没有遥测、账号服务或自建后端。

## 结构

- `src/components/`：阅读工作台、助教、设置、资料与 PDF 原页。
- `src/lib/engine.ts`：主讨论、助教、摘要和笔记调度。
- `src/lib/api.ts`：原生接口、兼容接口与 SSE 解析。
- `src/lib/audio.ts`：语音合成、缓存、段落播放队列。
- `src/lib/materials.ts` 与 `storage.ts`：资料提取、上下文选择、本机持久化与导入导出。

验收结果与仍需真实凭据验证的项目见 [VALIDATION.md](VALIDATION.md)。
