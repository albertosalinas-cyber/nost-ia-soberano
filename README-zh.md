# NOST-IA：具有人工智能的主权领土操作节点

> **“捍卫街角杂货店和社区商业的人工智能。无互联网。无企业。无强制订阅。100% 主权。”**
> — *图书情报学与信息学教授 ALBERTO SALINAS MENDIETA*
> *为领土服务的人工智能 • 阿根廷布宜诺斯艾利斯马塔德罗斯*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![Ollama](https://img.shields.io/badge/Ollama-Local_AI-black?logo=ollama)
![Status](https://img.shields.io/badge/Status-En_Desarrollo-orange)
![Sovereign AI](https://img.shields.io/badge/Soberan%C3%ADa-100%25_Offline-red)

**NOST-IA** 是一个集成了本地人工智能的自动化、库存控制、成本计算和柜台助手系统。专为**社区杂货店、合作社和大众商业**设计，100% 离线运行，保护您的数据，且无需订阅。

---

## 📖 目录
* [什么是 NOST-IA？](#-什么是-nost-ia)
* [哲学与主权](#-哲学与主权)
* [主要特点](#-主要特点)
* [技术栈](#-技术栈)
* [安装与启动](#-安装与启动)
* [文档](#-文档与项目指南)
* [联系与支持](#-联系与支持)

---

## 🎯 什么是 NOST-IA？

**NOST-IA** 是一个综合系统，用于自动化、库存控制、智能库存、成本计算，并作为具有本地人工智能的柜台助手。其设计秉持不可动摇的**技术主权**前提：
* **100% 离线：** 无需互联网连接即可运行。敏感的采购、销售、成本和供应商信息永远不会离开您的计算机。
* **隐私与网络安全：** 不将数据存储在外部服务器上，也不向公共网络暴露端口。
* **本地持久化：** 在商家的物理硬盘上运行于 **Dexie / IndexedDB**。关闭营业日后，无需重新安装或重置数据。
* **为大众计算机优化：** 在 4 GB RAM 的设备（Intel Celeron、Core i3 或 AMD Athlon）上运行。

---

## 🚀 主要特点

1. **库存控制与库存预警：** 实时检测缺货，并准确计算**货架资本**（按批发成本投资 vs. 按销售价格的潜在收入）。
2. **固定成本与公平价格计算：** 将租金、水电费、互联网和市政税费分摊到每件产品上，以确保永远不会亏本销售。
3. **主权柜台 AI 助手：**
   * 自然、温暖、阿根廷式的对话。
   * 建议**闪电组合**以清理滞销商品并快速获取现金。
   * 通过本地 Ollama 集成**Qwen 2.5 Coder 1.5B** 等超轻量本地模型。
4. **智能发票和送货单加载（2D VDU 管道）：** 对 A/B/C 类发票、带有二维码的 AFIP 税务票据和批发送货单进行几何处理，采用 5 阶段否决矩阵（50kg vs 1kg，Harina 000 vs 0000）。
5. **营业日结束与主权备份：** 一键下载和恢复带有 SHA-256 加密签名的 JSON 格式备份，保存到 U 盘。
6. **主权更新系统：** 尊重隐私的无遥测协议，对具有完整服务的节点进行双密钥验证。

---

## 🛠️ 最低要求

* **操作系统：** Windows 10 / 11, Linux (Ubuntu, Debian, Fedora) 或 macOS。
* **处理器：** 任何现代或办公 CPU（Intel Core i3/i5/i7 或 AMD Ryzen / Athlon）。
* **内存：** 最低 4 GB RAM。
* **软件：** [Node.js (v18+)](https://nodejs.org/) 以及可选的 [Ollama](https://ollama.com/) 用于本地副驾驶。

---

## ⚡ 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/albertosalinas-cyber/nost-ia-soberano.git
cd nost-ia-soberano

# 2. 安装依赖
npm install

# 3. 在本地终端下载轻量模型（可选）
ollama pull qwen2.5-coder:1.5b

# 4. 启动 NOST-IA
npm run dev
在浏览器中打开 http://localhost:3000。

📖 文档与项目指南
PHILOSOPHY.md: 宣言、大师提示词和主权哲学。

MANUAL_TROUBLESHOOTING_FAQ.md: 常见问题解决方案（端口占用、快捷方式、持久化）。

AUDITORIA_INTEGRAL_LANZAMIENTO.md: 功能、UI/UX、摄取和网络安全的详尽审计。

LICENSE: GNU 通用公共许可证 v3 (GPLv3)。

⚠️ 数据责任主权条款
由于这是一个 100% 本地系统，数据仅存在于用户计算机的硬盘上。NOST-IA 不会在外部服务器上存储或复制任何内容。如果计算机在没有事先备份的情况下发生硬件故障，责任由用户承担。建议定期备份到物理 U 盘。

🤝 联系与支持
如需支持咨询、培训或完整服务：

持有人： 教授 ALBERTO SALINAS MENDIETA

邮箱： alberto.salinas@bue.edu.ar

WhatsApp： 11-3768-9803

官方别名： NOST.IA.SOBERANO
