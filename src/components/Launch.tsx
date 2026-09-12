import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Globe,
  Headphones,
  Paperclip,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import type { ResearchApp } from "../lib/useResearchApp";
import { useInspirations } from "../lib/useInspirations";
import { rolePresets } from "../types";
import { defaultInspirations, type Inspiration } from "../lib/inspirations";
import GlyphField from "./GlyphField";
import QuestionLibrary from "./QuestionLibrary";

export default function Launch({ app }: { app: ResearchApp }) {
  const library = useInspirations();
  const [selected, setSelected] = useState("starter-1");
  const [expanded, setExpanded] = useState(false);
  const [chosen, setChosen] = useState(false);
  const select = (item: Inspiration) => {
    setSelected(item.id);
    setChosen(true);
    app.setTopic(item.prompt);
  };
  const selectedItem = library.items.find((item) => item.id === selected);
  const original = defaultInspirations.find((item) => item.id === selected);
  const shortTitles: Record<string, string[]> = {
    "starter-1": ["想象世界", "指导行动？"],
    "starter-2": ["理解语言", "学会行动？"],
    "starter-3": ["预测世界", "生成动作？"],
  };
  const title =
    selectedItem && selectedItem.question !== original?.question
      ? [selectedItem.question]
      : (shortTitles[selected] ?? [selectedItem?.question ?? "研究问题"]);
  const currentTitle =
    !chosen && app.topic && app.topic !== "模型的预测误差如何影响长期规划？"
      ? ["研究问题"]
      : title;
  return (
    <main className="launch-workspace">
      <QuestionLibrary
        library={library}
        selected={selected}
        onSelect={select}
      />
      <section className="draft-sheet" aria-label="新的研讨">
        <div className="draft-top">
          <div className="mode-tabs">
            {(["research", "interview"] as const).map((mode) => (
              <button
                key={mode}
                className={app.mode === mode ? "selected" : ""}
                aria-pressed={app.mode === mode}
                onClick={() => {
                  app.setMode(mode);
                  app.setRoles(
                    structuredClone(
                      app.settings.prompts[mode] ?? rolePresets[mode],
                    ),
                  );
                }}
              >
                {mode === "research" ? "研究研讨" : "高阶研究面试"}
              </button>
            ))}
          </div>
          <p>与 AI 共同思考，探索更深的问题。</p>
        </div>
        <div
          className={`question-stage ${currentTitle.length === 1 ? "long-title" : ""}`}
        >
          <h1 key={currentTitle.join("")}>
            {currentTitle.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <GlyphField text={currentTitle.join("")} />
        </div>
        <label className="query-field">
          <span className="sr-only">研究主题</span>
          <textarea
            rows={1}
            value={app.topic}
            placeholder="模型的预测误差如何影响长期规划？"
            onChange={(e) => app.setTopic(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") app.enter();
            }}
          />
        </label>
        {app.sources.length > 0 && (
          <div className="source-chips">
            {app.sources.map((source) => (
              <span key={source.id}>
                <FileText size={14} />
                {source.title}
                <button
                  aria-label={`移除资料：${source.title}`}
                  onClick={() =>
                    app.setSources((old) =>
                      old
                        .filter((x) => x.id !== source.id)
                        .map((x, i) => ({ ...x, label: `S${i + 1}` })),
                    )
                  }
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="draft-actions">
          <button
            className="secondary"
            onClick={() => app.setModal("materials")}
          >
            <Paperclip size={19} />
            添加资料
            <ChevronDown size={16} />
          </button>
          <button
            className="primary start-discussion"
            disabled={!app.loaded || !app.topic.trim()}
            onClick={app.enter}
          >
            开始研讨
            <ArrowRight size={22} />
          </button>
        </div>
        <div className="agent-roster">
          {[...app.roles, { name: "私人助教", duty: "" }].map((role, i) => (
            <button
              className={`agent-control role-${i}`}
              key={i}
              onClick={() => {
                app.setEditorAgent(i);
                app.setModal("roles");
              }}
            >
              <UserRound size={26} />
              <span>
                <strong>{role.name}</strong>
                <small>
                  {
                    [
                      "提出问题 · 探索思路",
                      "质疑假设 · 检验证据",
                      "整理信息 · 辅助推理",
                    ][i]
                  }
                </small>
              </span>
              <ChevronDown size={14} />
            </button>
          ))}
          <button
            className="roster-edit"
            aria-label="调整角色"
            onClick={() => {
              app.setEditorAgent(0);
              app.setModal("roles");
            }}
          >
            <Settings2 size={20} />
            <span>调整角色</span>
          </button>
        </div>
        <div className="discussion-controls">
          <label className="stop-switch">
            <input
              type="checkbox"
              checked={app.autoStop}
              onChange={(e) => app.setAutoStop(e.target.checked)}
            />
            <span>
              <strong>{app.autoStop ? "自主收束" : "固定轮数"}</strong>
              <small>
                {app.autoStop
                  ? "讨论充分后总结，保留轮数上限。"
                  : "按设定轮数推进讨论。"}
              </small>
            </span>
          </label>
          <label className="round-selector">
            {app.autoStop ? "最多" : "固定"}
            <select
              aria-label="讨论轮数"
              value={app.rounds}
              onChange={(e) => app.setRounds(Number(e.target.value))}
            >
              {[4, 8, 12, 20, 30].map((n) => (
                <option value={n} key={n}>
                  {n} 轮
                </option>
              ))}
            </select>
          </label>
          <button
            className="more-options"
            aria-label="更多设置"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <Settings2 size={16} />
            更多设置
          </button>
        </div>
        {expanded && (
          <div className="extras">
            <label>
              <input
                type="checkbox"
                checked={app.search}
                onChange={(e) => app.setSearch(e.target.checked)}
              />
              <Globe size={15} />
              联网查找资料
            </label>
            <label>
              <input
                type="checkbox"
                checked={app.voice}
                onChange={(e) => app.setVoice(e.target.checked)}
              />
              <Headphones size={15} />
              双角色听讲
            </label>
            <button onClick={() => app.setModal("settings")}>
              配置模型与声音
            </button>
          </div>
        )}
        <p className="local-note">资料与记录保存在本机</p>
      </section>
    </main>
  );
}
