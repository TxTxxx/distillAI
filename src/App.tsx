import { lazy, Suspense } from "react";
import { BookOpen, LoaderCircle, Plus, Settings2, X } from "lucide-react";
import { useResearchApp } from "./lib/useResearchApp";
import { defaults } from "./types";
import { backup, download, markdown } from "./lib/storage";
import History from "./components/History";
import Launch from "./components/Launch";
import Room from "./components/Room";
import Modal from "./components/Modal";
import AgentEditor from "./components/AgentEditor";
const Settings = lazy(() => import("./components/Settings"));
const Materials = lazy(() => import("./components/Materials"));

export default function App() {
  const app = useResearchApp();
  const { engine, state, s } = app;
  return (
    <div className={`app ${s ? "reading-mode" : ""}`}>
      <header className="app-header">
        <button
          className="wordmark"
          aria-label="观研首页"
          onClick={app.newRoom}
        >
          观研
        </button>
        <nav aria-label="主导航">
          <button
            aria-label="新的研讨"
            className={!s && !app.modal ? "active" : ""}
            onClick={app.newRoom}
          >
            <Plus size={17} />
            <span>新的研讨</span>
          </button>
          <button
            aria-label="研讨记录"
            className={app.modal === "history" ? "active" : ""}
            onClick={() => app.setModal("history")}
          >
            <BookOpen size={17} />
            <span>研讨记录</span>
          </button>
          <button
            aria-label="模型与声音"
            onClick={() => app.setModal("settings")}
          >
            <Settings2 size={17} />
            <span>模型与声音</span>
          </button>
        </nav>
      </header>
      <input
        className="hidden"
        type="file"
        accept=".json"
        ref={app.importRef}
        onChange={(e) => void app.handleImport(e.target.files?.[0])}
      />
      {(state.error || state.notice) && (
        <div
          className={`app-notice ${state.error ? "error" : ""}`}
          role={state.error ? "alert" : "status"}
        >
          <span>{state.error || state.notice}</span>
          {state.error && (
            <button onClick={() => app.setModal("settings")}>检查设置</button>
          )}
          <button
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => engine.emit({ error: "", notice: "" })}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {s ? (
        <Room
          key={s.id}
          engine={engine}
          state={state}
          settings={app.settings}
          setSettings={app.setSettings}
          onMaterials={() => app.setModal("materials")}
          onRoles={() => app.setModal("roles")}
          onSettings={() => app.setModal("settings")}
          onExport={(type) =>
            download(
              `guanyan-${s.id}.${type}`,
              type === "json" ? backup(s) : markdown(s),
              type === "json" ? "application/json" : "text/markdown",
            )
          }
        />
      ) : (
        <Launch app={app} />
      )}
      <Suspense
        fallback={
          <div className="loading-overlay" role="status">
            <LoaderCircle className="spin" />
            正在打开面板…
          </div>
        }
      >
        {app.modal === "settings" && (
          <Settings
            roles={s?.roles ?? app.roles}
            value={app.settings}
            onChange={app.setSettings}
            onClose={app.close}
          />
        )}
        {app.modal === "materials" && (
          <Materials onAdd={app.addSources} onClose={app.close} />
        )}
      </Suspense>
      {app.modal === "roles" && (
        <AgentEditor
          initialAgent={app.editorAgent}
          roles={s?.roles ?? app.roles}
          shared={
            s
              ? (s.sharedPrompt ?? defaults.prompts.shared)
              : app.settings.prompts.shared
          }
          tutor={
            s
              ? (s.tutorPrompt ?? defaults.prompts.tutor)
              : app.settings.prompts.tutor
          }
          mode={s?.mode ?? app.mode}
          inSession={!!s}
          onClose={app.close}
          onChange={(roles, shared, tutor) => {
            if (s)
              engine.update((current) => {
                current.roles = roles;
                current.sharedPrompt = shared;
                current.tutorPrompt = tutor;
              });
            else {
              app.setRoles(roles);
              app.setSettings((current) => ({
                ...current,
                prompts: {
                  ...current.prompts,
                  [app.mode]: roles,
                  shared,
                  tutor,
                },
              }));
            }
          }}
        />
      )}
      {app.modal === "history" && <History app={app} />}
      {app.deleteId && (
        <Modal
          title="删除这场研讨？"
          onClose={() => app.setDeleteId(undefined)}
        >
          <p>
            这场研讨的对话、笔记和资料缓存将从当前浏览器删除，无法撤销。如需保留，请先返回记录列表导出备份。
          </p>
          <div className="modal-actions">
            <button
              className="secondary"
              onClick={() => app.setDeleteId(undefined)}
            >
              保留研讨
            </button>
            <button className="danger" onClick={() => void app.doDelete()}>
              删除研讨
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
