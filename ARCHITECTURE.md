# 健身网站架构地图（ARCHITECTURE）

> 本文记录当前 `main` 分支的实际代码组织、运行入口、功能边界、数据流和后续模块化建议。
> 盘点日期：2026-11-28。
> 本文是架构地图，不代表已经完成代码拆分。行号是本次盘点时的定位参考；代码变更后应重新定位。

## 1. 当前结论

当前网站具备一定的**逻辑功能分区**，但尚未完成**文件级模块化**：

- 正在使用的网页入口是根目录 `index.html`。
- `index.html` 同时承载页面 HTML、主要 CSS 和主要 JavaScript。
- 当前脚本是普通内联 `<script>`，没有使用 ES Module 的 `import/export`。
- 页面通过共享全局变量和直接 DOM 查询在功能之间传递状态。
- 根目录的 `app.js` 与 `style.css` 组成另一套不同界面的代码：`index.html` 没有引用它们，且它们使用的 DOM ID 与当前页面不同。仓库中也没有发现与它们配套的第二个 HTML 入口。暂时将它们视为未接入当前网页的独立/备用实现，**不要覆盖、删除或混入现行网站**。
- `manifest.webmanifest` 存在，但当前 `index.html` 未发现对它的引用。
- 本次仅进行代码读取和文档整理，没有修改业务代码、训练数据或网页交互。

## 2. 仓库文件地图

| 路径 | 当前职责 / 状态 | 维护说明 |
|---|---|---|
| `index.html` | 当前 GitHub Pages 网页入口；含页面结构、内联 CSS、内联 JS | 当前主要维护对象；修改前按功能定位代码 |
| `AGENTS.md` | AI 与开发者共同遵守的项目规则 | 每次接手任务先读 |
| `ARCHITECTURE.md` | 当前架构地图与未来拆分路线 | 架构变化后更新 |
| `training-history.json` | 网站读取的公开训练历史镜像 | 不把 AI 建议写入这里 |
| `app.js` | 另一套应用逻辑，当前入口未引用 | 未确认用途前保持原样 |
| `style.css` | 与上述另一套应用界面相配的样式，当前入口未引用 | 不要误当成现行网页样式文件 |
| `manifest.webmanifest` | PWA manifest 配置 | 当前入口未发现引用；修改 PWA 前核实安装路径 |
| `android-update.json` | Android 更新元数据 | 与网页 UI 模块无关 |
| `training-app-1.2.apk` | Android 安装包 | 不要在普通网页修改中改动 |

相关数据仓库：

- 私有数据仓库：`ButuSun/training-log`。
- 核心数据文件：`training-history.json`。
- 仓库 README 说明：网页通过 Cloudflare Worker 鉴权读写。
- 网站仓库中的 `training-history.json` 是公开展示镜像；已有每小时自动化负责同步授权训练历史。不要擅自改变同步方向、权限或自动化。

## 3. 当前运行结构

```text
GitHub Pages
└── index.html                       ← 当前网页入口
    ├── <style>                      ← 页面样式（内联）
    ├── <main>
    │   ├── header / 底部 tabs       ← 日期、云端状态、导航
    │   ├── #checkin-page            ← 训练日历首页
    │   ├── #log-page                ← 当天训练记录编辑页
    │   ├── #plan-page               ← A/B 训练计划页
    │   ├── #sync-dialog             ← 云端同步弹窗
    │   ├── #entry-sheet             ← 动作录入弹窗
    │   ├── #day-sheet               ← 某日训练详情弹窗
    │   └── #plan-sheet              ← 计划/动作选择弹窗
    └── <script>                     ← 主要业务逻辑（内联）
        ├── 状态初始化与数据迁移
        ├── 日历渲染
        ├── 滚轮控件
        ├── 动作录入与动画
        ├── 动作列表与手势
        ├── 计划和日期详情
        ├── 本地保存与草稿恢复
        ├── Cloudflare Worker 同步
        └── 页面导航与事件初始化
```

