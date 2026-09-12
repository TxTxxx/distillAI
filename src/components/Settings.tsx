import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Volume2, Globe, Cpu, Trash2 } from "lucide-react";
import type { Settings as SettingsType, ProfileKey, Provider } from "../types";
import { providerBases } from "../types";
import { generate, errorMessage } from "../lib/api";
import { AudioQueue } from "../lib/audio";
import { storage } from "../lib/storage";
import Modal from "./Modal";
export default function Settings({
  value,
  onChange,
  onClose,
}: {
  value: SettingsType;
  onChange: (s: SettingsType) => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<"models" | "voice">("models");
  const [profile, setProfile] = useState<ProfileKey>("shared");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState("");
  const controller = useRef<AbortController | undefined>(undefined);
  const player = useRef(new AudioQueue());
  useEffect(
    () => () => {
      controller.current?.abort();
      player.current.stop();
    },
    [],
  );
  const config = value.profiles[profile];
  const edit = (patch: Partial<typeof config>) => {
    setResult("");
    onChange({
      ...value,
      profiles: { ...value.profiles, [profile]: { ...config, ...patch } },
    });
  };
  const test = async (search: boolean) => {
    setBusy(search ? "search" : "model");
    setResult("");
    const c = new AbortController();
    controller.current = c;
    try {
      const r = await generate(config, {
        system: "你是接口连通性检测助手。请简洁回应。",
        messages: [
          {
            role: "user",
            content: search
              ? "请实际搜索 DreamerV3 官方论文，返回标题和来源链接。"
              : "请只回复：连接成功。",
          },
        ],
        search,
        maxTokens: search ? 1500 : 100,
        signal: c.signal,
      });
      setResult(
        search
          ? `联网可用，实际返回 ${r.citations.length} 个来源。`
          : "模型连接成功。",
      );
    } catch (e) {
      if (!c.signal.aborted) setResult(errorMessage(e));
    } finally {
      if (!c.signal.aborted) setBusy("");
    }
  };
  const preview = async (speaker: 0 | 1 | 2) => {
    setBusy("voice" + speaker);
    setResult("");
    player.current.stop();
    player.current.unlock();
    try {
      await player.current.enqueue(
        {
          sessionId: "preview",
          turnId: "voice-test",
          index: 0,
          speaker,
          text: "我们先从一个关键问题开始。VLA 将视觉、语言与动作联系起来，但预测更准确，是否一定意味着控制更好？要回答这个问题，需要区分训练数据的影响，以及 world model 本身带来的收益。",
        },
        value.voice,
        value.profiles[value.assignments[2]],
      );
      setResult("试听结束。请根据普通话、英文术语和角色辨识度判断音色。");
    } catch (e) {
      setResult(errorMessage(e));
    } finally {
      setBusy("");
    }
  };
  return (
    <Modal title="模型与声音" onClose={onClose} wide>
      <p className="settings-intro">
        连接你使用的模型与语音服务。密钥仅保留在当前页面，刷新后需要重新填写。
      </p>
      <div className="segmented">
        <button
          className={section === "models" ? "selected" : ""}
          onClick={() => {
            setSection("models");
            setResult("");
          }}
        >
          <Cpu size={16} />
          讨论模型
        </button>
        <button
          className={section === "voice" ? "selected" : ""}
          onClick={() => {
            setSection("voice");
            setResult("");
          }}
        >
          <Volume2 size={16} />
          声音与播放
        </button>
      </div>
      <div className="settings-workspace">
        {section === "models" ? (
          <>
            <div className="profile-tabs">
              {(["shared", "a", "b", "tutor"] as const).map((p, i) => (
                <button
                  key={p}
                  className={profile === p ? "selected" : ""}
                  onClick={() => {
                    setProfile(p);
                    setResult("");
                  }}
                >
                  {["共用配置", "角色 A 专用", "角色 B 专用", "助教专用"][i]}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <label>
                接口类型
                <select
                  value={config.provider}
                  onChange={(e) =>
                    edit({
                      provider: e.target.value as Provider,
                      baseUrl: providerBases[e.target.value as Provider],
                      model: "",
                    })
                  }
                >
                  <option value="openai">OpenAI Responses</option>
                  <option value="claude">Claude Messages</option>
                  <option value="gemini">Gemini 原生接口</option>
                  <option value="compatible">通用兼容接口</option>
                </select>
              </label>
              <label>
                模型名称
                <input
                  value={config.model}
                  onChange={(e) => edit({ model: e.target.value })}
                  placeholder="填写账户中可用的模型 ID"
                  autoComplete="off"
                />
              </label>
              <label className="full">
                Base URL
                <input
                  value={config.baseUrl}
                  onChange={(e) => edit({ baseUrl: e.target.value })}
                  placeholder="https://your-provider.example/v1"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="full">
                API Key
                <input
                  type="password"
                  value={config.key}
                  onChange={(e) => edit({ key: e.target.value })}
                  placeholder="仅保留在当前页面内存中"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="button-row">
              <button
                className="secondary"
                disabled={!!busy}
                onClick={() => void test(false)}
              >
                {busy === "model" ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Check size={15} />
                )}
                检测模型
              </button>
              <button
                className="secondary"
                disabled={!!busy || config.provider === "compatible"}
                onClick={() => void test(true)}
              >
                {busy === "search" ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Globe size={15} />
                )}
                检测联网
              </button>
            </div>
            <p className="help">
              检测会发起真实 API
              请求并产生相应用量。兼容聊天接口不假定支持联网工具。浏览器直连需要服务允许跨域访问。
            </p>
            <h3 className="form-title">为三位伙伴分配模型</h3>
            <div className="form-grid triple">
              {value.assignments.map((a, i) => (
                <label key={i}>
                  {["主角色 A", "主角色 B", "私人助教 / 笔记"][i]}
                  <select
                    value={a}
                    onChange={(e) => {
                      const assignments = [
                        ...value.assignments,
                      ] as SettingsType["assignments"];
                      assignments[i] = e.target.value as ProfileKey;
                      onChange({ ...value, assignments });
                    }}
                  >
                    <option value="shared">共用配置</option>
                    <option value="a">角色 A 专用</option>
                    <option value="b">角色 B 专用</option>
                    <option value="tutor">助教专用</option>
                  </select>
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="form-grid">
              <label>
                语音服务
                <select
                  value={value.voice.provider}
                  onChange={(e) => {
                    const provider = e.target.value as "openai" | "elevenlabs";
                    onChange({
                      ...value,
                      voice: {
                        ...value.voice,
                        provider,
                        baseUrl:
                          provider === "openai"
                            ? "https://api.openai.com/v1"
                            : "https://api.elevenlabs.io/v1",
                        model:
                          provider === "openai"
                            ? "gpt-4o-mini-tts"
                            : "eleven_multilingual_v2",
                        voices:
                          provider === "openai"
                            ? ["cedar", "marin", "coral"]
                            : ["", "", ""],
                      },
                    });
                  }}
                >
                  <option value="openai">OpenAI Speech</option>
                  <option value="elevenlabs">ElevenLabs</option>
                </select>
              </label>
              <label>
                语音模型
                <input
                  value={value.voice.model}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      voice: { ...value.voice, model: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                语音 Base URL
                <input
                  value={value.voice.baseUrl}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      voice: { ...value.voice, baseUrl: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                语音 API Key
                <input
                  type="password"
                  value={value.voice.key}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      voice: { ...value.voice, key: e.target.value },
                    })
                  }
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="voice-list">
              {value.voice.voices.map((v, i) => (
                <div className="voice-row" key={i}>
                  <span className={`avatar role-${i}`}>
                    {["A", "B", "助"][i]}
                  </span>
                  <label>
                    {["角色 A 音色", "角色 B 音色", "助教音色"][i]}
                    <input
                      value={v}
                      placeholder="Voice ID"
                      onChange={(e) => {
                        const voices = [
                          ...value.voice.voices,
                        ] as SettingsType["voice"]["voices"];
                        voices[i] = e.target.value;
                        onChange({
                          ...value,
                          voice: { ...value.voice, voices },
                        });
                      }}
                    />
                  </label>
                  <button
                    className="secondary"
                    disabled={!!busy}
                    onClick={() => void preview(i as 0 | 1 | 2)}
                  >
                    <Volume2 size={16} />
                    试听
                  </button>
                </div>
              ))}
            </div>
            <p className="help">
              使用服务提供的音色 ID。请试听中文夹杂英文术语的表现。全部声音均为
              AI 合成。
            </p>
            <button
              className="secondary"
              onClick={() =>
                void storage
                  .clearAudio()
                  .then(() => setResult("已清理音频缓存，学习记录保留。"))
                  .catch((e: unknown) => setResult(errorMessage(e)))
              }
            >
              <Trash2 size={15} />
              清理音频缓存
            </button>
          </>
        )}
      </div>
      {result && (
        <div className="test-result" role="status">
          {result}
        </div>
      )}
      <div className="modal-actions">
        <span className="help">配置即时保存，密钥除外</span>
        <button className="primary" onClick={onClose}>
          完成设置
        </button>
      </div>
    </Modal>
  );
}
