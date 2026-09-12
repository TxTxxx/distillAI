import type { Session } from "../types";
export type HistoryFilter = "all" | "notes" | "bookmarks";
export function findSessions(
  sessions: Session[],
  query: string,
  filter: HistoryFilter,
) {
  const needle = query.trim().toLocaleLowerCase();
  return sessions.filter((s) => {
    if (filter === "notes" && !s.notes.trim()) return false;
    if (filter === "bookmarks" && !s.bookmarks.length) return false;
    return (
      !needle ||
      [
        s.title,
        s.notes,
        ...s.sources.map((source) => source.title),
        ...s.turns.map((turn) => turn.text),
        ...s.tutor.map((message) => message.text),
      ].some((text) => text.toLocaleLowerCase().includes(needle))
    );
  });
}

const quoteExcerpt = (text: string) =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

export function hasExcerpt(notes: string, text: string) {
  return Boolean(text.trim()) && notes.includes(quoteExcerpt(text));
}

export function appendExcerpt(notes: string, text: string) {
  if (!text.trim() || hasExcerpt(notes, text)) return notes;
  return `${notes.trimEnd()}${notes.trim() ? "\n\n" : ""}### 收藏摘录\n\n${quoteExcerpt(text)}\n`;
}