当前没有独立的打包/构建步骤；网页是静态文件形式发布。不要在未评估 GitHub Pages、移动端访问和本地预览方式前，贸然引入构建工具或改变模块加载方式。

## 4. 页面结构与 DOM 区域

### 4.1 首页 / 训练日历

主要容器：`#checkin-page`。

相关元素：

- `#cal-title`、`#month`、`#count`：日历标题、月份和训练统计。
- `#prev`、`#next`、`#this-month`、`#go-today`：日期导航。
- `#calendar`：日历网格。
- `#calendar-plan`：打开计划选择。
- `#draft-swipe`、`#resume-draft`、`#cancel-draft`：未完成草稿的继续/取消入口。
- `#calendar-draft-status`：草稿操作反馈。

### 4.2 训练记录页

主要容器：`#log-page`。

相关元素：

- `#training-editor`、`#entries`、`#empty-log`：当天动作列表。
- `#home-count`、`#home-save-state`：数量和保存状态。
- `#session-note`、`#note`：整次训练备注。
- `#save`、`#draft-status`、`#status`：保存、草稿和同步反馈。

### 4.3 训练计划页

主要容器：`#plan-page`。

- `#plan`：A/B 计划切换。
- `#plan-list`：计划动作列表。

### 4.4 弹窗 / Sheet

- `#sync-dialog`：云端连接、同步状态与重试。
- `#entry-sheet`：动作选择和录入。
- `#day-sheet`：查看指定日期的训练及编辑入口。
- `#plan-sheet`：选择 A/B 计划动作或自定义动作。

### 4.5 页面导航

当前导航由 `#open-checkins`、`#compose`、`#open-plans` 等按钮控制。记录入口与页面切换逻辑位于 `openPage` 及相邻事件绑定代码中。

## 5. 当前 JavaScript 功能地图

以下行号以本次盘点的 `index.html` 为准。行号可能随代码变更移动，定位时应同时使用函数名搜索。

| 功能区域 | 主要函数 / 变量 | 当前代码范围 | 职责 |
|---|---|---:|---|
| 基础配置与状态 | `plans`、`key`、`sessions`、`localEdits`、`draft`、`selected`、`today` | 318–394 | A/B 默认计划、日期状态、缓存恢复、内存状态 |
| 日历 | `hasTraining`、`renderCalendar`、`choose`、`moveMonth` | 392–431、860–882、1066–1086 | 日历格子、训练日期标记、月份和日期选择 |
| 滚轮输入 | `scheduleWheelDraft`、`createWheel`、`setWeight` | 432–505 | 重量、次数、组数、RPE 滚轮值和同步 |
| 动作录入与转场 | `setMovement`、`openComposer`、`foldComposer`、`animateArrival` | 487–584 | 动作选择、录入 Sheet、收起/入场动画 |
| 动作分组与手势 | `groupEntries`、`reorder`、`shiftGroup`、`shiftRow`、`bindWorkoutGesture` | 585–750 | 同动作聚合、动作排序、左滑编辑/删除、拖动手势 |
| 记录列表渲染 | `renderDraft`、局部 `reveal` 逻辑 | 751–846 | 渲染当天动作、行内操作、编辑状态 |
| 编辑器状态 | `resetForm`、`editorDirty`、`loadEditorDate`、`renderHeaderDate` | 847–888 | 表单初始化、脏状态判断、加载日期记录 |
| 计划展示与选择 | `applyPlan`、`previousExercise`、`planItems`、`renderQuickMoves`、`renderPlan`、`openPlan` | 889–1026 | A/B 计划展示、快捷动作、动作选择、自定义动作 |
| 日期详情 | `renderDaySummary`、`openDay`、`closeDay` | 1027–1065 | 查看指定日期训练详情和编辑入口 |
| 记录暂存与保存 | `stageExercise`、`saveLocalEdit`、保存按钮事件 | 1087–1158 | 将动作写入当天草稿、本地保存、触发上传 |
| 云端同步 | `cloudRequest`、`mergeCloudRecords`、`syncPendingEdits`、`connectCloud`、`setCloudStatus` | 1159–1265 | Worker API 请求、合并记录、逐日上传、连接状态 |
| 公开历史刷新 | `refreshPublicRecords` | 1266–1311 | 读取 `./training-history.json`、与本地编辑合并、自动刷新 |
| 日期刷新与导航 | `refreshToday`、`openPage` | 1312–1344 | 跨日刷新、日历/记录/计划页面切换 |
| 草稿快照与取消 | `editorSnapshot`、`revealDraftCancel`、草稿指针事件 | 1345–1417 | 保存草稿快照、显示取消入口、恢复/取消草稿 |
| 草稿持久化 | `renderDraftLink`、`persistEditorDraft`、`restoreEditorDraft` | 1418–1470 | 自动保存、退出保护、重新进入时恢复 |
| 启动绑定 | 页面按钮事件、`renderPlan`、`choose`、`refreshPublicRecords` | 1471–1482 | 绑定导航、初始化页面、启动公开数据刷新 |

