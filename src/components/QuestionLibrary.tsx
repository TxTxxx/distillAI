import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { researchTracks } from "../lib/inspirations";
import type { Inspiration } from "../lib/inspirations";
import type { useInspirations } from "../lib/useInspirations";

type Library = ReturnType<typeof useInspirations>;
export default function QuestionLibrary({
  library,
  selected,
  onSelect,
  footer,
}: {
  footer?: ReactNode;
  library: Library;
  selected: string;
  onSelect: (item: Inspiration) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Inspiration>();
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState<Inspiration>();
  const save = async () => {
    if (!draft) return;
    if (await library.save(draft)) {
      setDraft(undefined);
      setMessage("问题已保存在本机。");
    }
  };
  return (
    <aside
      className={`question-index ${editing ? "is-editing" : ""}`}
      aria-label="研究问题库"
    >
      <div className="index-heading">
        <h2>从好奇心出发</h2>
        <div className="index-tools">
          <button
            aria-label="换一组问题"
            title="换一组问题"
            disabled={!library.ready || library.filtered.length <= 3}
            onClick={() => {
              library.shuffle();
              setMessage("已换一组问题。");
            }}
          >
            <RefreshCw size={15} />
            <span>换一组</span>
          </button>
          <button
            aria-expanded={editing}
            onClick={() => {
              setEditing(!editing);
              setDraft(undefined);
              setMessage("");
            }}
          >
            {editing ? <X size={15} /> : <Pencil size={15} />}
            <span>{editing ? "完成" : "编辑题库"}</span>
          </button>
        </div>
      </div>
      <p className="index-description">好的问题，能让研究走得更远。</p>
      <div className="track-filters" aria-label="筛选研究方向">
        {(["全部", ...researchTracks] as const).map((track) => (
          <button
            key={track}
            aria-pressed={library.track === track}
            className={library.track === track ? "active" : ""}
            onClick={() => library.chooseTrack(track)}
          >
            {track === "World Action Model" ? "WAM" : track}
          </button>
        ))}
      </div>
      {editing && (
        <div className="library-edit-actions">
          <button
            onClick={() =>
              setDraft({
                id: crypto.randomUUID(),
                tag: library.track === "全部" ? "World Model" : library.track,
                question: "",
                detail: "",
                prompt: "",
              })
            }
          >
            <Plus size={16} />
            添加问题
          </button>
          <button
            disabled={library.saving}
            onClick={() => void library.restoreDefaults()}
          >
            补回内置问题
          </button>
        </div>
      )}
      {draft ? (
        <form
          className="question-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h3>
            {library.items.some((x) => x.id === draft.id)
              ? "编辑问题"
              : "添加问题"}
          </h3>
          <label>
            研究方向
            <select
              value={draft.tag}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tag: e.target.value as Inspiration["tag"],
                })
              }
            >
              {researchTracks.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            问题标题
            <input
              required
              maxLength={160}
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            />
          </label>
          <label>
            简短说明
            <input
              maxLength={160}
              value={draft.detail}
              onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
            />
          </label>
          <label>
            发送给 Agent 的完整问题
            <textarea
              required
              maxLength={4000}
              rows={5}
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="button" onClick={() => setDraft(undefined)}>
              取消
            </button>
            <button
              className="primary"
              disabled={library.saving || !library.ready}
            >
              <Check size={16} />
              {library.saving ? "保存中…" : "保存问题"}
            </button>
          </div>
        </form>
      ) : (
        <div
          className="question-list"
          key={`${library.track}-${library.visible.map((x) => x.id).join("-")}`}
        >
          {(editing ? library.filtered : library.visible).map((item) => (
            <div
              className={`question-entry ${selected === item.id ? "selected" : ""}`}
              key={item.id}
            >
              <button
                className="question-select"
                onClick={() => onSelect(item)}
              >
                <strong>
                  {item.question.includes("，") ? (
                    <>
                      {item.question.slice(0, item.question.indexOf("，") + 1)}
                      <br />
                      {item.question.slice(item.question.indexOf("，") + 1)}
                    </>
                  ) : (
                    item.question
                  )}
                </strong>
                <ArrowRight size={22} />
                <span>{item.detail || item.tag}</span>
              </button>
              {editing && (
                <div className="entry-actions">
                  <button onClick={() => setDraft({ ...item })}>
                    <Pencil size={14} />
                    编辑
                  </button>
                  <button
                    disabled={library.saving}
                    aria-label={`移除问题：${item.question}`}
                    onClick={async () => {
                      if (await library.remove(item.id)) {
                        setRemoved(item);
                        setMessage("已移除，可撤销。");
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    移除
                  </button>
                </div>
              )}
            </div>
          ))}
          {!library.filtered.length && (
            <div className="index-empty">
              <p>这里还没有问题。</p>
              <button
                onClick={() => {
                  setEditing(true);
                  setDraft({
                    id: crypto.randomUUID(),
                    tag:
                      library.track === "全部" ? "World Model" : library.track,
                    question: "",
                    detail: "",
                    prompt: "",
                  });
                }}
              >
                <Plus size={16} />
                写下第一个问题
              </button>
            </div>
          )}
        </div>
      )}
      {library.error && (
        <p role="alert" className="inline-error">
          {library.error}
        </p>
      )}
      <p role="status" className="library-status">
        {message}
        {removed && (
          <button
            disabled={library.saving}
            onClick={async () => {
              if (await library.save(removed)) {
                setRemoved(undefined);
                setMessage("问题已恢复。");
              }
            }}
          >
            撤销移除
          </button>
        )}
      </p>
      {footer}
    </aside>
  );
}
