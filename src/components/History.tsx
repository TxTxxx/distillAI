import { useState } from "react";
import { ArrowRight, Download, Search, Trash2, Upload, X } from "lucide-react";
import type { ResearchApp } from "../lib/useResearchApp";
import { findSessions, type HistoryFilter } from "../lib/researchHistory";
import { backup, download } from "../lib/storage";
import { exampleSession } from "../lib/demo";
import Modal from "./Modal";

export default function History({ app }: { app: ResearchApp }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const results = findSessions(app.history, query, filter);
  return (
    <Modal title="研讨记录" onClose={app.close} wide>
      <p className="history-intro">
        回到上次的问题，也找到已经留下的认识。记录保存在当前浏览器。
      </p>
      <div className="history-search">
        <Search size={18} aria-hidden="true" />
        <input
          aria-label="搜索研讨记录"
          placeholder="搜索主题、对话、资料或笔记"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="清除搜索"
            onClick={() => setQuery("")}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="history-filter-row">
        <div className="profile-tabs" aria-label="筛选研讨记录">
          {(
            [
              ["all", "全部记录"],
              ["notes", "已有笔记"],
              ["bookmarks", "有收藏"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span role="status">{results.length} 场研讨</span>
      </div>
      <div className="history-results">
        {results.map((item) => (
          <div className="history-row" key={item.id}>
            <button
              onClick={() => app.openSession(item)}
              aria-label={`继续阅读：${item.title}`}
            >
              <span>
                <strong>{item.title}</strong>
                <small>
                  {new Date(item.updatedAt).toLocaleDateString("zh-CN")} ·{" "}
                  {item.turns.filter((t) => t.status === "complete").length}{" "}
                  次发言 · {item.notes.trim() ? "已有笔记" : "待整理"}
                  {item.bookmarks.length > 0 &&
                    ` · ${item.bookmarks.length} 个收藏`}
                  {item.demo && " · 标注示例"}
                </small>
              </span>
              <ArrowRight size={18} />
            </button>
            <div className="history-item-actions">
              <button
                className="icon-button"
                aria-label={`导出会话：${item.title}`}
                onClick={() =>
                  download(
                    `guanyan-${item.id}.json`,
                    backup(item),
                    "application/json",
                  )
                }
              >
                <Download size={17} />
              </button>
              <button
                className="icon-button"
                aria-label={`删除会话：${item.title}`}
                onClick={() => app.setDeleteId(item.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
        {!results.length && (
          <div className="empty-state">
            <h3>
              {app.history.length
                ? "还没有匹配的研讨"
                : "第一场研讨，从一个问题开始。"}
            </h3>
            <p>
              {app.history.length
                ? "换个关键词，或查看全部记录。"
                : "讨论、收藏和笔记会一起留在这里。"}
            </p>
            <button
              className="secondary"
              onClick={() => {
                if (app.history.length) {
                  setQuery("");
                  setFilter("all");
                } else app.close();
              }}
            >
              {app.history.length ? "清除筛选" : "回到研究问题"}
            </button>
          </div>
        )}
      </div>
      <div className="history-actions history-footer">
        <button
          className="secondary"
          onClick={() => app.importRef.current?.click()}
        >
          <Upload size={16} />
          恢复会话备份
        </button>
        <button
          className="text-button"
          onClick={() => app.openSession(exampleSession())}
        >
          查看标注示例
        </button>
      </div>
    </Modal>
  );
}
