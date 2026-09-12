import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { defaults, rolePresets } from "../types";
import type { Role, Session, Settings as SettingsType, Source } from "../types";
import { ResearchEngine } from "./engine";
import { storage, restore } from "./storage";
import { errorMessage } from "./api";

export function useResearchApp() {
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
  const [modal, setModal] = useState<
    "settings" | "materials" | "roles" | "history" | null
  >(null);
  const [topic, setTopic] = useState("模型的预测误差如何影响长期规划？");
  const [mode, setMode] = useState<Session["mode"]>("research");
  const [rounds, setRounds] = useState(12);
  const [autoStop, setAutoStop] = useState(true);
  const [editorAgent, setEditorAgent] = useState(0);
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
        setRoles(structuredClone(config.prompts.research));
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
    setModal(null);
  };
  const newRoom = () => {
    engine.select();
    location.hash = "/";
    setTopic("");
    setSources([]);
  };
  const enter = () => {
    if (!topic.trim()) return;
    const session = engine.create(topic.trim(), mode);
    engine.update((s) => {
      s.rounds = rounds;
      s.autoStop = autoStop;
      s.sharedPrompt = settings.prompts.shared;
      s.tutorPrompt = settings.prompts.tutor;
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
  return {
    engine,
    state,
    s,
    settings,
    setSettings,
    history,
    loaded,
    modal,
    setModal,
    topic,
    setTopic,
    mode,
    setMode,
    rounds,
    setRounds,
    autoStop,
    setAutoStop,
    editorAgent,
    setEditorAgent,
    search,
    setSearch,
    voice,
    setVoice,
    roles,
    setRoles,
    sources,
    setSources,
    deleteId,
    setDeleteId,
    importRef,
    close,
    openSession,
    newRoom,
    enter,
    addSources,
    handleImport,
    doDelete,
  };
}
export type ResearchApp = ReturnType<typeof useResearchApp>;
