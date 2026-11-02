# 发布 fork 的 Docker 镜像

工作流：`.github/workflows/docker-publish-custom.yml`（Publish custom Docker image）。
使用仓库根目录的 Dockerfile，从源码构建前后端，并发布 AMD64、ARM64 两种架构。
两个架构都构建成功后才发布版本标签。
Python 构建和运行阶段使用 Debian slim，使 OpenCV 使用锁定版本的 manylinux
预编译包；不允许 OpenCV 回退到耗时的源码编译。镜像构建还会检查 OpenCV、
PyArrow 和 uWSGI 在最终运行环境中能否加载。

## 首次准备

- 将工作流提交、推送到需要发布的代码分支。
- 要使用 Actions 页面上的手动运行入口，工作流还需要存在于默认分支
  （当前为 `develop`）；在手动运行时选择实际要构建的分支。
- 工作流使用 GitHub 自动提供的 `GITHUB_TOKEN` 和 `packages: write` 权限，
  不需要配置 Docker Hub Token 或 LaunchDarkly 密钥。
- 首次发布的 GHCR 包默认是私有的。若要让 Ubuntu 无需登录即可拉取，在
  GitHub Packages 中将 `label-studio` 包设为 Public；保持私有则需要在
  Ubuntu 用有 `read:packages` 权限的 PAT（classic）登录 `ghcr.io`。
- 如果同名包已经存在，确保该包授予此仓库 Actions 写入权限。

## 通过 Git 标签发布

在准备发布的提交上创建标签并推送：

```bash
git tag custom-v1.0.0
git push origin custom-v1.0.0
```

标签指向的提交必须包含该工作流。普通分支 push 不触发此发布流程。
版本格式为 `custom-v主版本.次版本.修订版本`，例如 `custom-v1.0.1`，
不接受预发布后缀或带前导零的版本号。

## 手动发布

打开仓库 **Actions → Publish custom Docker image → Run workflow**：

1. 选择要构建的分支。
2. 在 `version` 输入新版本号，例如 `custom-v1.0.1`。
3. 点击运行，完成后查看工作流 Summary 中的镜像地址。

手动运行构建选定分支在触发时的提交，不会创建 Git 标签或 GitHub Release。
如果选择的是 Git 标签，输入版本必须与该标签相同。

## 镜像标签与升级

以 `CorlyDream/label-studio` 为例，一次发布生成：

```text
ghcr.io/corlydream/label-studio:custom-v1.0.0
ghcr.io/corlydream/label-studio:sha-<12位提交号>
ghcr.io/corlydream/label-studio:latest
```

工作流在构建前检查版本号，已存在的版本会被拒绝。下次发布请递增版本号。
`latest` 指向最近一次成功发布的版本，不按版本号大小排序；同一提交重新发布
不同版本时，`sha-…` 标签会更新。部署时推荐固定 `custom-v…` 或镜像 digest。
发布流程串行执行；GitHub concurrency 只保留一个等待中的运行，连续触发多个
发布时需等待前一次完成，避免等待中的发布被后续触发替换。

Ubuntu Compose 中设置：

```yaml
image: ghcr.io/corlydream/label-studio:custom-v1.0.0
```

镜像发布不等于服务器部署。切换前应停止旧服务并备份完整 Label Studio
数据目录（包括 SQLite、media 和 `.env`），首次启动会升级数据库。
保留现有数据和本地图片挂载，回退时同时恢复旧镜像和升级前的数据备份。

参考：[GitHub GHCR 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)。
