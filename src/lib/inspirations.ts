/** Authored discussion starters, not retrieved research findings. */
export type ResearchTrack = "World Model" | "VLA" | "World Action Model";
export type Inspiration = {
  id: string;
  tag: ResearchTrack;
  question: string;
  detail: string;
  prompt: string;
};
export const researchTracks: ResearchTrack[] = [
  "World Model",
  "VLA",
  "World Action Model",
];
const starters: [ResearchTrack, string, string, string][] = [
  [
    "World Model",
    "想象中的世界，如何指导真实行动？",
    "模型误差与长期规划",
    "世界模型的预测误差如何影响长期规划？以 Dreamer 类方法为例，讨论模型偏差、想象轨迹长度和策略优化之间的取舍。",
  ],
  [
    "VLA",
    "理解了语言，就能学会行动吗？",
    "语言理解与动作泛化",
    "VLA 如何把视觉语言表征转化为可泛化的动作？讨论动作表示、训练分布和跨场景泛化的实验设计。",
  ],
  [
    "World Action Model",
    "预测世界与生成动作，能否相互成就？",
    "联合建模的收益与代价",
    "World Action Model 中，联合预测世界与动作在什么条件下能帮助机器人泛化？先明确这里的 WAM 定义，再讨论共享表征、监督信号、消融与等计算量对照。",
  ],
  [
    "World Model",
    "画面越真实，规划就越可靠吗？",
    "视觉保真度与决策价值",
    "世界模型的视觉生成质量与下游控制表现是否一致？区分视觉保真度、动力学一致性和决策相关性，设计能检验三者关系的实验。",
  ],
  [
    "VLA",
    "一个动作，应该是一串 token 还是一条轨迹？",
    "离散与连续动作表示",
    "比较 VLA 中离散动作 token、连续回归和扩散式动作生成的优势与局限。控制数据和计算预算，如何公平比较精度、延迟与泛化？",
  ],
  [
    "World Action Model",
    "同一个表征，能兼顾预测和控制吗？",
    "共享表征的梯度冲突",
    "联合世界与动作建模时，视觉预测与动作学习可能在哪些条件下产生梯度冲突？提出共享主干与分离主干的公平对照和诊断指标。",
  ],
  [
    "World Model",
    "世界模型知道自己不知道什么吗？",
    "不确定性与分布外状态",
    "如何区分世界模型的认知不确定性和环境随机性？讨论校准方法，以及策略如何利用不确定性避免想象中的虚假高回报。",
  ],
  [
    "VLA",
    "换一台机器人，还能复用多少能力？",
    "跨本体迁移",
    "跨机器人本体迁移需要怎样的动作空间和观测表征？讨论形态差异、动作归一化、数据混合与零样本和微调评估的区别。",
  ],
  [
    "World Action Model",
    "联合训练的提升，究竟来自哪里？",
    "因果归因与等预算对照",
    "如何判断联合世界与动作训练的提升源于任务互补，而不是参数量、数据量或训练时间？提出等预算消融、负对照和失败条件。",
  ],
  [
    "World Model",
    "该想象多远，才值得付出计算？",
    "自适应规划视野",
    "想象轨迹应该固定长度还是根据不确定性自适应截断？从误差累积、奖励稀疏和计算预算出发，给出可验证的规划视野选择策略。",
  ],
  [
    "VLA",
    "成功率之外，怎样评估一个机器人？",
    "评估泄漏与鲁棒性",
    "如何为 VLA 构建可信的泛化评估？区分新对象、新场景、新指令与新任务组合，检查数据泄漏、试验重复和失败恢复能力。",
  ],
  [
    "World Action Model",
    "没有动作标注的视频，还能教会什么？",
    "被动视频与可控性",
    "无动作标注的视频能为联合世界与动作模型提供哪些信息？区分表征预训练、潜在动作推断和真实可控性，提出避免因果混淆的验证。",
  ],
  [
    "World Model",
    "预测下一帧，是否足够理解因果？",
    "干预与反事实",
    "观察性视频预测能否支持机器人干预？讨论可识别性、动作条件化和反事实推演，设计区分相关性预测与干预能力的实验。",
  ],
  [
    "VLA",
    "数据越多，稀有失败会越少吗？",
    "长尾数据与恢复策略",
    "增加机器人示范数据是否必然改善长尾失败？讨论数据覆盖、失败样本、纠错轨迹和主动采集，以及如何衡量恢复能力。",
  ],
  [
    "World Action Model",
    "什么时候应该放弃统一模型？",
    "统一建模的适用边界",
    "哪些任务条件下分离的世界模型与动作策略可能优于统一模型？从训练稳定性、推理成本、模块替换和数据需求提出反例与选择标准。",
  ],
  [
    "World Model",
    "潜在空间里，什么信息值得保留？",
    "表征压缩与状态充分性",
    "世界模型的潜在状态如何权衡压缩和控制相关信息？讨论部分可观测性、记忆机制、状态充分性与表征坍缩的诊断。",
  ],
  [
    "VLA",
    "机器人真的在听指令，还是只看场景？",
    "语言依赖与捷径学习",
    "如何验证 VLA 确实依据语言指令行动而不是依赖视觉捷径？设计相同场景下的指令反事实、组合泛化与语言扰动实验。",
  ],
  [
    "World Action Model",
    "更大的统一模型，能满足实时控制吗？",
    "推理延迟与闭环频率",
    "联合世界与动作模型如何满足实时闭环控制？讨论动作分块、异步推理、预测误差修正和计算预算，设计延迟扰动下的评估。",
  ],
];
export const defaultInspirations: Inspiration[] = starters.map(
  ([tag, question, detail, prompt], i) => ({
    id: `starter-${i + 1}`,
    tag,
    question,
    detail,
    prompt,
  }),
);

export function validateInspirations(value: unknown): Inspiration[] {
  if (!Array.isArray(value) || value.length > 500)
    throw new Error("问题库格式无效。");
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("问题库条目无效。");
    const { id, tag, question, detail, prompt } = item as Inspiration;
    if (
      typeof id !== "string" ||
      !id ||
      ids.has(id) ||
      !researchTracks.includes(tag) ||
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 160 ||
      typeof detail !== "string" ||
      detail.length > 160 ||
      typeof prompt !== "string" ||
      !prompt.trim() ||
      prompt.length > 4000
    )
      throw new Error("问题库条目无效：请检查标题、方向和问题内容。");
    ids.add(id);
    return {
      id,
      tag,
      question: question.trim(),
      detail: detail.trim(),
      prompt: prompt.trim(),
    };
  });
}

/** Prefer unseen questions, then least-recently displayed ones, preventing adjacent repeats when the pool permits. */
export function nextInspirations(
  pool: Inspiration[],
  history: string[] = [],
  count = 3,
): Inspiration[] {
  const recent = new Map(history.map((id, index) => [id, index]));
  return pool
    .map((item, index) => ({ item, index, seen: recent.get(item.id) ?? -1 }))
    .sort((a, b) => a.seen - b.seen || a.index - b.index)
    .slice(0, Math.max(0, count))
    .map(({ item }) => item);
}
export function rememberInspirations(
  history: string[],
  items: Inspiration[],
  poolSize: number,
): string[] {
  return [...history, ...items.map(({ id }) => id)].slice(
    -Math.max(1, poolSize * 2),
  );
}
