# AGENTS.md

面向在本仓库开发的开发者和编码代理；插件的使用说明见 [README.md](README.md)，配置字段与行为的完整说明见 [docs/PACKAGE.md](docs/PACKAGE.md)（英文）/ [docs/PACKAGE.zh.md](docs/PACKAGE.zh.md)（中文）。

## 仓库结构

- 本仓库**即一个 dsh bundle 包**（`@lliangworld/dsh-web-search-tinyfish`）：根 `package.json` 就是插件 manifest，无构建步骤，纯 ESM。
- `index.js`：插件入口——Config schema、密钥解析、provider 注册，以及 search/fetch 两个 provider 的完整实现（单文件）。
- `client.js`：浏览器端设置卡（插件管理页配置入口），手写 `window.__ModuleLoader__.load` factory，无构建步骤。
- `cordis.patch.yml`：loader patch，向 `web` seam insert 本插件（row id `web-search-tinyfish`），并把 `searchProvider`/`fetchProvider` 钉为 `tinyfish`。
- `docs/PACKAGE.md` / `docs/PACKAGE.zh.md`：面向用户的配置文档，改动插件行为后要同步更新；根 `README.md` 是使用说明（安装/升级/provider 固定）。
- `docs/DETAIL.md` / `docs/DETAIL.zh.md`：插件管理页 bundle 详情页的详情文档，**正文仅一行特性图引用**（功能与用法写在 `meta.description`，不写进详情页），经 `locale/*.json` 的 `meta.detail` 声明。图片是 `preview.png` / `preview.zh.png`（640×300，Host 单图上限 5 MiB），由 `docs/preview-source.html` 内嵌的场景 JSON 渲染生成——场景源是唯一真源，可在浏览器打开实时预览与编辑；`docs/render-preview.py` 用 DSH 运行时自带的 Python（含 Pillow）出图，两语言各一张、内容一致仅文案本地化。特性图如实呈现本插件的两个辨识点：搜索与抓取分居两个主机（各画一行主机名），以及两个端点都凭 `X-API-Key`、**没有免密钥路径**（勿写成姊妹插件的公开回退）。改图改 `preview-source.html` 的场景后重跑该脚本，**不要直接手改 PNG**。`package.json` 的 `files` 含整个 `docs` 目录，漏掉会让详情页报错而不是回退 README。

## 版本兼容性约定

dsh 启动时（`@deepseek-ai/dsh-app-boot` 的 `plugin-compatibility.ts`）会对 profile 里每个插件行做兼容性预检，规则是：

- manifest 有**顶层 `engines.dsh`** → 只拿这一个范围和当前运行时版本比（`includePrerelease: true`），peerDependencies 被完全忽略；
- 没有 → 逐个拿每个 `@deepseek-ai/dsh*` peer 范围去和**运行时版本**比；
- 任一项不满足 → 该行被置 `disabled`，并向 stderr 写 `dsh: disabling profile plugin row "…": Plugin … is incompatible with dsh …: requirements …`。这不是"警告后照常加载"，是整行不加载。

因此本仓库的约定是：

