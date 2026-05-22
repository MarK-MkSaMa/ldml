# LDML · Linux DO 大模型排行榜

> 一个由 Linux DO 社区用户投票产生的大模型排行榜站点。覆盖文字、生图、生视频模型，区分开源 / 非开源；评分来自社区真人。

🔗 **Linux DO 社区**：[https://linux.do](https://linux.do)
🔗 **本站维护者**：[马克MkSaMa](https://linux.do/u/markskz/summary)

---

## 功能概览

- 🏆 多维度排行榜（开源 / 非开源 × 文字 / 生图 / 生视频）
- 👤 Linux DO OAuth 登录（接入信任等级体系，≥ 1 级即可投票/评论）
- ⭐ 1–10 整数评分，每个维度独立打分；允许跳过 / 修改 / 撤回
- 📈 贝叶斯加权均分排序，避免少票模型霸榜
- 📊 个人偏好权重：每个用户可自定义维度权重，看到不同的"个人排行"
- 💬 站内评论：Markdown / 二级回复 / 点赞点踩 / 举报
- 📢 公告系统：管理员发布通知，置顶横条 + 历史列表
- 🆕 观察区：新模型先在观察区接受投票，满足条件（7 天 或 50 票）自动晋升
- 📱 移动端卡片视图自适应
- 👥 个人中心：查看自己的评分与评论历史

---

## 评分排序算法

展示给用户看的是真实算术均分，排行用**贝叶斯加权均分**计算，避免少票模型霸榜：

```
weighted = (C × m + n × avg) / (C + n)
```

其中：
- `n` = 该 (model, dimension) 的有效投票数
- `avg` = 该 (model, dimension) 的算术均分
- `m` = 该 dimension 的全站均值
- `C` = 平滑系数（当前为 30）

热度排序公式（用于评论）：

```
hotScore = (likes - dislikes) - hours_since_post / 4
```

---

## 反馈与贡献

- 🐛 发现 Bug、希望加入新模型：到 Linux DO 私信 [马克MkSaMa](https://linux.do/u/markskz/summary)
- ⭐ 觉得有用，欢迎 Star

---

## License

[MIT](./LICENSE) © 2026 MarK-MkSaMa

— 由 [@markskz](https://linux.do/u/markskz/summary) 维护，与 Linux DO 官方无关。