### 5.1 当前共享状态

当前多个功能直接共享脚本作用域中的状态变量，包括：

- 日期/日历：`today`、`selected`、`month`、`calendarDate`。
- 训练数据：`sessions`、`localEdits`。
- 动作编辑：`movement`、`draft`、`hasChanges`、`editing`。
- 草稿：`editorDrafts`、`draftsReady`。
- 云端：`cloudPassword`、`cloudBusy`、`cloudSyncPromise`。
- 输入组件：重量、次数、组数、RPE 对应的 wheel 实例。

这些共享状态是目前模块耦合的主要来源。未来拆分时，应先定义状态归属和函数接口，不要仅仅把函数剪切到新文件，却继续制造难以追踪的全局依赖。

## 6. 数据流与服务边界

### 6.1 训练计划

A/B 默认动作计划目前定义在 `index.html` 的 `plans` 常量中，采用数组元组形式，包含动作名称、展示说明、默认重量、次数和组数。

当前计划动作框架：

- A：深蹲、卧推、杠铃划船、山羊挺身。
- B：硬拉、实力举、分腿蹲、高位下拉。

计划数据仍与页面脚本耦合，尚未抽离为独立数据文件或计划服务。用户与教练确认新的动作前，不要擅自加入二头、三头训练。

### 6.2 训练历史

公开历史主要结构：

```json
{
  "sessions": [
    {
      "date": "YYYY-MM-DD",
      "note": "",
      "exercises": [
        {
          "name": "深蹲",
          "weight": 50,
          "reps": 8,
          "sets": 3,
          "rpe": null,
          "note": ""
        }
      ]
    }
  ]
}
```

注意：

- 历史记录可能包含旧版本数据，某些字段可能缺失；兼容读取，不要假设所有历史记录都有相同字段。
- 同一动作可能有多条记录（例如顶组和回退组），保留数组顺序和各条数据。
- `weight: 0` 表示自重；`null` 表示未知/未填写。
- `rpe` 可能为 `null`，不要推断。
- 日期按 `Asia/Shanghai` 处理。
- 当前记录实际保存和同步的数据必须与未来 AI 建议数据分开。

### 6.3 本地存储

当前页面使用以下本地存储键（只记录键名，不读取或输出任何存储值）：

- `strength-log-v2`：旧版/迁移兼容数据。
- `strength-log-public-cache`：公开历史缓存。
- `strength-log-web-edits`：本地待同步编辑。
- `strength-log-github-pending`：旧版待同步队列迁移。
- `strength-log-editor-drafts-v1`：未完成编辑草稿。
- `strength-log-cloud-password`、`strength-log-cloud-password-session`：云端认证状态相关键。不得读取、记录或提交其值。

