import { newSession, uid } from "../types";
import type { Session } from "../types";
export function exampleSession(): Session {
  const s = newSession("预测世界与生成动作，能否相互成就？", "research");
  s.demo = true;
  s.rounds = 2;
  s.search = false;
  s.turns = [
    {
      id: uid(),
      speaker: 0,
      text: "我们先把问题拆开：**预测得更准确，是否一定能控制得更好？**\n\n不一定。世界模型可以学习环境的变化，但控制需要保留那些与行动后果有关的信息。一个模型即使能生成视觉上连贯的未来，也可能忽略接触状态或微小位姿误差。\n\n因此，比起笼统地问“世界模型有没有用”，更值得问：联合训练究竟改善了哪些与任务成功有关的表征？这是一条需要实验验证的假设。",
      status: "complete",
      createdAt: Date.now(),
      citations: [],
    },
    {
      id: uid(),
      speaker: 1,
      text: "我同意先限定“有用”的含义。假设你观察到动作成功率提升，我会先追问：**你是否控制了数据量和计算预算？**\n\n可以安排三组对照：仅动作预测、加入世界预测的联合训练，以及相同参数量和计算量下的动作预测。还需要区分分布内任务与新物体、新场景的泛化。\n\n如果收益只出现在更多数据的设置下，就还不能把改善归因于世界建模本身。这个消融应当成为研究方案的一部分。",
      status: "complete",
      createdAt: Date.now(),
      citations: [],
    },
    {
      id: uid(),
      speaker: 0,
      text: "可以。先写出一个概念性的联合目标：\n\n$$\\mathcal{L} = \\mathcal{L}_{action} + \\lambda\\mathcal{L}_{world}$$\n\n这里的 λ 控制世界预测任务的权重。这个表达式只是组织问题的起点，**它本身不能证明两种任务会互相帮助**。关键还包括：两条路径是否共享有效信息，以及世界预测的梯度是否与动作学习产生冲突。\n\n接下来我会观察不同权重下的任务成功率，同时记录世界预测误差。若预测指标改善而控制指标下降，就需要重新检查表征与监督信号的关系。",
      status: "complete",
      createdAt: Date.now(),
      citations: [],
    },
  ];
  s.notes =
    "## 关键认识\n\n世界预测质量和控制成功率是两个不同的指标，需要通过受控实验建立联系。\n\n## 仍有争议\n\n共享表征在什么条件下帮助动作泛化？辅助目标何时引起梯度冲突？\n\n## 待验证问题\n\n控制参数量、数据量和训练计算量后，联合学习的收益是否仍存在？\n\n## 下一步实验\n\n比较仅动作模型、联合模型及等计算量对照，分开报告分布内和分布外表现。\n\n> 这是用于预览交互与排版的人工编写示例，不是实际模型调用或论文实证结论。";
  return s;
}