- **顶层 `engines.dsh` 是唯一的版本门禁字段**，取 `>=0.2.1-rc.2`：下限如实反映真实需求（配置热更新与 client 半的 `plugins.row.config` 槽、`configForms`、settings primitives 都在 0.2.1-rc.x 才有），低于它的旧运行会被干净跳过并提示；等于或高于它的版本直接可用。
- **不设上限**。官方包 `@keenable/dsh-keenable` 的 `dsh.engines.dsh`（`>=0.2.0-rc.2 <0.4.0-0`）只是插件市场元数据，boot 门禁并不读；它 npm/git 安装途径的实际放行姿态就是开放的（所有 dsh peer 用 `>=0.2.0-rc.2`）。同 profile 的第三方插件 `dsh-trust-check` 用的也是开放上限（`engines.dsh: '>=0.1.0-rc.8'`）。代价：将来破坏性版本（如 0.4.0）会放行加载而非干净跳过，此为明确接受的选择。
- **peer 只声明真实导入、且一律开放下限**：`@deepseek-ai/dsh-web`、`@deepseek-ai/dsh-launch-environment`、`@deepseek-ai/dsh-credentials` 三个包被 `index.js` 静态导入，peer 如实声明，供插件管理器的更新评估使用。有 `engines.dsh` 时它们不参与 boot 门禁，所以开放下限不会把插件门禁在旧运行时上。
- **不声明 `@deepseek-ai/cordis`**：本插件没有导入它，且运行时自带的 cordis 版本（当前 4.1.0）与任何写死的范围都不匹配，声明只会让 pnpm 在每次安装/更新时报 peer 问题。`@deepseek-ai/*` 包由 DSH 的包服务解析，不来自 profile 的 `node_modules`。
- `@deepseek-ai/schemastery` 维持**自有依赖**（`~3.18.5`）而非 peer：本插件以 git spec 安装，若把它降为 peer，在不含 schemastery 的组合（如 `sdk-minimal` 模板）里会触发缺 peer 警告。官方包用 peer 是市场发行场景；若将来上插件市场，再改为 peer 并对齐官方写法。
- 官方参照：`@deepseek-ai/dsh-web-search-deepseek`（同样的 volatile + `ctx.web` + credentials 组合）与 `@keenable/dsh-keenable`（开放 peer + 市场元数据）。

## 启动顺序：注入 credentials 平面

`index.js` 的 `inject` 是 `["web", "credentials"]`：凭据服务（`dsh-credentials-local`，其 `Service.init` 先 await 完存储文件加载才激活）就绪前，Cordis 让本插件 fiber 保持 PENDING，`apply()` 因此永远不会面对还没挂载的凭据平面。

**与 keenable 的关键差异**：TinyFish 没有免密钥端点，所以 `available()` 必须门禁"密钥是否已解析"，因而保留一个同步快照（`apiKeyState`）。快照在 `apply()` 时首次播种——`inject` 已保证凭据平面就绪——另带 50×100ms 有限重试兜住 resolve 意外 reject 的残余情况；之后持续监听 `credentials/reference-updated` 与 `loader/volatile-update` 刷新，保证 `available()` 与最新配置一致。

姊妹插件 keenable 不需要这套机制：它的 `available()` 是纯本地检查，密钥按操作解析，冷启动缺陷的成因随之消失。若 TinyFish 将来提供免密钥端点，可照 keenable 简化。

接受的代价：不含凭据服务的组合（如 `sdk-minimal` 模板、精简自定义组合）中本插件将保持未加载，而不是退化到启动环境变量——插件本就静态导入 `@deepseek-ai/dsh-credentials` 并以下限 peer 声明依赖，此类组合已在支持边界外；官方参照插件 `@deepseek-ai/dsh-web-search-deepseek` 刻意不注入（容忍无 seam），本次是刻意偏离。

## 配置热更新约定

全部 Config 字段标 `.volatile()`，provider 构造函数收 thunk、按操作经 `config.x.get()` 读取配置（对齐官方 `@deepseek-ai/dsh-web-search-deepseek`）：loader 对仅 volatile 字段的配置变更走热更新路径（提交进运行中的引用 + `loader/volatile-update` 事件），不重启插件 fiber，因此改配置无需重启 Harness。新增配置字段一律标 `.volatile()`；非 volatile 字段的变更仍会走普通重启路径。

每个字段都要写 `.description()`（含义/默认/取舍）：插件管理页与 `dsh --dump-config` 直接展示它，这是成本最低、可见收益最大的一项。有合理默认值的字段把 `.default()` 写进 schema，client 的 `FALLBACK_DEFAULTS` 只保留 schema 表达不了的那一项（当前为空——所有字段都有 schema 默认值）。

## provider 实现约定