任何存储键迁移都必须兼容已有用户数据，不能简单清空 localStorage。

### 6.4 云端与公开数据

当前页面的云端服务边界：

- Cloudflare Worker 地址由 `workerApi` 常量配置。
- `GET /api/history`：读取云端历史。
- `PUT /api/session`：写入单日记录。
- 请求使用 Bearer 认证；不要在文档、代码示例、日志或 Git 中暴露凭据。
- `syncPendingEdits` 逐条写入待同步日期，随后重新读取历史进行确认。
- `refreshPublicRecords` 读取 `./training-history.json`，并合并本地待同步编辑。
- 当前公开刷新会在页面可见、获得焦点、联网和定期刷新时触发。

不要在未核实 Worker 实现的情况下更改 API 协议。

## 7. 模块耦合与技术债务

当前主要耦合点：

1. **单文件耦合**：HTML、CSS、JS 集中在 `index.html`。
2. **共享全局状态**：日历、编辑器、草稿和同步直接访问相同变量。
3. **DOM 与业务逻辑混合**：函数直接通过 ID 查询元素并更新页面。
4. **保存与同步相连**：保存动作会先写入本地待同步数据，再尝试 Worker 上传；不能把保存简单替换成远端请求。
5. **草稿与编辑器紧密耦合**：草稿快照包含动作列表、滚轮值、当前编辑动作和备注状态。
6. **手势与列表 DOM 耦合**：拖动、左滑和动作行渲染依赖具体 DOM 结构。
7. **计划数据硬编码**：A/B 默认计划仍位于主脚本。
8. **存在未接入的另一套 UI 代码**：`app.js`、`style.css` 不属于当前入口依赖，必须先明确其历史用途。

## 8. 建议的目标模块结构

这是未来逐步迁移的目标，不是要求一次性创建所有文件。

```text
training-log-pages/
├── index.html                    # 页面骨架、入口挂载
├── AGENTS.md                     # AI/开发规范
├── ARCHITECTURE.md               # 架构地图
├── assets/
│   ├── images/
│   └── icons/
├── styles/
│   ├── base.css                  # 全局变量、基础样式
│   ├── layout.css                # 页面布局与导航
│   ├── calendar.css              # 日历与签到
│   ├── workout.css               # 训练记录、滚轮、动作列表
│   ├── plans.css                 # 计划页
│   └── motion.css                # 动画、手势反馈
├── src/
│   ├── app.js                    # 应用启动与模块装配
│   ├── state/
│   │   └── store.js              # 明确的共享状态与更新接口
│   ├── domain/
│   │   ├── session.js            # 训练记录模型、校验
│   │   ├── plan.js               # A/B 计划模型与数据
│   │   └── date.js               # 时区和日期工具
│   ├── features/
│   │   ├── calendar/             # 日历、日期详情、签到
│   │   ├── workout/              # 录入、滚轮、动作列表、手势
│   │   ├── plans/                # 计划展示与选择
│   │   ├── drafts/               # 草稿快照、恢复、取消
│   │   ├── analytics/             # 重量曲线、训练量分析
│   │   ├── coach/                 # 未来 AI 每日训练计划
│   │   └── announcements/         # 未来公告条与详情页
│   └── services/
│       ├── storage.js             # localStorage 封装与迁移
│       ├── training-api.js        # Worker API 请求
│       └── sync.js                # 本地/云端合并和同步
├── data/
│   └── daily-coach.json           # 未来每日计划数据（需另行设计）
├── training-history.json          # 公开训练历史镜像
├── manifest.webmanifest
├── android-update.json
└── training-app-1.2.apk
```

说明：

- 目录名和文件名可以在实施时调整；职责边界比名称更重要。
- 不要把 `app.js`、`style.css` 直接移动到以上目录，它们目前不是当前页面的运行依赖。
- 不要在没有必要时拆成大量很小的文件；一个文件应有清晰、稳定的单一职责。
- 不要求使用框架或引入构建工具。先确认目标模块系统与本地预览、GitHub Pages 和 Android WebView 的兼容性。

