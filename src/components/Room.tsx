import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  BookMarked,
  Bookmark,
  Check,
  ChevronRight,
  Download,
  FileText,
  Globe,
  Headphones,
  LoaderCircle,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Send,
  Settings2,
  NotebookPen,
  Square,
  Volume2,
  X,
  ExternalLink,
  Pencil,
} from "lucide-react";
import type { Settings, Source } from "../types";
import type { ResearchEngine, EngineState } from "../lib/engine";
import { paragraphs } from "../lib/audio";
import { safeUrl, checkConfig, errorMessage } from "../lib/api";
import { download } from "../lib/storage";
import { appendExcerpt, hasExcerpt } from "../lib/researchHistory";
import Markdown from "./Markdown";
import Modal from "./Modal";
const PdfViewer = lazy(() => import("./PdfViewer"));
export default function Room({
  engine,
  state,
  settings,
  setSettings,
  onMaterials,
  onRoles,
  onSettings,
  onExport,
}: {
  engine: ResearchEngine;
  state: EngineState;
  settings: Settings;
  setSettings: (s: Settings) => void;
  onMaterials: () => void;
  onRoles: () => void;
  onSettings: () => void;
  onExport: (type: "json" | "md") => void;
}) {
  const s = state.session!;
  const [tab, setTab] = useState<"tutor" | "sources" | "notes">("tutor");
  const [question, setQuestion] = useState("");
  const [anchor, setAnchor] = useState<{ id: string; quote: string }>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 900px)").matches,
  );
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = matchMedia("(max-width: 900px)");
    const sync = () => setNarrow(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!panelOpen || !narrow || !panel.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const background = [
      document.querySelector<HTMLElement>(".app-header"),
      document.querySelector<HTMLElement>(".main-stage"),
    ];
    background.forEach((element) => {
      if (element) element.inert = true;
    });
    const focusables = () =>
      Array.from(
        panel.current!.querySelectorAll<HTMLElement>(
          "button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]",
        ),
      ).filter((element) => element.getClientRects().length);
    focusables()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPanelOpen(false);
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const target = event.shiftKey ? items.at(-1) : items[0];
      if (
        (event.shiftKey && document.activeElement === items[0]) ||
        (!event.shiftKey && document.activeElement === items.at(-1))
      ) {
        event.preventDefault();
        target?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      background.forEach((element) => {
        if (element) element.inert = false;
      });
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [panelOpen, narrow]);
  const [view, setView] = useState<{ source: Source; page?: number }>();
  const [editNotes, setEditNotes] = useState(false);
  const [follow, setFollow] = useState(s.turns.length === 0);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const closeView = useCallback(() => setView(undefined), []);
  const tutorScroll = useRef<HTMLDivElement>(null);
  const tutorFollow = useRef(true);
  useEffect(() => {
    setAnchor(undefined);
    setQuestion("");
    setFollow(s.turns.length === 0);
    setView(undefined);
    setEditNotes(false);
  }, [s.id]);
  const readingKey = `guanyan-reading:${s.id}`;
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    try {
      const saved = Number(localStorage.getItem(readingKey));
      element.scrollTop = Number.isFinite(saved) ? Math.max(0, saved) : 0;
    } catch {
      /* Storage is optional. */
    }
    const save = () => {
      try {
        localStorage.setItem(readingKey, String(element.scrollTop));
      } catch {
        /* Keep reading without persistence. */
      }
    };
    element.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      save();
      element.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
    };
  }, [readingKey]);
  const lastText = useRef(s.turns.at(-1)?.text);
  useEffect(() => {
    const text = s.turns.at(-1)?.text;
    if (text !== lastText.current && follow && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
    lastText.current = text;
  }, [s.turns.at(-1)?.text, follow]);
  const lastTutorText = useRef(s.tutor.at(-1)?.text);
  useEffect(() => {
    const text = s.tutor.at(-1)?.text;
    if (
      text !== lastTutorText.current &&
      s.tutor.length &&
      tutorFollow.current &&
      tutorScroll.current
    )
      tutorScroll.current.scrollTop = tutorScroll.current.scrollHeight;
    lastTutorText.current = text;
  }, [s.tutor.at(-1)?.text]);
  const showSource = (label: string, page?: number) => {
    const source = s.sources.find((x) => x.label === label);
    if (source) setView({ source, page });
  };
  const openPanel = (next: typeof tab) => {
    setTab(next);
    setPanelOpen(true);
  };
  const jump = (id: string) => {
    setFollow(false);
    document
      .getElementById(`turn-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const askAbout = (id: string, text: string) => {
    const selection = window.getSelection()?.toString();
    setAnchor({
      id,
      quote:
        selection && text.includes(selection) ? selection : text.slice(0, 1200),
    });
    setTab("tutor");
    setPanelOpen(true);
    setTimeout(() => input.current?.focus(), 20);
  };
  const ask = () => {
    if (!question.trim() || state.tutorBusy) return;
    try {
      checkConfig(settings.profiles[settings.assignments[2]]);
    } catch (error) {
      engine.emit({ error: errorMessage(error) });
      return;
    }
    void engine.ask(question.trim(), anchor?.id, anchor?.quote);
    setQuestion("");
  };
  const bookmark = (id: string) =>
    engine.update((s) => {
      s.bookmarks = s.bookmarks.includes(id)
        ? s.bookmarks.filter((x) => x !== id)
        : [...s.bookmarks, id];
    });
  const running = ["running", "preparing"].includes(state.status);
  const count = s.turns.filter((t) => t.status === "complete").length;
  const statusLabel = {
    idle: "等待开始",
    preparing: "准备本场资料",
    running: state.judging ? "正在评估讨论是否充分" : "研讨进行中",
    paused: "已暂停",
    complete: "本场研讨已结束",
    error: "等待恢复",
  }[state.status];
  return (
    <div className="room">
      <section className="main-stage">
        <header className="room-heading">
          <h1>{s.title}</h1>
          <div className="room-status">
            <span className={running ? "live-dot" : ""} />
            {s.demo ? "示例会话 · 非真实模型输出" : statusLabel}
          </div>

          <div className="room-meta">
            <p>
              {s.mode === "research" ? "研究研讨" : "高阶研究面试"}
              <span>/</span>
              <span className="role-name-a">{s.roles[0].name}</span>
              <span>与</span>
              <span className="role-name-b">{s.roles[1].name}</span>
            </p>
            <div className="room-tools">
              <button aria-label="调整研讨角色" onClick={onRoles}>
                <Settings2 size={16} />
                角色
              </button>
              <button aria-label="导出 Markdown" onClick={() => onExport("md")}>
                <Download size={16} />
                导出
              </button>
              <button
                className="panel-trigger"
                aria-label="打开研究助手"
                onClick={() => setPanelOpen(true)}
              >
                <MessageCircle size={17} />
                助手
              </button>
            </div>
          </div>
        </header>
        <nav className="research-navigation" aria-label="会场导航">
          <select
            aria-label="定位发言"
            value=""
            disabled={!s.turns.length}
            onChange={(e) => jump(e.target.value)}
          >
            <option value="">定位发言 · {s.turns.length} 次</option>
            {s.turns.map((turn, index) => (
              <option key={turn.id} value={turn.id}>
                第 {Math.floor(index / 2) + 1} 轮 · {s.roles[turn.speaker].name}{" "}
                · {turn.text.slice(0, 36)}
              </option>
            ))}
          </select>
          <button onClick={() => openPanel("sources")}>
            <FileText size={15} />
            资料 {s.sources.length}
          </button>
          <button onClick={() => openPanel("notes")}>
            <NotebookPen size={15} />
            笔记与收藏
          </button>
        </nav>
        <div
          className="discussion-scroll"
          ref={scroll}
          onScroll={() => {
            const e = scroll.current!;
            setFollow(e.scrollHeight - e.scrollTop - e.clientHeight < 90);
          }}
        >
          {!s.turns.length && (
            <div className="stage-empty">
              <div className="empty-orbit">
                <BookMarked size={34} />
              </div>
              <h2>
                {state.status === "preparing"
                  ? "正在整理讨论的起点"
                  : "一个问题，两种研究视角。"}
              </h2>
              <p>
                {state.status === "preparing"
                  ? "检索相关资料，准备让观点有所依据。"
                  : "研究伙伴已就位。连接你的模型后，开始这一场深入讨论。"}
              </p>
              {!running && (
                <button className="primary" onClick={() => void engine.start()}>
                  <Play size={16} />
                  开始研讨
                </button>
              )}
              <div className="stage-options">
                <label>
                  <input
                    type="checkbox"
                    checked={s.search}
                    disabled={running}
                    onChange={(e) =>
                      engine.update((s) => {
                        s.search = e.target.checked;
                      })
                    }
                  />
                  联网查找资料
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.voice}
                    disabled={running}
                    onChange={(e) =>
                      engine.update((s) => {
                        s.voice = e.target.checked;
                      })
                    }
                  />
                  双角色听讲
                </label>
                <button onClick={onMaterials}>
                  <Plus size={14} />
                  加入资料
                </button>
              </div>
              <button className="text-button" onClick={onSettings}>
                <Settings2 size={15} />
                配置模型与声音
              </button>
            </div>
          )}
          {s.turns.map((turn, i) => (
            <article
              id={`turn-${turn.id}`}
              className={`turn turn-${turn.speaker} ${state.playing?.turnId === turn.id ? "speaking" : ""}`}
              key={turn.id}
            >
              <div className="turn-body">
                <header>
                  <span className="turn-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <strong>{s.roles[turn.speaker].name}</strong>
                  <span className="role-tag">
                    {`伙伴 ${turn.speaker === 0 ? "A" : "B"}`}
                  </span>
                  <span className="turn-round">
                    第 {Math.floor(i / 2) + 1} 轮
                  </span>
                </header>
                {paragraphs(turn.text, true).map((text, n) => (
                  <div
                    className={`spoken-paragraph ${state.playing?.turnId === turn.id && state.playing.segment === n ? "reading" : ""}`}
                    key={n}
                  >
                    <Markdown
                      text={text}
                      sources={s.sources}
                      citations={turn.citations}
                      onSource={showSource}
                    />
                    {turn.status === "complete" && (
                      <button
                        className="paragraph-play"
                        aria-label="重听本段及后续内容"
                        onClick={() => void engine.replay(turn.id, n)}
                      >
                        <Volume2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {turn.status === "streaming" && (
                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {turn.status === "error" || turn.status === "interrupted" ? (
                  <div className="incomplete-label">
                    本次发言未完成，继续研讨将重新生成这一发言。
                  </div>
                ) : null}
                {turn.citations.length > 0 && (
                  <div className="citation-list">
                    {turn.citations.map((c) => (
                      <a
                        key={c.url}
                        href={safeUrl(c.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe size={12} />
                        {c.title}
                        <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                )}
                <div className="turn-actions">
                  <button onClick={() => askAbout(turn.id, turn.text)}>
                    <MessageCircle size={14} />
                    追问这段
                  </button>
                  <button
                    className={s.bookmarks.includes(turn.id) ? "saved" : ""}
                    onClick={() => bookmark(turn.id)}
                  >
                    <Bookmark
                      size={14}
                      fill={
                        s.bookmarks.includes(turn.id) ? "currentColor" : "none"
                      }
                    />
                    {s.bookmarks.includes(turn.id) ? "已收藏" : "收藏"}
                  </button>
                  <button
                    disabled={turn.status !== "complete"}
                    onClick={() => void engine.replay(turn.id)}
                  >
                    <Volume2 size={14} />
                    重听
                  </button>
                  {state.playing?.turnId === turn.id && (
                    <span className="now-reading">
                      <AudioLines size={14} />
                      正在朗读
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
          {state.status === "complete" && (
            <div className="discussion-end">
              <Check size={18} />
              <div className="discussion-wrapup">
                <strong>{s.stopReason || "本场研讨告一段落"}</strong>
                <p>
                  {count} 次发言 · {s.sources.length} 份资料 ·{" "}
                  {s.bookmarks.length} 个收藏。把认识和待验证的问题留在笔记里。
                </p>
                <button
                  className="secondary"
                  onClick={() => openPanel("notes")}
                >
                  <NotebookPen size={15} />
                  {s.notes ? "回看学习笔记" : "打开学习笔记"}
                </button>
              </div>
              <button
                onClick={() => {
                  engine.update((s) => {
                    s.rounds =
                      s.turns.filter((t) => t.status === "complete").length /
                        2 +
                      4;
                    s.stopReason = undefined;
                    s.stopAtTurn = s.turns.length;
                  });
                  void engine.start();
                }}
              >
                再深入 4 轮<ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        {!follow && s.turns.length > 0 && (
          <button
            className="back-live"
            onClick={() => {
              setFollow(true);
              scroll.current?.scrollTo({
                top: scroll.current.scrollHeight,
                behavior: "smooth",
              });
            }}
          >
            <ArrowDown size={14} />
            跳到最新发言
          </button>
        )}
        <div className="player">
          <div className="player-main">
            <button
              className="play-button"
              aria-label={
                state.replaying
                  ? "暂停或继续重听"
                  : running
                    ? "暂停研讨"
                    : "继续研讨"
              }
              disabled={
                (s.demo || state.status === "complete") && !state.replaying
              }
              onClick={() =>
                state.replaying
                  ? engine.toggleReplay()
                  : running
                    ? engine.pause()
                    : void engine.resume()
              }
            >
              {running || (state.replaying && !engine.replayAudio.paused) ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
            </button>
            <div className="player-description">
              <strong>
                {s.voice ? "双角色听讲" : "文字研讨"}
                {state.playing && <AudioLines size={15} />}
              </strong>
              <small>
                {s.demo ? "示例内容，仅用于体验界面" : statusLabel} ·{" "}
                {Math.ceil(count / 2)} / {s.rounds} 轮
                {s.autoStop ? " · 自主收束" : ""}
              </small>
            </div>
          </div>
          <div className="player-controls">
            <button
              className={`icon-button ${s.voice ? "active" : ""}`}
              aria-label={s.voice ? "切换文字模式" : "开启双角色听讲"}
              onClick={() => engine.toggleVoice()}
            >
              <Headphones size={18} />
            </button>
            <select
              aria-label="播放速度"
              value={settings.speed}
              onChange={(e) =>
                setSettings({ ...settings, speed: Number(e.target.value) })
              }
            >
              {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              aria-label="停止生成与播放，可稍后继续"
              onClick={() => engine.stop()}
            >
              <Square size={15} />
            </button>
          </div>
          <div className="player-progress">
            <span
              style={{
                width: `${Math.min(100, (count / (s.rounds * 2)) * 100)}%`,
              }}
            />
          </div>
          <div className="audio-disclosure">
            {state.speechError ? (
              <button
                onClick={() => {
                  engine.audio.stop();
                  engine.emit({ error: "", speechError: false });
                  void engine.resume();
                }}
              >
                语音播放失败 · 重试播放
              </button>
            ) : (
              "AI 合成声音 · 语音按段落定位"
            )}
          </div>
        </div>
      </section>
      <aside
        ref={panel}
        role={panelOpen && narrow ? "dialog" : undefined}
        aria-modal={panelOpen && narrow ? true : undefined}
        aria-label="研究助手"
        className={`companion ${panelOpen ? "panel-open" : ""}`}
      >
        <header className="companion-header">
          <h2>
            {{ tutor: "私人助教", sources: "研究资料", notes: "学习笔记" }[tab]}
          </h2>
          <button
            className="icon-button panel-close"
            aria-label="关闭研究助手"
            onClick={() => setPanelOpen(false)}
          >
            <X size={18} />
          </button>
        </header>
        {state.error && (
          <div className="panel-error" role="alert">
            <p>{state.error}</p>
            <button
              className="text-button"
              onClick={() => {
                setPanelOpen(false);
                onSettings();
              }}
            >
              检查设置
            </button>
          </div>
        )}
        <div className="panel-tabs">
          <button
            className={tab === "tutor" ? "active" : ""}
            aria-pressed={tab === "tutor"}
            onClick={() => setTab("tutor")}
          >
            私人助教
          </button>
          <button
            className={tab === "sources" ? "active" : ""}
            aria-pressed={tab === "sources"}
            onClick={() => setTab("sources")}
          >
            资料 <small>{s.sources.length}</small>
          </button>
          <button
            className={tab === "notes" ? "active" : ""}
            aria-pressed={tab === "notes"}
            onClick={() => setTab("notes")}
          >
            笔记
          </button>
        </div>
        {tab === "tutor" ? (
          <>
            <div
              className="tutor-scroll"
              ref={tutorScroll}
              onScroll={() => {
                const e = tutorScroll.current!;
                tutorFollow.current =
                  e.scrollHeight - e.scrollTop - e.clientHeight < 60;
              }}
            >
              {!s.tutor.length ? (
                <div className="tutor-welcome">
                  <h3>让问题再深一层。</h3>
                  <p>
                    我会结合这场讨论和你的资料，
                    <br />
                    帮你拆解概念、公式与推导。
                  </p>
                  <div className="tutor-suggestions">
                    {[
                      "这场讨论的核心分歧是什么？",
                      "帮我补齐理解这段话的前置知识",
                      "用一个具体例子解释刚才的观点",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setQuestion(q);
                          input.current?.focus();
                        }}
                      >
                        {q}
                        <ArrowUp size={13} />
                      </button>
                    ))}
                  </div>
                  <div className="tutor-note">
                    <span />
                    独立答疑 · 可手动交给主会场
                  </div>
                </div>
              ) : (
                s.tutor.map((m) => (
                  <div
                    className={`tutor-message ${m.role}`}
                    id={`turn-${m.id}`}
                    key={m.id}
                  >
                    <div className="tutor-message-label">
                      {m.role === "user" ? "我的问题" : "私人助教"}
                      {m.anchorId && (
                        <button onClick={() => jump(m.anchorId!)}>
                          定位原文
                        </button>
                      )}
                    </div>
                    {m.quote && m.role === "user" && (
                      <blockquote>
                        {m.quote.slice(0, 180)}
                        {m.quote.length > 180 ? "…" : ""}
                      </blockquote>
                    )}
                    <Markdown
                      text={m.text}
                      sources={s.sources}
                      citations={m.citations}
                      onSource={showSource}
                    />
                    {m.status === "streaming" && (
                      <LoaderCircle className="spin" size={14} />
                    )}{" "}
                    {(m.status === "error" || m.status === "interrupted") && (
                      <p className="incomplete-label">
                        回答中断。请重新提问或重述需要解释的部分。
                      </p>
                    )}
                    <div className="tutor-message-actions">
                      {m.role === "user" ? (
                        <button
                          disabled={s.turns.some(
                            (t) =>
                              t.status === "complete" &&
                              t.forwarded?.includes(m.id),
                          )}
                          onClick={() =>
                            engine.forward(
                              m.id,
                              `${m.quote ? "相关原文：" + m.quote + "\n" : ""}${m.text}`,
                            )
                          }
                        >
                          <Send size={12} />
                          {s.turns.some(
                            (t) =>
                              t.status === "complete" &&
                              t.forwarded?.includes(m.id),
                          )
                            ? "主会场已回应"
                            : s.pendingQuestions.some((q) => q.id === m.id)
                              ? "等待主会场回应"
                              : "交给主会场"}
                        </button>
                      ) : (
                        <>
                          <button onClick={() => bookmark(m.id)}>
                            <Bookmark size={12} />
                            {s.bookmarks.includes(m.id) ? "已收藏" : "收藏"}
                          </button>
                          <button
                            disabled={m.status !== "complete"}
                            onClick={() => void engine.replay(m.id)}
                          >
                            <Volume2 size={12} />
                            朗读
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {s.pendingQuestions.length > 0 && (
              <div className="queued-questions">
                <Send size={13} />
                {s.pendingQuestions.length} 个问题等待主会场回应
                <button
                  onClick={() =>
                    engine.update((s) => {
                      s.pendingQuestions = [];
                    })
                  }
                >
                  撤回
                </button>
              </div>
            )}
            <div className="tutor-compose">
              {anchor && (
                <div className="quote-preview">
                  <span>{anchor.quote.slice(0, 90)}…</span>
                  <button
                    aria-label="取消引用"
                    onClick={() => setAnchor(undefined)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <textarea
                ref={input}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="这里没懂？从一个问题开始…"
                aria-label="向助教提问"
                rows={3}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    ask();
                  }
                }}
              />
              <div>
                <span>Enter 发送 · Shift Enter 换行</span>
                <button
                  aria-label="发送问题"
                  className="send-button"
                  disabled={!question.trim() || state.tutorBusy}
                  onClick={ask}
                >
                  {state.tutorBusy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <ArrowUp size={18} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : tab === "sources" ? (
          <div className="panel-content">
            <button className="add-material" onClick={onMaterials}>
              <Plus size={16} />
              加入论文或资料
            </button>
            <p className="help">
              打开资料可查看正文或原页。「搜索摘要」不代表已读全文。
            </p>
            {!s.sources.length && (
              <div className="empty-state">
                <FileText size={26} />
                <p>
                  本场还没有资料。
                  <br />
                  加入论文，让讨论有所依据。
                </p>
              </div>
            )}
            {s.sources.map((source) => (
              <button
                className="source-card"
                key={source.id}
                onClick={() => setView({ source })}
              >
                <div>
                  <span>{source.label}</span>
                  <span className={`evidence ${source.evidence}`}>
                    {
                      {
                        provided: "已提供正文",
                        extracted: "已提取正文",
                        search: "搜索摘要",
                        unread: "尚未读取",
                      }[source.evidence]
                    }
                  </span>
                </div>
                <h3>
                  <FileText size={16} />
                  {source.title}
                </h3>
                {source.warning && <p>{source.warning}</p>}
                <span className="source-open">
                  {source.kind === "pdf" ? "查看原页与文字" : "查看资料"}
                  <ChevronRight size={13} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="panel-content">
            <div className="notes-toolbar">
              <button
                className="secondary"
                disabled={state.noteBusy || !s.turns.length}
                onClick={() => void engine.makeNotes()}
              >
                {state.noteBusy ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <NotebookPen size={14} />
                )}
                让助教整理
              </button>
              <button
                className="icon-button"
                aria-label={editNotes ? "完成编辑" : "编辑笔记"}
                onClick={() => setEditNotes(!editNotes)}
              >
                {editNotes ? <Check size={16} /> : <Pencil size={16} />}
              </button>
              <button
                className="icon-button"
                aria-label="导出学习笔记"
                disabled={!s.notes.trim()}
                onClick={() =>
                  download(
                    `guanyan-notes-${s.id}.md`,
                    `# ${s.title}\n\n${s.notes}`,
                    "text/markdown",
                  )
                }
              >
                <Download size={16} />
              </button>
            </div>
            <p className="notes-status">
              {state.noteBusy
                ? "正在根据本场讨论整理，仍可继续手写记录。"
                : "手写笔记保存在当前浏览器；让助教整理会调用已配置的模型，重新整理现有笔记。"}
            </p>
            {editNotes ? (
              <textarea
                className="notes-editor"
                aria-label="编辑学习笔记"
                value={s.notes}
                onChange={(e) =>
                  engine.update((s) => {
                    s.notes = e.target.value;
                  })
                }
              />
            ) : s.notes ? (
              <Markdown
                text={s.notes}
                sources={s.sources}
                onSource={showSource}
              />
            ) : (
              <div className="empty-state">
                <BookMarked size={26} />
                <p>
                  好的讨论，值得留下来。
                  <br />
                  可以手写认识，也可以让助教整理本场讨论。
                </p>
                <button
                  className="secondary"
                  onClick={() => setEditNotes(true)}
                >
                  <Pencil size={15} />
                  写下第一条笔记
                </button>
              </div>
            )}
            <h3 className="bookmark-heading">
              <Bookmark size={15} />
              收藏片段 <span>{s.bookmarks.length}</span>
            </h3>
            {!s.bookmarks.length && (
              <p className="help">
                在发言下点击「收藏」，把值得回看的片段留在这里。
              </p>
            )}
            {s.bookmarks.map((id) => {
              const m =
                s.turns.find((t) => t.id === id) ??
                s.tutor.find((t) => t.id === id);
              return m ? (
                <div className="bookmark-card" key={id}>
                  <button
                    onClick={() => {
                      if (s.tutor.some((t) => t.id === id)) {
                        tutorFollow.current = false;
                        setTab("tutor");
                      } else setPanelOpen(false);
                      setTimeout(() => jump(id), 30);
                    }}
                  >
                    {m.text.slice(0, 200)}
                    {m.text.length > 200 ? "…" : ""}
                  </button>
                  <div className="bookmark-actions">
                    <button
                      className="text-button"
                      disabled={hasExcerpt(s.notes, m.text)}
                      onClick={() =>
                        engine.update((session) => {
                          session.notes = appendExcerpt(session.notes, m.text);
                        })
                      }
                    >
                      {hasExcerpt(s.notes, m.text) ? "已加入笔记" : "加入笔记"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => bookmark(id)}
                    >
                      取消收藏
                    </button>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}
      </aside>
      <Suspense fallback={null}>
        {view &&
          (view.source.kind === "pdf" ? (
            <PdfViewer
              source={view.source}
              page={view.page}
              onClose={closeView}
            />
          ) : (
            <Modal
              title={`${view.source.label} · ${view.source.title}`}
              onClose={closeView}
              wide
            >
              {view.source.warning && (
                <p className="source-warning">{view.source.warning}</p>
              )}
              {view.source.url && safeUrl(view.source.url) && (
                <a
                  className="source-link"
                  href={safeUrl(view.source.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} />
                  打开原始来源
                </a>
              )}
              <Markdown
                text={
                  view.source.text ||
                  "尚未读取正文。可以打开原始来源，或上传 PDF、粘贴原文供研讨参考。"
                }
                sources={s.sources}
              />
            </Modal>
          ))}
      </Suspense>
    </div>
  );
}