- **映射只搬运真实字段**：`snippet` 取 `snippet` 的第一个非空白值，为空则丢弃该条（seam 没有别的字段可派生摘要，编造就是让 seam 撒谎）；`content` 一律省略，因为 TinyFish 不返回生成式答案。
- **`final_url` 优先**：抓取结果 URL 取 `final_url`，回退 `url`，再回退请求 URL——重定向后的地址才是该被引用与继续抓取的地址。
- **每 URL 失败单独呈现**：TinyFish 在 HTTP 200 的响应里用 `errors[]` 报告每 URL 的失败（超时、反爬、404），所以传输层成功不等于抓到页面；匹配请求 URL 的那条优先，`invalid_url`/`invalid_redirect_url` 映射为 `WEB_INVALID_URL`，其余为 `WEB_PROVIDER_ERROR`。
- **无内容是失败，不是空成功**：匹配条目没有 `text` 时抛错，否则模型会被告知读到了一个它并没看到的页面。
- **请求 URL 策略本地执行**：非 http(s) scheme、带内嵌凭据都在发出前以 `WEB_INVALID_URL` 拒绝——这是请求形状错误，不是 provider 失败。
- **中止分类**：`signal?.aborted === true` 或鸭子类型的 `AbortError`。工具超时可能附带自定义 reason（如 `dsh-timeout` 的 `TimeoutReason`），只认 `DOMException` 名会把它误分类为 `WEB_PROVIDER_ERROR`。
- **归因头**：`USER_AGENT` 与 `package.json` 版本保持一致。
- **错误词汇表**：`WEB_ABORTED`（取消）、`WEB_INVALID_URL`（请求形状，含 per-URL 的 invalid_url）、`WEB_PROVIDER_CREDENTIAL_MISSING`（密钥未解析，且信息里列出全部来源）、`WEB_PROVIDER_ERROR`（provider 自身失败）。调用方按 code 路由。
- **`maxChars` 由提供方执行**：TinyFish 自己不设字符上限，所以 `content` 被裁到 `maxChars`，只有真正裁过才置 `truncated`。

## 浏览器端（client 半）

`client.js` 在插件管理页对应 bundle 的行上提供配置入口：

- 行键为 `<包名>#<row id>`（本插件为 `@lliangworld/dsh-web-search-tinyfish#web-search-tinyfish`），经 `ctx.slots.register` 注册进 `plugins.row.config` 键控槽（带 `order: 50`，多卡片同槽时决定排序）；`ctx.configForms.whileServed([ns])` 门控——插件未加载（行禁用）时入口自动消失，ns 即 patch row id。
- 表单用 `@deepseek-ai/dsh-client-ui-primitives` 的 `SettingsForm`/`SettingsValueField`/`SettingsSecretField` 与 `SettingsFormModel`；`react/jsx-runtime`、primitives、`@deepseek-ai/dsh-client-store` 是浏览器基线模块，factory 内直接 require，无需声明。`package.json` 的 `dsh.client.inject` 声明 locale、ui-settings、ui-plugin-manager、api-remotes 四个包，`exports["./client"]` 指向 `client.js`，且 `client.js` 必须在 `files` 中随包分发。
- 密钥不进入配置文件：经 `ctx.remote.credentials` 对 `apiKeyEnv` 命名的引用（`TINYFISH_API_KEY`）describe/set（官方设置页同款）；卡片监听 `credentials/reference-updated` 防竞态刷新。
- **默认只展示 API 密钥一项**：TinyFish 没有免密钥路径，密钥是唯一必配项。全部 18 个配置字段都标 `advanced: true`，收在默认折叠的"高级设置"组内。卡片解析的数值上界与 host schema 的 `min`/`max` 保持一致。
- 折叠状态放 controller 的 store（`advancedOpen` + inject 面的 `toggleAdvanced`），**不要用 React hook**（factory 只保证 `react/jsx-runtime` 在基线表里）；`hooks: { tinyFishCard }` 注入后 prop 名是 `props.useTinyFishCard`（写错会在渲染期静默崩溃，控制台报 `props.useXxx is not a function`）。
- 默认值取自 scope 快照的 `base`（继承层，含 schema 默认值）；schema 无默认值的字段用卡片里的 `FALLBACK_DEFAULTS` 静态表（与 host 侧兜底常量保持一致），统一拼在字段提示文字末尾（`t("defaultValue", {value})`）。primitives 的 `SettingsValueField` **不转发** `placeholder`，勿指望输入框内灰色占位。
- client 半的改动同样走"改文件 → commit/push → `dsh plugin update`"流程；`dsh-client-modules` 按 Loader row 扫描 `dsh.client` 声明，行启用时才接入浏览器端。

