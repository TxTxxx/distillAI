import { useState } from "react";
import { FileText, Link2, LoaderCircle, Upload } from "lucide-react";
import type { Source } from "../types";
import { uid } from "../types";
import { importFile, importLink } from "../lib/materials";
import { errorMessage } from "../lib/api";
import Modal from "./Modal";
export default function Materials({
  onAdd,
  onClose,
}: {
  onAdd: (sources: Source[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"file" | "text" | "url">("file");
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState({ file: "", text: "", url: "" });
  const text = drafts[tab];
  const setText = (value: string) =>
    setDrafts((old) => ({ ...old, [tab]: value }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const add = async (files?: FileList | null) => {
    setBusy(true);
    setError("");
    try {
      let sources: Source[] = [];
      if (files) {
        for (const file of Array.from(files))
          sources.push(await importFile(file, "S0"));
      } else if (tab === "url") {
        sources = [await importLink(text, "S0")];
      } else {
        if (!text.trim()) throw new Error("请先粘贴资料正文。");
        sources = [
          {
            id: uid(),
            label: "S0",
            title: title.trim() || "我的研究材料",
            kind: "text",
            evidence: "provided",
            text,
          },
        ];
      }
      onAdd(sources);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="加入论文与资料"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="segmented">
        {(
          [
            ["file", "上传文件", Upload],
            ["text", "粘贴正文", FileText],
            ["url", "论文链接", Link2],
          ] as const
        ).map(([t, label, Icon]) => (
          <button
            key={t}
            disabled={busy}
            className={tab === t ? "selected" : ""}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setError("");
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {tab === "file" ? (
        <label className="upload-zone">
          <Upload size={30} />
          <strong>选择论文或研究笔记</strong>
          <span>PDF、Markdown、TXT · 单文件不超过 30 MB</span>
          <input
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            disabled={busy}
            onChange={(e) => void add(e.target.files)}
          />
        </label>
      ) : (
        <div className="form-grid">
          {tab === "text" && (
            <label className="full">
              资料名称（选填）
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：DreamerV3 阅读笔记"
              />
            </label>
          )}
          <label className="full">
            {tab === "url" ? "论文或项目链接" : "资料正文"}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={tab === "url" ? 3 : 9}
              placeholder={
                tab === "url"
                  ? "https://arxiv.org/abs/…"
                  : "粘贴希望两位角色共同参考的内容…"
              }
            />
          </label>
          <button
            className="primary"
            disabled={busy || !text.trim()}
            onClick={() => void add()}
          >
            加入本场资料
          </button>
        </div>
      )}
      <p className="help">
        资料保存在当前浏览器；研讨时相关内容会发送给你配置的模型服务。PDF
        提取文字不包含对图表的视觉理解，扫描件需另行提供可读正文。链接若受跨域限制，将保留为「尚未读取」。
      </p>
      {busy && (
        <div className="test-result" role="status">
          <LoaderCircle className="spin" size={17} />
          正在读取资料，请稍候…
        </div>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
