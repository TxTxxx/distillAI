import { sharedPrompt, tutorPrompt } from "./lib/prompts";
export type Provider = "openai" | "claude" | "gemini" | "compatible";
export type ProfileKey = "shared" | "a" | "b" | "tutor";
export interface ModelConfig {
  provider: Provider;
  baseUrl: string;
  model: string;
  key: string;
}
export interface VoiceConfig {
  provider: "openai" | "elevenlabs";
  baseUrl: string;
  model: string;
  key: string;
  voices: [string, string, string];
}
export interface Settings {
  profiles: Record<ProfileKey, ModelConfig>;
  voice: VoiceConfig;
  assignments: [ProfileKey, ProfileKey, ProfileKey];
  speed: number;
  prompts: {
    shared: string;
    tutor: string;
    research: [Role, Role];
    interview: [Role, Role];
  };
}
export interface Source {
  id: string;
  label: string;
  title: string;
  kind: "pdf" | "text" | "web";
  evidence: "provided" | "extracted" | "search" | "unread";
  url?: string;
  text: string;
  pages?: { page: number; text: string }[];
  warning?: string;
  blobId?: string;
}
export interface Citation {
  url: string;
  title: string;
  excerpt?: string;
}
export interface Usage {
  input: number;
  output: number;
}
export interface Turn {
  id: string;
  speaker: 0 | 1;
  text: string;
  status: "streaming" | "complete" | "interrupted" | "error";
  createdAt: number;
  citations: Citation[];
  usage?: Usage;
  forwarded?: string[];
}
export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: Turn["status"];
  anchorId?: string;
  quote?: string;
  snapshotIds: string[];
  citations: Citation[];
}
export interface Role {
  name: string;
  duty: string;
}
export interface Session {
  id: string;
  title: string;
  mode: "research" | "interview";
  createdAt: number;
  updatedAt: number;
  rounds: number;
  autoStop?: boolean;
  stopReason?: string;
  stopAtTurn?: number;
  sharedPrompt?: string;
  tutorPrompt?: string;
  roles: [Role, Role];
  turns: Turn[];
  tutor: TutorMessage[];
  sources: Source[];
  notes: string;
  bookmarks: string[];
  pendingQuestions: { id: string; text: string }[];
  summary: string;
  summaryThrough: number;
  playback?: { turnId: string; segment: number; seconds: number };
  search: boolean;
  voice: boolean;
  demo?: boolean;
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface ModelRequest {
  system: string;
  messages: ChatMessage[];
  search?: boolean;
  maxTokens?: number;
  signal?: AbortSignal;
  onDelta?: (text: string) => void;
}
export interface ModelResult {
  text: string;
  citations: Citation[];
  usage: Usage;
  searched: boolean;
}
export const uid = () => crypto.randomUUID();
export const rolePresets: Record<Session["mode"], [Role, Role]> = {
  research: [
    {
      name: "研究者",
      duty: "提出可证伪的机制解释，结合直觉、必要公式和实验设计展开观点。积极回应质疑，承认并修正不成立的假设。",
    },
    {
      name: "审稿人",
      duty: "检验对方论据、寻找反例，追问数据、计算量、消融与评估是否支持结论。认可成立的观点，不为反驳而反驳。",
    },
  ],
  interview: [
    {
      name: "研究负责人",
      duty: "主持高阶具身智能算法面试，基于候选人上一轮回答继续追问机制、实验和研究取舍。每次聚焦一个主要问题。",
    },
    {
      name: "候选人",
      duty: "展示研究级理解与清晰推导，解释假设、实验和失败模式。不会的内容如实说明，积极修正答案，不假装掌握未提供的论文细节。",
    },
  ],
};
export const defaults: Settings = {
  profiles: Object.fromEntries(
    ["shared", "a", "b", "tutor"].map((k) => [
      k,
      {
        provider: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "",
        key: "",
      },
    ]),
  ) as Settings["profiles"],
  assignments: ["shared", "shared", "shared"],
  voice: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini-tts",
    key: "",
    voices: ["cedar", "marin", "coral"],
  },
  speed: 1,
  prompts: {
    shared: sharedPrompt,
    tutor: tutorPrompt,
    research: structuredClone(rolePresets.research),
    interview: structuredClone(rolePresets.interview),
  },
};
export const providerBases: Record<Provider, string> = {
  openai: "https://api.openai.com/v1",
  claude: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  compatible: "",
};
export function newSession(title: string, mode: Session["mode"]): Session {
  return {
    id: uid(),
    title,
    mode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rounds: 12,
    autoStop: true,
    sharedPrompt,
    tutorPrompt,
    roles: structuredClone(rolePresets[mode]),
    turns: [],
    tutor: [],
    sources: [],
    notes: "",
    bookmarks: [],
    pendingQuestions: [],
    summary: "",
    summaryThrough: 0,
    search: true,
    voice: false,
  };
}
