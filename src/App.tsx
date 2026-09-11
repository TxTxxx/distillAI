import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowUpRight,
  AudioLines,
  BookOpen,
  ChevronRight,
  Cpu,
  FlaskConical,
  GraduationCap,
  Layers3,
  MessageCircle,
  Plus,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Headphones,
  FileText,
  Play,
  Upload,
  Trash2,
  X,
  LoaderCircle,
  Check,
  Download,
} from "lucide-react";
import { defaults, rolePresets } from "./types";
import type { Role, Session, Settings as SettingsType, Source } from "./types";
import { ResearchEngine } from "./lib/engine";
import { storage, backup, restore, markdown, download } from "./lib/storage";
import { errorMessage } from "./lib/api";
import { exampleSession } from "./lib/demo";
import Room from "./components/Room";
import Modal from "./components/Modal";
const Settings = lazy(() => import("./components/Settings"));
const Materials = lazy(() => import("./components/Materials"));
const topics = [
  {
    tag: "World Model",
    question: "想象中的世界，如何指导真实行动？",
    detail: "模型误差与长期规划的边界",
    prompt:
      "世界模型的预测误差如何影响长期规划？以 Dreamer 类方法为例，讨论模型偏差、想象轨迹长度和策略优化之间的取舍。",
    Icon: Cpu,
  },
  {
    tag: "VLA",
    question: "理解了语言，就能学会行动吗？",
    detail: "从语义理解到动作泛化",
    prompt:
      "VLA 如何把视觉语言表征转化为可泛化的动作？深入讨论动作表示、数据分布、连续动作生成和跨场景泛化的实验设计。",
    Icon: Layers3,
  },
  {
    tag: "World Action Model",
    question: "预测世界与生成动作，能否相互成就？",
    detail: "联合建模的收益与代价",
    prompt:
      "World Action Model 中，联合预测世界与动作在什么条件下能帮助机器人泛化？讨论共享表征、监督信号、消融与等计算量对照。",
    Icon: FlaskConical,
  },
];
export default function App() {
  const [engine] = useState(
    () => new ResearchEngine(structuredClone(defaults)),
  );
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const s = state.session;
  const [settings, setSettings] = useState<SettingsType>(
    structuredClone(defaults),
  );
  const [history, setHistory] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<
    "settings" | "materials" | "roles" | "history" | null
  >(null);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Session["mode"]>("research");
  const [rounds, setRounds] = useState(12);
  const [search, setSearch] = useState(true);
  const [voice, setVoice] = useState(false);
  const [roles, setRoles] = useState<[Role, Role]>(
    structuredClone(rolePresets.research),
  );
  const [sources, setSources] = useState<Source[]>([]);
  const [deleteId, setDeleteId] = useState<string>();
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!state.notice) return;
    const timer = setTimeout(() => engine.emit({ notice: "" }), 6000);
    return () => clearTimeout(timer);
  }, [state.notice, engine]);
  const close = useCallback(() => setModal(null), []);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([storage.sessions(), storage.settings()])
      .then(([sessions, config]) => {
        if (cancelled) return;
        setHistory(sessions);
        setSettings(config);
        engine.settings = config;
        const id = location.hash.match(/^#\/s\/(.+)$/)?.[1];
        if (id) engine.select(sessions.find((s) => s.id === id));
        setLoaded(true);
      })
      .catch(() => {
        engine.emit({
          notice: "无法使用本机存储。你仍可研讨，但请及时导出记录。",
        });
        setLoaded(true);
      });
    const checkpoint = setInterval(() => engine.checkpoint(), 5000);
    const leave = () => {
      engine.checkpoint();
      void engine.flush();
    };
    window.addEventListener("pagehide", leave);
    return () => {
      cancelled = true;
      clearInterval(checkpoint);
      window.removeEventListener("pagehide", leave);
    };
  }, [engine]);
  useEffect(() => {
    engine.settings = settings;
    engine.audio.setSpeed(settings.speed);
    engine.replayAudio.setSpeed(settings.speed);
    if (loaded)
      void storage
        .saveSettings(settings)
        .catch(() =>
          engine.emit({ notice: "无法保存配置，请检查浏览器本机存储。" }),
        );
  }, [settings, engine, loaded]);
  useEffect(() => {
    if (s)
      setHistory((old) =>
        [s, ...old.filter((x) => x.id !== s.id)].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        ),
      );
  }, [s]);
  useEffect(() => {
    const changed = () => {
      const id = location.hash.match(/^#\/s\/(.+)$/)?.[1];
      if (id === engine.state.session?.id) return;
      void engine
        .flush()
        .then(() => storage.sessions())
        .then((all) => {
          setHistory(all);
          engine.select(all.find((x) => x.id === id));
        })
        .catch(() => {});
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, [engine]);
  const openSession = (session: Session) => {
    engine.select(session);
    location.hash = `/s/${session.id}`;
    setMobileNav(false);
    setModal(null);
  };
  const newRoom = () => {
    engine.select();
    location.hash = "/";
    setMobileNav(false);
    setTopic("");
    setSources([]);
  };
  const enter = () => {
    if (!topic.trim()) return;
    const session = engine.create(topic.trim(), mode);
    engine.update((s) => {
      s.rounds = rounds;
      s.search = search;
      s.voice = voice;
      s.sources = sources;
      s.roles = structuredClone(roles);
    });
    location.hash = `/s/${session.id}`;
    void engine.start();
  };
  const addSources = (added: Source[]) => {
    if (s) engine.addSources(added);
    else
      setSources((old) => [
        ...old,
        ...added.map((x, i) => ({ ...x, label: `S${old.length + i + 1}` })),
      ]);
  };
  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 40 * 1024 * 1024) throw new Error("备份文件超过 40 MB。");
      const restored = restore(await file.text());
      await storage.save(restored);
      openSession(restored);
    } catch (e) {
      engine.emit({ error: errorMessage(e) });
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };
  const doDelete = async () => {
    if (!deleteId) return;
    await engine.flush();
    if (s?.id === deleteId) newRoom();
    try {
      await storage.remove(deleteId);
      setHistory((h) => h.filter((x) => x.id !== deleteId));
      setDeleteId(undefined);
    } catch (e) {
      engine.emit({ error: errorMessage(e) });
    }
  };
  return (
    <div
      className={`shell ${collapsed ? "nav-collapsed" : ""} ${s ? "in-room" : ""}`}
    >
      <input
        className="hidden"
        ref={importRef}
        type="file"
        accept=".json"
        onChange={(e) => void handleImport(e.target.files?.[0])}
      />
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="关闭导航"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <button className="brand" onClick={newRoom} aria-label="观研首页">
          <span className="brand-mark">
            <BookOpen size={22} />
          </span>
          <strong>
            观研<span>GUANYAN</span>
          </strong>
        </button>
        <button
          className="new-session"
          aria-label="开启一场研讨"
          onClick={newRoom}
        >
          <Plus size={18} />
          <span>开启一场研讨</span>
        </button>
        <div className="nav-caption">我的空间</div>
        <button
          className={`nav-item ${!modal ? "active" : ""}`}
          aria-label="研究研讨室"
          onClick={() => setModal(null)}
        >
          <Layers3 size={18} />
          <span>研究研讨室</span>
        </button>
        <button
          className="nav-item"
          aria-label="学习记录"
          onClick={() => setModal("history")}
        >
          <BookOpen size={18} />
          <span>学习记录</span>
          <small>{history.length || ""}</small>
        </button>
        <button
          className="nav-item"
          aria-label="恢复会话备份"
          onClick={() => importRef.current?.click()}
        >
          <Upload size={18} />
          <span>恢复会话备份</span>
        </button>
        <div className="history-list">
          <div className="nav-caption">最近研讨</div>
          {history.slice(0, 7).map((item) => (
            <button
              className={`history-item ${s?.id === item.id ? "current" : ""}`}
              key={item.id}
              onClick={() => openSession(item)}
            >
              <MessageCircle size={14} />
              <span>{item.title}</span>
              {item.demo && <small>示例</small>}
            </button>
          ))}
          {!history.length && (
            <p className="history-empty">每一次追问，都会留在这里。</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="local-label">
            <span />
            只属于你的学习空间
          </div>
          <button
            className="nav-item"
            aria-label="模型与声音"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={18} />
            <span>模型与声音</span>
          </button>
          <button
            className="collapse-button"
            aria-label={collapsed ? "展开导航" : "收起导航"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
            <span>收起侧栏</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="打开导航"
              onClick={() => setMobileNav(true)}
            >
              <BookOpen size={20} />
            </button>
            <button onClick={newRoom}>我的空间</button>
            <ChevronRight size={14} />
            <span>
              {s
                ? s.mode === "research"
                  ? "研究研讨"
                  : "高阶研究面试"
                : "新的研讨"}
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="connection-pill"
              onClick={() => setModal("settings")}
            >
              <span
                className={
                  settings.profiles[settings.assignments[0]].key
                    ? "connected"
                    : ""
                }
              />
              {settings.profiles[settings.assignments[0]].key
                ? "已配置模型"
                : "连接你的模型"}
            </button>
            <span className="profile">研</span>
          </div>
        </header>
        {(state.error || state.notice) && (
          <div
            className={`global-message ${state.error ? "is-error" : ""}`}
            role={state.error ? "alert" : "status"}
          >
            <span>{state.error || state.notice}</span>
            <div>
              {state.error && (
                <button onClick={() => setModal("settings")}>检查设置</button>
              )}
              <button
                className="icon-button"
                aria-label="关闭提示"
                onClick={() => engine.emit({ error: "", notice: "" })}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        {s ? (
          <Room
            engine={engine}
            state={state}
            settings={settings}
            setSettings={setSettings}
            onMaterials={() => setModal("materials")}
            onRoles={() => setModal("roles")}
            onSettings={() => setModal("settings")}
            onExport={(type) =>
              download(
                `guanyan-${s.id}.${type}`,
                type === "json" ? backup(s) : markdown(s),
                type === "json" ? "application/json" : "text/markdown",
              )
            }
          />
        ) : (
          <>
            <main className="launch">
              <div className="eyebrow">
                <span /> EMBODIED INTELLIGENCE LAB
              </div>
              <h1>
                让思考，<span>再深入一层。</span>
              </h1>
              <p className="intro">
                旁听一场好讨论，带走一个新视角。
                <br />
                两位研究伙伴深入对谈，一位私人助教为你解惑。
              </p>
              <section className="composer">
                <div className="mode-tabs">
                  <button
                    className={mode === "research" ? "selected" : ""}
                    onClick={() => {
                      setMode("research");
                      setRoles(structuredClone(rolePresets.research));
                    }}
                  >
                    <FlaskConical size={16} />
                    研究研讨
                  </button>
                  <button
                    className={mode === "interview" ? "selected" : ""}
                    onClick={() => {
                      setMode("interview");
                      setRoles(structuredClone(rolePresets.interview));
                    }}
                  >
                    <GraduationCap size={17} />
                    高阶研究面试
                  </button>
                </div>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="今天，你想深入理解什么？"
                  aria-label="研究主题"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") enter();
                  }}
                />
                {sources.length > 0 && (
                  <div className="source-chips">
                    {sources.map((x) => (
                      <span key={x.id}>
                        <FileText size={13} />
                        {x.title}
                        <button
                          aria-label={`移除${x.title}`}
                          onClick={() =>
                            setSources((a) =>
                              a
                                .filter((s) => s.id !== x.id)
                                .map((s, i) => ({ ...s, label: `S${i + 1}` })),
                            )
                          }
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="composer-footer">
                  <button
                    className="text-button"
                    onClick={() => setModal("materials")}
                  >
                    <Plus size={17} />
                    加入论文或资料
                  </button>
                  <button
                    className="primary"
                    disabled={!topic.trim() || !loaded}
                    onClick={enter}
                  >
                    进入研讨室 <ArrowUpRight size={17} />
                  </button>
                </div>
              </section>
              <div className="launch-options">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={search}
                    onChange={(e) => setSearch(e.target.checked)}
                  />
                  <Globe size={14} />
                  联网查找资料
                </label>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={voice}
                    onChange={(e) => setVoice(e.target.checked)}
                  />
                  <Headphones size={14} />
                  双角色听讲
                </label>
                <label className="rounds-label">
                  讨论轮数
                  <select
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                  >
                    {[4, 8, 12, 20, 30].map((n) => (
                      <option key={n} value={n}>
                        {n} 轮
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="text-button"
                  onClick={() => setModal("roles")}
                >
                  <Settings2 size={14} />
                  角色设定
                </button>
              </div>
              <div className="section-heading">
                <h2>从一个好问题开始</h2>
                <span>为你的研究方向准备</span>
              </div>
              <div className="topic-grid">
                {topics.map(({ tag, question, detail, prompt, Icon }, i) => (
                  <button
                    className="topic-card"
                    key={tag}
                    onClick={() => setTopic(prompt)}
                  >
                    <div className="topic-top">
                      <span>{tag}</span>
                      <span>0{i + 1}</span>
                    </div>
                    <div className="topic-icon">
                      <Icon size={23} />
                    </div>
                    <h3>{question}</h3>
                    <p>{detail}</p>
                    <ArrowUpRight className="topic-arrow" size={18} />
                  </button>
                ))}
              </div>
              <div className="launch-foot">
                <span>
                  <AudioLines size={16} />
                  读得深入，也听得明白
                </span>
                <span>
                  <MessageCircle size={16} />
                  随时向私人助教追问
                </span>
                <button onClick={() => openSession(exampleSession())}>
                  <Play size={14} />
                  查看标注示例
                </button>
              </div>
            </main>
            <footer className="site-foot">
              <span>观研 · 保持好奇，保持追问</span>
              <span>你的学习记录保存在本机</span>
            </footer>
          </>
        )}
      </div>
      <Suspense
        fallback={
          <div className="loading-overlay">
            <LoaderCircle className="spin" />
            正在准备…
          </div>
        }
      >
        {modal === "settings" && (
          <Settings value={settings} onChange={setSettings} onClose={close} />
        )}{" "}
        {modal === "materials" && (
          <Materials onAdd={addSources} onClose={close} />
        )}
      </Suspense>
      {modal === "roles" && (
        <Modal title="设定你的研究伙伴" onClose={close}>
          <p className="help">
            明确两位角色的任务，让不同视角产生有价值的追问。修改将在下一次发言中生效。
          </p>
          {(s?.roles ?? roles).map((role, i) => (
            <div className="role-form" key={i}>
              <span className={`avatar role-${i}`}>{i === 0 ? "A" : "B"}</span>
              <div className="form-grid">
                <label className="full">
                  角色名称
                  <input
                    value={role.name}
                    onChange={(e) => {
                      if (s)
                        engine.update((s) => {
                          s.roles[i].name = e.target.value;
                        });
                      else
                        setRoles(
                          (r) =>
                            r.map((x, n) =>
                              n === i ? { ...x, name: e.target.value } : x,
                            ) as [Role, Role],
                        );
                    }}
                  />
                </label>
                <label className="full">
                  角色职责
                  <textarea
                    rows={4}
                    value={role.duty}
                    onChange={(e) => {
                      if (s)
                        engine.update((s) => {
                          s.roles[i].duty = e.target.value;
                        });
                      else
                        setRoles(
                          (r) =>
                            r.map((x, n) =>
                              n === i ? { ...x, duty: e.target.value } : x,
                            ) as [Role, Role],
                        );
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
          <button className="primary" onClick={close}>
            <Check size={16} />
            完成设定
          </button>
        </Modal>
      )}
      {modal === "history" && (
        <Modal title="你的学习记录" onClose={close} wide>
          {history.length ? (
            history.map((item) => (
              <div className="history-row" key={item.id}>
                <button onClick={() => openSession(item)}>
                  <BookOpen size={18} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {new Date(item.updatedAt).toLocaleDateString("zh-CN")} ·{" "}
                      {item.turns.filter((t) => t.status === "complete").length}{" "}
                      次发言 {item.demo ? "· 示例" : ""}
                    </small>
                  </span>
                </button>
                <button
                  className="icon-button"
                  title="导出备份"
                  onClick={() =>
                    download(
                      `guanyan-${item.id}.json`,
                      backup(item),
                      "application/json",
                    )
                  }
                >
                  <Download size={16} />
                </button>
                <button
                  className="icon-button"
                  title="删除会话"
                  onClick={() => setDeleteId(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <BookOpen size={30} />
              <h3>你的第一场研讨，值得记下来。</h3>
              <p>开始讨论后，记录会自动保存在这里。</p>
            </div>
          )}
        </Modal>
      )}
      {deleteId && (
        <Modal title="删除这场研讨？" onClose={() => setDeleteId(undefined)}>
          <p>
            本机的对话、笔记和相关缓存将被删除。可以先在学习记录中导出备份。
          </p>
          <div className="modal-actions">
            <button
              className="secondary"
              onClick={() => setDeleteId(undefined)}
            >
              保留
            </button>
            <button className="danger" onClick={() => void doDelete()}>
              删除研讨
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