## 9. 推荐拆分顺序

按风险从低到高分阶段推进，每个阶段单独提交、可回滚。

### 阶段 0：保持现状，建立基线

- 记录当前主分支版本和关键交互。
- 不修改业务代码。
- 确认 GitHub Pages 和 Android 当前入口。
- 梳理关键数据格式与同步行为。

### 阶段 1：分离静态资源

- 将当前 `index.html` 内联 CSS 提取到新的 `styles/` 文件。
- 不要覆盖仓库现有的 `style.css`，它属于未接入的另一套界面代码。
- 确保样式顺序、嵌入图片、响应式布局和动画表现不变。

### 阶段 2：提取低耦合基础逻辑

- 优先提取日期/格式化、重量显示等纯函数。
- 再考虑把 A/B 计划常量独立出来。
- 保持函数输入输出一致，不借机调整训练规则。

### 阶段 3：拆分 UI 功能

建议顺序：

1. 日历与日期详情。
2. 计划展示与动作选择。
3. 动作录入与滚轮组件。
4. 动作列表、左滑和排序手势。
5. 草稿保存、恢复和取消。

每个模块明确对外接口，避免模块间直接修改对方内部状态。

### 阶段 4：拆分数据服务

- 先封装 localStorage 读写和旧数据迁移。
- 再隔离 Worker API 请求。
- 最后拆分同步队列、冲突合并和状态反馈。
- 这是高风险区域，必须保留离线记录、逐日写入、重试和多设备数据保护行为。

### 阶段 5：新增 AI 教练与公告

- AI 每日计划与实际训练历史分开保存。
- 使用日期、`planId`、动作级 ID 关联计划与实际记录。
- 保留原始建议重量与实际完成重量。
- 公告详情页复用现有训练历史数据绘制曲线。
- 通过明确接口把计划预填入现有记录编辑器。
- 云端同步成功后再触发正式日历盖章。
- 用户尚未和教练确认手臂训练前，不加入二头、三头动作。

## 10. 每次模块迁移的验收清单

- 页面仍能正常加载，GitHub Pages 路径正确。
- 日历月份切换、日期选择和历史标记正常。
- 记录入口、滚轮选择、动作新增和编辑正常。
- 左滑编辑/删除、长按排序正常。
- 草稿自动保存、刷新恢复、取消草稿正常。
- 保存后本地数据保留；云端成功/失败状态准确。
- 多日期历史不会被覆盖，旧记录字段保持兼容。
- 时区边界按北京时间处理。
- 移动端布局、底部导航和安全区正常。
- `git diff` 只包含本阶段范围内的改动。
- 未执行的浏览器或设备测试必须明确标记为“未验证”。

## 11. 本次盘点的验证边界

本次完成的是 GitHub 源码静态盘点：

- 已读取仓库文件树、当前 `index.html`、`app.js`、`style.css`、manifest、更新元数据和公开历史数据结构。
- 已核对 `index.html` 没有引用 `app.js`、`style.css` 或 manifest。
- 没有运行浏览器、没有执行实际训练保存/云端同步、没有测试 Android APK。
- 因此本文描述的是源码结构和静态可见行为，不宣称完成运行时验收。

## 12. AI 开发者接手任务时

1. 先读 `AGENTS.md` 和本文。
2. 确认本次修改属于哪个现有功能区域。
3. 搜索目标函数/DOM/CSS，不要每次重新读取整个项目。
4. 默认局部 patch；简单 UI 修改不启动浏览器。
5. 涉及状态、手势、草稿、同步或数据迁移时，读取必要依赖并集中验证。
6. 未经用户明确同意，不进行整站重构、不删除旧实现、不更改数据协议。

**总原则：先明确边界，再逐步拆分；最小读取、最小修改、最少验证，保护现有训练数据与交互。**
