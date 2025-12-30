# i18n 提取与批量汉化指南

此文档指导如何在 `web` 前端项目中使用 `i18next-scanner` 自动提取需要翻译的字符串，并生成/更新 JSON 翻译文件；同时也提供了一个简单的手动提取建议流程。适合与当前已集成的 `i18next` + `react-i18next` 配合使用。

## 目录
- 安装依赖
- 推荐的 `i18next-scanner` 配置示例
- 在 `package.json` 中添加脚本（示例）
- 提取注意事项（JSX/变量/占位符/插值）
- 合并翻译并生成语言文件的常见流程
- 简单手动提取脚本（可选）
- 测试与本地验证

---

## 1) 安装依赖
在 `web` 目录下安装 `i18next-scanner`（作为 dev 依赖）：

```bash
cd web
# 使用 yarn
yarn add -D i18next-scanner
# 或使用 npm
# npm install --save-dev i18next-scanner
```

你也可以安装 `glob` / `fs-extra` 用于自定义脚本（可选）。

## 2) 推荐的 `i18next-scanner` 配置
在 `web` 根下创建一个 `i18next-scanner.config.js`：

```js
module.exports = {
  input: [
    'apps/**/src/**/*.{js,jsx,ts,tsx}',
    'libs/**/src/**/*.{js,jsx,ts,tsx}'
  ],
  output: './locales/$LOCALE/$NAMESPACE.json',
  options: {
    debug: false,
    removeUnusedKeys: false,
    sort: true,
    lngs: ['en', 'zh-CN'],
    ns: ['translation'],
    defaultLng: 'en',
    defaultNs: 'translation',
    resource: {
      loadPath: 'web/locales/{{lng}}/{{ns}}.json',
      savePath: 'web/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
    },
    keySeparator: false, // 视代码风格而定，通常保持 false
    nsSeparator: false,
  }
};
```

说明：
- `input` 可根据 monorepo 的结构调整（这里包含 apps 与 libs）。
- `lngs` 列出要支持的语言。
- `resource.loadPath` / `savePath` 指向我们项目里 `web/locales` 的位置（与我们之前创建的一致）。

## 3) 在 `package.json` 中添加脚本（示例）
在 `web/package.json` 的 `scripts` 中添加：

```json
"i18n:extract": "i18next-scanner --config i18next-scanner.config.js",
"i18n:extract:watch": "i18next-scanner --config i18next-scanner.config.js --watch",
"i18n:merge": "node scripts/i18n-merge.js"    // 可选：自定义合并脚本
```

运行一次提取：

```bash
cd web
yarn i18n:extract
```

提取后你会在 `web/locales/en/translation.json` 和 `web/locales/zh-CN/translation.json` 中看到新增的 key（Extract 有时只生成 key，值为空或等于 key，需翻译人员/开发者填充）。

## 4) 提取注意事项
- 字面量字符串：`t('key')`、`i18n.t('key')`、或 `useTranslation()` + `t()` 是最安全的做法。
- JSX 属性：`<Button>{t('create')}</Button>`，或 `<Button aria-label={t('createAria')}/> `。
- 带变量/占位符：推荐把可变值做为插值参数使用：`t('largeProject', { count: projectCount })`。
  - translation.json 中：`"largeProject": "检测到大型项目（{{count}} 个任务）"`
- 动态字符串（例如拼接的文本或模板）：i18next 无法静态提取，需要手动抽取并改写为 `t()`。
- 多上下文/复数：如果需要复数/上下文，参考 i18next 文档（`plural`, `context`）。

## 5) 合并翻译与多人协作的推荐流程
1. 运行 `yarn i18n:extract` 生成/更新 key。  
2. 翻译人员在 `web/locales/zh-CN/translation.json` 中为新增 key 填写中文翻译。  
3. 将翻译文件提交到仓库（或把 key 导出给翻译平台，如 Crowdin、POEditor 等）。
4. CI 可检查 `locales` 文件中是否有空值或缺失项（可写一个简单脚本进行检测）。

## 6) 简单手动提取脚本（可选）
如果你想先运行一个轻量脚本，把代码中直接出现的常见英文字符串扫描出来（仅作参考，误报/漏报都会有），可以使用如下 Node 脚本（`web/scripts/extract-strings.js`）。该脚本只是示例，建议优先使用 `i18next-scanner`：

```js
// scripts/extract-strings.js (示例)
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const pattern = 'apps/**/src/**/*.{js,jsx,ts,tsx}';
const files = glob.sync(pattern, { cwd: path.resolve(__dirname, '..') });
const re = /["'`]([A-Za-z0-9 .,!?\-()%:\/]{3,100})["'`]/g;
const results = {};

files.forEach((f) => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
  let m;
  while ((m = re.exec(content))) {
    const s = m[1];
    // 过滤掉 import/require 路径和短单词
    if (s.length > 2 && /[A-Za-z]/.test(s)) results[s] = '';
  }
});

fs.writeFileSync(path.resolve(__dirname, '..', 'locales', 'extracted-raw.json'), JSON.stringify(results, null, 2));
console.log('Wrote locales/extracted-raw.json - review before merging.');
```

该脚本会生成 `web/locales/extracted-raw.json`，你可以把这些键整理、去重后合并到 `translation.json`。

## 7) 测试与本地验证
- 启动前端（在 `web` 目录）：

```bash
cd web
# 安装依赖（如尚未安装）
# yarn
# 或仅安装 scanner: yarn add -D i18next-scanner

# 运行提取
yarn i18n:extract

# 启动开发模式（项目已有 dev 命令）
yarn dev
```

- 在页面上切换语言（我们已添加 `LanguageSwitcher`），检查 UI 文本是否被翻译。若某些文本仍显示英文，确认组件是否使用 `t('key')`，或是否为动态/拼接字符串需改写。

## 8) 常见问题与调试
- 没被提取的字符串：通常是因为字符串是变量/模版或被拼接；需要手动改写为 `t('key', { ... })`。
- 想保留某些英文而不提取：把文本改为常量或放在不被 scanner 遍历的地方，或者在 scanner 配置中设置忽略规则。
- 资源路径错误：确保 `i18next-scanner.config.js` 的 `resource.loadPath` / `savePath` 指向你的 `web/locales` 路径。

---

如果你希望，我可以：
- 帮你把 `i18next-scanner` 配置文件添加到仓库并在 `web/package.json` 中添加脚本（我可以直接提交这些改动）；
- 运行一次提取并把新增 keys 写入 `web/locales/*/translation.json`（需要安装 scanner）。

请选择下一步：
1) 把 `i18next-scanner` 的配置和 `package.json` 脚本直接加入仓库并运行一次提取（我会先把 `devDependency` 加入再运行）。
2) 仅把这份提取指南文件加入仓库（已完成）。
3) 其它（请说明）。
