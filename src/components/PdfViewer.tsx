import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { Source } from "../types";
import { storage } from "../lib/storage";
import Modal from "./Modal";
export default function PdfViewer({
  source,
  page = 1,
  onClose,
}: {
  source: Source;
  page?: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(page);
  const [count, setCount] = useState(source.pages?.length ?? 1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void } | undefined;
    let doc: { destroy: () => Promise<void> } | undefined;
    setBusy(true);
    setError("");
    void (async () => {
      try {
        if (!source.blobId)
          throw new Error("原 PDF 不在当前设备，请重新上传文件。");
        const blob = await storage.asset(source.blobId);
        if (!blob) throw new Error("未找到原 PDF，请重新上传文件。");
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const loading = pdfjs.getDocument({ data: await blob.arrayBuffer() });
        doc = loading;
        const pdf = await loading.promise;
        if (cancelled) {
          await loading.destroy();
          return;
        }
        setCount(pdf.numPages);
        const p = await pdf.getPage(Math.min(current, pdf.numPages));
        if (cancelled) return;
        const viewport = p.getViewport({ scale: 1.5 });
        const c = canvas.current!;
        c.width = viewport.width;
        c.height = viewport.height;
        const render = p.render({ canvas: c, viewport });
        task = render;
        await render.promise;
        if (!cancelled) setBusy(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "无法显示此页");
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
      void doc?.destroy();
    };
  }, [source, current]);
  return (
    <Modal title={source.title} onClose={onClose} wide>
      <div className="pdf-controls">
        <button
          className="secondary"
          disabled={current <= 1}
          onClick={() => setCurrent((x) => x - 1)}
        >
          <ChevronLeft size={16} />
          上一页
        </button>
        <span>
          第 {current} / {count} 页
        </span>
        <button
          className="secondary"
          disabled={current >= count}
          onClick={() => setCurrent((x) => x + 1)}
        >
          下一页
          <ChevronRight size={16} />
        </button>
      </div>
      {busy && (
        <div className="test-result">
          <LoaderCircle className="spin" size={16} />
          正在渲染原页
        </div>
      )}
      {error ? (
        <div className="error-box">{error}</div>
      ) : (
        <canvas
          ref={canvas}
          className="pdf-canvas"
          aria-label={`${source.title} 第${current}页`}
        />
      )}
      <details>
        <summary>本页提取文字</summary>
        <p className="source-excerpt">
          {source.pages?.find((p) => p.page === current)?.text ||
            "没有可提取文字。"}
        </p>
      </details>
    </Modal>
  );
}
