import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Source, Citation } from "../types";
import { safeUrl } from "../lib/api";
export default function Markdown({
  text,
  sources = [],
  citations = [],
  onSource,
}: {
  text: string;
  sources?: Source[];
  citations?: Citation[];
  onSource?: (label: string, page?: number) => void;
}) {
  const normalized = text.replace(
    /\[\[(S\d+)(?::(\d+))?\]\]/g,
    (_, label, page) =>
      `[${label}${page ? ` · p.${page}` : ""}](source:${label}${page ? ":" + page : ""})`,
  );
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { strict: false, throwOnError: false, trust: false }],
        ]}
        urlTransform={(url) =>
          url.startsWith("source:") ? url : (safeUrl(url) ?? "")
        }
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("source:")) {
              const [, label, page] = href.split(":");
              const found = sources.find((s) => s.label === label);
              return found ? (
                <button
                  className="source-cite"
                  onClick={() =>
                    onSource?.(label, page ? Number(page) : undefined)
                  }
                >
                  {children}
                </button>
              ) : (
                <span className="unverified" title="该引用没有对应的实际资料">
                  {children} · 未核实
                </span>
              );
            }
            const verified =
              citations.some((c) => c.url === href) ||
              sources.some((s) => s.url === href);
            return href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={verified ? "" : "unverified"}
                title={
                  verified ? "查看来源" : "该链接未与本场实际资料匹配，尚未核实"
                }
              >
                {children}
                {!verified && <small> ↗ 未核实</small>}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ alt }) => (
            <span className="subtle">
              [图片：{alt || "外部图片未自动加载"}]
            </span>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