## 修改与发布流程

1. 编辑本仓库根下的文件；
2. `git commit` 并 `git push` 到本仓库 main；
3. 更新本地安装的插件——**直接重跑 `add` 安装命令无效**：pnpm 发现 profile 的 lockfile 中该 spec 未变化时会跳过重新解析，会话内插件管理器随后报 `ambiguous-install`。用 `update` 让分支 spec 重新解析到 main 最新提交（manifest 中的 spec 保持不变，以后仍可用同样方式继续更新）：

```powershell
dsh plugin --profile web update @lliangworld/dsh-web-search-tinyfish
```

不带包名的 `dsh plugin --profile web update` 会重解析全部依赖。更新后的代码在**下次启动 Harness 时生效**。

示例以 web profile 为例；把 `--profile` 换成 `desktop` 即对桌面客户端的 profile 执行同样的操作。web 与 desktop 是两个独立 profile（各有各的 manifest 和 lockfile），插件要分别安装、分别更新。

## 版本管理

本仓库版本与姊妹仓库 [dsh-web-search-keenable](https://github.com/lliangworld/dsh-web-search-keenable) **完全独立**：`package.json` 的 `version` 只在本仓库演进，发版只打本仓库的 tag，互不影响。

发版即 bump `package.json` 版本 → commit/push → 打 `v*` tag 推送：

```powershell
git tag -a v1.0.11 -m "v1.0.11"
git push origin v1.0.11
```

想让一批改动在 main 上落成一条 commit 时，从 main 切一个 `<版本号>` 分支承载全部改动，推送后在 main 上 `git merge --squash <版本号>` 再提交。

## 固定版本 / 回退（commit 与 tag spec）

需要把 profile 固定到某个提交或版本时，用带 commit / tag 的 spec 安装（pnpm 的多个参数用 `&` 连接，不要写两个 `#`；`&` 是 shell 保留字符，**整个 spec 要用引号包起来**，PowerShell 裸写会直接报语法错误）：

```powershell
# 固定到某个提交
dsh plugin --profile web add "github:lliangworld/dsh-web-search-tinyfish#b29e678b28fd4081913a514c451a894f732705db"
```

这种形式会把 profile manifest 里的 spec 改成指定提交并强制 pnpm 解析过去；此后 spec 固定，`update` 不会跟随 main 前进；解除固定则重新 `add` 分支 spec。

tag 发版后可用两种形式（同样注意引号）：

```powershell
# 固定 tag：update 永远停在该 tag 指向的版本；升级需打新 tag 后重新 add
dsh plugin --profile web add "github:lliangworld/dsh-web-search-tinyfish#v1.0.10"

# semver 范围：以后打了新 tag（如 v1.0.11），update 会自动升到匹配范围的最新 tag，不跟随 main 上未发版的提交
dsh plugin --profile web add "github:lliangworld/dsh-web-search-tinyfish#semver:^1.0.10"
```

想"跟随发版"推荐 semver 形式：每次发版只需打 tag 推送，本地跑 `update` 即可升级。本仓库是单包仓库，`#semver:` 按本仓库的 `v*` tag 线生效，即按本插件独立发版，不再需要子目录前缀 tag。
