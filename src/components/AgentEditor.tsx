import { useState } from "react";
import {
  ArrowUpRight,
  RotateCcw,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import type { Role, Session } from "../types";
import { rolePresets } from "../types";
import { sharedPrompt, tutorPrompt } from "../lib/prompts";
import Modal from "./Modal";
export default function AgentEditor({
  initialAgent = 0,
  roles,
  shared,
  tutor,
  mode,
  onChange,
  onClose,
  inSession,
}: {
  initialAgent?: number;
  roles: [Role, Role];
  shared: string;
  tutor: string;
  mode: Session["mode"];
  onChange: (roles: [Role, Role], shared: string, tutor: string) => void;
  onClose: () => void;
  inSession: boolean;
}) {
  const [active, setActive] = useState(initialAgent);
  const [preview, setPreview] = useState(false);
  const text = active < 2 ? roles[active].duty : active === 2 ? tutor : shared;
  const update = (text: string) => {
    if (active < 2) {
      const next = structuredClone(roles);
      next[active].duty = text;
      onChange(next, shared, tutor);
    } else
      onChange(
        roles,
        active === 3 ? text : shared,
        active === 2 ? text : tutor,
      );
  };
  return (
    <Modal title="设计你的研究伙伴" onClose={onClose} wide>
      <div className="agent-editor">
        <div className="editor-intro">
          <span className="micro-label">AGENT STUDIO</span>
          <p>
            好的讨论，始于不同的视角。
            <br />
            定义他们如何思考、追问与解释。
          </p>
        </div>
        <div className="agent-editor-layout">
          <nav className="agent-tabs" aria-label="选择 Agent">
            {[roles[0].name, roles[1].name, "私人助教", "共同规范"].map(
              (name, i) => (
                <button
                  key={i}
                  className={active === i ? "selected" : ""}
                  onClick={() => {
                    setActive(i);
                    setPreview(false);
                  }}
                >
                  <span className={`agent-index agent-${i}`}>
                    {i < 3 ? (
                      ["A", "B", "T"][i]
                    ) : (
                      <SlidersHorizontal size={17} />
                    )}
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>
                      {
                        [
                          "解释与构建",
                          "质疑与检验",
                          "拆解与答疑",
                          "所有 Agent 共用",
                        ][i]
                      }
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ),
            )}
          </nav>
          <div className="prompt-workspace">
            <div className="prompt-heading">
              <span>
                {active === 3 ? "共同研究规范" : "系统提示词 · Prompt"}
              </span>
              <button
                className="text-button"
                onClick={() => setPreview(!preview)}
              >
                {preview ? "返回编辑" : "查看组合提示词"}
              </button>
            </div>
            {active < 2 && !preview && (
              <label className="agent-name">
                角色名称
                <input
                  value={roles[active].name}
                  onChange={(e) => {
                    const next = structuredClone(roles);
                    next[active].name = e.target.value;
                    onChange(next, shared, tutor);
                  }}
                />
              </label>
            )}
            {preview ? (
              <pre className="prompt-preview">
                {active === 3
                  ? shared
                  : shared +
                    "\n\n" +
                    (active < 2
                      ? `你的角色是「${roles[active].name}」。\n`
                      : "") +
                    text}
                {"\n\n[运行时另附：讨论主题、当前阶段、资料片段与历史对话。]"}
              </pre>
            ) : (
              <textarea
                className="prompt-editor"
                aria-label={
                  active === 3
                    ? "共同规范 Prompt"
                    : `${active < 2 ? roles[active].name : "私人助教"} Prompt`
                }
                value={text}
                onChange={(e) => update(e.target.value)}
                spellCheck={false}
              />
            )}
            <div className="prompt-meta">
              <span>{text.length} 字符 · 支持多段指令</span>
              <button
                onClick={() =>
                  update(
                    active < 2
                      ? rolePresets[mode][active].duty
                      : active === 2
                        ? tutorPrompt
                        : sharedPrompt,
                  )
                }
              >
                <RotateCcw size={13} />
                恢复默认
              </button>
            </div>
          </div>
        </div>
        <div className="editor-footer">
          <p>
            {inSession
              ? "修改用于本场尚未生成的下一次请求。"
              : "自动保存为此场景的新研讨默认配置。"}
            <br />
            模型、资料、主会场历史会在运行时加入上下文。
          </p>
          <button className="primary" onClick={onClose}>
            <Check size={16} />
            完成配置
          </button>
        </div>
      </div>
    </Modal>
  );
}
