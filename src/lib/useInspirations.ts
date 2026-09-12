import { useEffect, useRef, useState } from "react";
import { storage } from "./storage";
import {
  defaultInspirations,
  nextInspirations,
  rememberInspirations,
  validateInspirations,
} from "./inspirations";
import type { Inspiration, ResearchTrack } from "./inspirations";

export function useInspirations() {
  const [items, setItems] = useState<Inspiration[]>(
    structuredClone(defaultInspirations),
  );
  const [track, setTrack] = useState<ResearchTrack | "全部">("全部");
  const [visibleIds, setVisibleIds] = useState<string[]>(
    defaultInspirations.slice(0, 3).map((x) => x.id),
  );
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const history = useRef<string[]>(visibleIds);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    void storage
      .inspirations()
      .then((saved) => {
        if (!active) return;
        setItems(saved);
        const group = nextInspirations(saved);
        setVisibleIds(group.map((x) => x.id));
        history.current = group.map((x) => x.id);
      })
      .catch(() => {
        if (active) setError("无法读取本机问题库，暂时显示内置问题。");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const filtered = items.filter((x) => track === "全部" || x.tag === track);
  const visible = visibleIds.flatMap((id) => {
    const item = filtered.find((x) => x.id === id);
    return item ? [item] : [];
  });
  const show = (pool: Inspiration[]) => {
    const group = nextInspirations(pool, history.current);
    setVisibleIds(group.map((x) => x.id));
    history.current = rememberInspirations(
      history.current,
      group,
      items.length,
    );
  };
  const chooseTrack = (next: ResearchTrack | "全部") => {
    setTrack(next);
    show(items.filter((x) => next === "全部" || x.tag === next));
  };
  const persist = async (next: Inspiration[]): Promise<boolean> => {
    if (!ready || busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const valid = validateInspirations(next);
      await storage.saveInspirations(valid);
      setItems(valid);
      const pool = valid.filter((x) => track === "全部" || x.tag === track);
      const remaining = visibleIds.filter((id) =>
        pool.some((x) => x.id === id),
      );
      const fill = nextInspirations(
        pool.filter((x) => !remaining.includes(x.id)),
        history.current,
        3 - remaining.length,
      );
      setVisibleIds([...remaining, ...fill.map((x) => x.id)]);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `未能保存：${cause.message}`
          : "未能保存，请检查浏览器存储空间。",
      );
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return {
    items,
    visible,
    track,
    ready,
    saving,
    error,
    filtered,
    chooseTrack,
    shuffle: () => show(filtered),
    save: (item: Inspiration) =>
      persist(
        items.some((x) => x.id === item.id)
          ? items.map((x) => (x.id === item.id ? item : x))
          : [...items, item],
      ),
    remove: (id: string) => persist(items.filter((x) => x.id !== id)),
    restoreDefaults: () =>
      persist([
        ...items,
        ...defaultInspirations.filter(
          (x) => !items.some((current) => current.id === x.id),
        ),
      ]),
    replace: persist,
  };
}
