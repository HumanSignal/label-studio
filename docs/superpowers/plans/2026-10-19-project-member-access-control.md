# 项目成员访问控制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让自部署社区版按组织边界、项目创建者和启用的项目成员限制项目访问，组织负责人与项目创建者管理项目，普通成员只能标注。

**Architecture:** `projects/access.py` 用同一组数据库条件回答“能看见”和“能管理”。列表、对象权限和文件入口都调用它，不在 Python 里逐个项目过滤。动作权限读取现有的 `permission_required` 字符串，缺映射则拒绝；看不见表的项目返回 404，能看见但动作不允许返回 403。这是一次权限收紧，任务 1–11 必须一起发布，中间提交不能单独部署。

**Tech Stack:** Django、Django REST framework、现有 pytest / `APITestCase`、SQLite 与 PostgreSQL、React（`@humansignal/ui`）、Cypress（`web/apps/labelstudio-e2e`）。

**Spec:** `docs/superpowers/specs/2026-10-19-project-member-access-control-design.md`

## Global Constraints

- 不新增角色列、用户组、Manager 角色、`User.role`、Casbin、django-guardian，也不增加把权限切回全员开放的运行时开关。
- 组织负责人是 `Organization.created_by_id == user.id`。项目创建者是 `Project.created_by_id == user.id`。普通成员是 `enabled=True` 的 `ProjectMember`。管理者不依赖成员行。
- `is_staff`、`is_superuser` 和恒为真的 `User.is_organization_admin()` 都不单独赋予应用 API 的项目权限。
- 组织边界不成立时，创建者、组织负责人和残留成员行都不产生访问权。已删除项目不能因成员行重新出现。项目授权不放宽现有任务状态与锁定规则。
- 未登录沿用现有认证响应，不返回项目数据。明确指向不可访问对象返回 404。项目可访问但动作不允许返回 403。他人草稿列表中不出现，直接请求返回 404。
- 参数无效、父对象混用或非法作者使用现有序列化 400。校验失败发生在持久化、外部连接、凭据传递、保存文件、队列入列、变更 Webhook 和更新计数之前。
- 缺失动作映射默认拒绝。不能按 HTTP 方法推断动作。
- 首次迁移：同一 `(project, user)` 保留最小主键，`created_at` 取最早，`updated_at` 取最晚，删除其余行；历史显式成员全部 `enabled=False`；然后建立 `(project_id, user_id)` 唯一约束。后续升级不得再次禁用已确认授权。
- 取消授权不删除用户、任务、已提交标注、作者或个人草稿。再次加入组织不恢复旧的显式项目成员行。
- 普通标注创建的 `completed_by` 必须是当前用户，否则拒绝。更新不改原作者。导入作者不自动成为项目成员。
- 草稿只对草稿所属用户开放，管理者没有例外。管理端删除项目可以按现有外键清理草稿，但清理接口不返回草稿内容。
- 成员接口对隐式管理者执行授权或取消时返回 400，提示 `This user already manages the project. Membership cannot grant or revoke that access.`
- 目标用户无效、不属于该组织或不存在时，返回 400，提示 `Select an active user in this organization.` 响应体不包含该用户的邮箱或其他身份信息。
- 项目 `access` 只读，至少含 `can_annotate` 和 `can_manage`。它只给界面使用，后端不读取它做授权。
- 无项目且当前用户不能创建项目时，空状态文案为 `暂无获授权的项目，请联系项目负责人`。权限拒绝后的页面文案为 `项目不可访问，可能已被删除或访问权限已取消`。
- 文件隔离沿用项目存储目录和云前缀，不新增逐文件 ACL，也不新增签名 URL 撤销服务。在途请求、浏览器缓存、已下载内容和未过期签名 URL 不承诺回收。
- 新的 Python 方法和类用英文 docstring 说明职责和权限边界。新文件沿用 `label_studio/projects/api.py` 顶部的 Apache 许可声明。
- 不重写标注编辑器、任务队列或组织模型。

## Review Focus

- 项目创建者或组织负责人即使有 `enabled=False` 的成员行，仍然可以管理项目；成员接口不能把这次取消做成成功。
- `active_organization` 与项目组织不一致时，创建者、组织负责人和 `enabled=True` 成员行都不产生访问权。
- 用户重新成为组织的有效成员后，旧 `ProjectMember.enabled` 仍为 False；若他仍是项目创建者，隐式管理权恢复。
- 一次请求里的项目或任务 ID 只要有一个不可访问，整单返回 404，且不删除、不发 Webhook、不入队。
- 标注员调用存储校验或同步时，外部客户端在权限失败前不会被构造或调用。

## 文件结构

- 新建 `label_studio/projects/access.py`：组织边界、可见查询、管理判断、标注写、草稿读。唯一的规则来源。
- 新建 `label_studio/projects/membership.py`：授权与取消的事务操作。
- 新建 `label_studio/projects/action_permissions.py`：权限字符串到动作的映射，以及 404/403 入口。
- 新建 `label_studio/projects/member_api.py`：项目成员 HTTP 接口。`projects/api.py` 不再扩大成员逻辑。
- 新建 `label_studio/projects/migrations/0039_projectmember_unique_and_historical_disable.py`：去重、禁用历史行、唯一约束。依赖当前最新迁移 `0038_projectimport_list_indexes_async`。
- 新建 `label_studio/projects/tests/access_setup.py`：验收用的固定人物数据。
- 测试分别放在 `label_studio/projects/tests/test_access.py`、`test_membership.py`、`test_access_migration.py`、`test_action_permissions.py`、`test_project_visibility.py`、`test_member_api.py`，以及各资源目录下的 `test_project_access.py`。
- 修改现有查询与 `has_permission`，不把规则复制进每个视图。前端只新增设置页和既有入口上的只读能力判断。

## 入口覆盖

| 入口 | 规则 |
| --- | --- |
| 项目列表、搜索、分页、counts | `visible_projects`；分页总数用过滤后的 queryset |
| 项目详情、summary、sample、model versions、next、history、annotators | 先按可见范围取项目。读是访问，改设置和删除预测是管理 |
| `ProjectMember` 四个接口 | 管理。隐式身份不可授予或取消 |
| 任务、标注、预测列表及任务详情 | 父项目必须可见。列表不靠逐对象钩子过滤 |
| 标注创建 | 访问，且 `completed_by` 只能是当前用户 |
| 标注更新、删除 | 本人或管理者；`completed_by` 不变 |
| 草稿的列表、详情、保存、转换、删除 | 仅草稿所有者；管理者也是 404 |
| Data Manager 列、状态、视图读取、请求内筛选排序 | 访问 |
| 视图的创建、修改、排序、锁定、重置 | 管理 |
| 批量动作，除 `next_task` | 管理。先检查全部 ID |
| `next_task` 及其任务锁 | 访问 |
| 导入、再导入、上传列表和删除、存储数据下载、导出快照、导出下载、`/api/auth/export/` | 管理 |
| 存储、ML 配置、训练、测试、同步、校验、Webhook | 管理，且在外部副作用之前。交互式预测 POST 是访问，响应不含密钥 |
| 未绑定项目的 Webhook 和模型供应商连接 | 当前有效组织的组织负责人 |
| 组织邀请、组织成员管理 | 组织负责人 |
| 当前用户资料、自己的 Token 和头像 | 本人。whoami 的 `permissions` 只含组织和账号能力 |
| 项目 HTML | 不把未授权项目数据写进模板 |
| 本地文件、上传文件、云解析和代理 | 访问项目之后再检查目录或前缀 |
| Django admin | 有效 `is_staff`，并且是某个组织的 `created_by` 兼有效成员 |
| `server._create_user` | 不再设置 `is_staff` 或 `is_superuser` |

公开且不读取项目数据的视图只有 `LabelConfigValidateAPI`、`WebhookInfoAPI`、`core.views.TriggerAPIError`。新的 API 视图不在这三张列表里，也没有 `permission_required` 时，覆盖测试失败。

---

### Task 1: 访问规则

**Files:**
- Create: `label_studio/projects/access.py`
- Create: `label_studio/projects/tests/access_setup.py`
- Test: `label_studio/projects/tests/test_access.py`

**Interfaces:**
- Consumes: `Project`、`ProjectMember`、`Organization`、`OrganizationMember`、`User.is_active`、`User.active_organization_id`。
- Produces:
  - `user_is_active_account(user) -> bool`
  - `manageable_project_filter(user) -> Q`
  - `visible_project_filter(user) -> Q`
  - `visible_projects(user) -> QuerySet`
  - `can_access_project(user, project) -> bool`
  - `can_manage_project(user, project) -> bool`
  - `can_create_project(user) -> bool`
  - `can_modify_annotation(user, annotation) -> bool`
  - `draft_visible_to(user, draft) -> bool`
  - `project_member_users(project) -> QuerySet`

- [ ] **Step 1: 写失败测试**

`access_setup.make_access_world()` 返回这些对象：组织负责人 `owner`，历史项目创建者 `creator`，只加入项目 1 的 `member_a`，只加入项目 2 的 `member_b`，同组织但没有启用成员行的 `unassigned`，另一组织的 `outsider`。`project_1.created_by` 是 `creator`，`project_2.created_by` 是 `owner`。`unassigned` 在项目 1 上另有一行 `enabled=False`。所有组织内用户都有未删除的 `OrganizationMember`，且 `active_organization` 指向该组织。用现有 `OrganizationFactory`、`UserFactory`、`ProjectFactory` 创建，不要手写一套平行工厂。

```python
def test_disabled_member_row_does_not_revoke_creator(self):
    world = make_access_world()
    ProjectMember.objects.create(project=world.project_1, user=world.creator, enabled=False)
    self.assertTrue(can_manage_project(world.creator, world.project_1))
    self.assertTrue(can_access_project(world.creator, world.project_1))

def test_active_organization_mismatch_denies_creator_and_member(self):
    world = make_access_world()
    other = OrganizationFactory()
    world.creator.active_organization = other
    world.creator.save(update_fields=['active_organization'])
    world.member_a.active_organization = other
    world.member_a.save(update_fields=['active_organization'])
    self.assertFalse(can_access_project(world.creator, world.project_1))
    self.assertFalse(can_manage_project(world.creator, world.project_1))
    self.assertFalse(can_access_project(world.member_a, world.project_1))
    self.assertEqual(list(visible_projects(world.member_a)), [])
```

同一文件再断言：

- `member_a` 只能看见 `project_1`；`owner` 能看见两个项目；`unassigned`、`outsider` 都看不见 `project_1`。
- `owner` 和 `creator` 对 `project_1` 的 `can_manage_project` 为真；`member_a` 为假，但 `can_access_project` 为真。
- `can_create_project(owner)` 为真；`creator`、`member_a` 为假。
- `user.is_active = False` 的组织负责人，`can_access_project` 和 `can_create_project` 都为假。恢复 `is_active=True` 后，组织负责人重新可以创建，`member_a` 仍然只能访问项目 1。
- `is_staff=True` 且 `is_superuser=True` 的 `unassigned` 仍然不能访问。
- `project_1.deleted_at` 非空时，从 `Project.all_objects` 取出的实例 `can_access_project` 为假，`visible_projects` 也不包含它。
- `created_by` 为空的项目只有 `owner` 能管理，启用成员不能因此变成管理者。
- 组织成员 `deleted_at` 非空时，创建者和启用成员行都失效。
- 本人标注 `can_modify_annotation` 为真；别人的标注只有管理者为真。
- 别人的草稿 `draft_visible_to` 对管理者和普通成员都为假；本人草稿在项目可访问时为真。
- `project_member_users(project_1)` 包含 `owner`、`creator`、`member_a`，不包含 `member_b` 和 `unassigned`。
- `list(visible_projects(member_a))` 在 `CaptureQueriesContext` 中只产生 1 条 SQL。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_access.py -v`

Expected: 导入 `projects.access` 失败。

- [ ] **Step 3: 实现 `visible_projects(user) -> QuerySet` 及同文件的其余签名**

账号无效、未认证或 `active_organization_id` 为空时，`visible_projects` 返回 `Project.objects.none()`，各个 `can_*` 返回 `False`。可见和管理条件只写在两个 `Q` 里：

```python
def manageable_project_filter(user) -> Q:
    return Q(organization_id=user.active_organization_id) & (
        Q(created_by_id=user.id) | Q(organization__created_by_id=user.id)
    )

def visible_project_filter(user) -> Q:
    return manageable_project_filter(user) | Q(
        organization_id=user.active_organization_id,
        members__user_id=user.id,
        members__enabled=True,
    )
```

`visible_projects` 在 `Project.objects` 上应用 `visible_project_filter`，并再限制存在 `deleted_at` 为空的 `OrganizationMember`，然后 `distinct()`。`can_access_project` 与 `can_manage_project` 分别用这两个过滤器和主键做 `exists()`，不要复制一套 Python 分支。`can_create_project` 为真当且仅当用户是其 `active_organization` 的 `created_by`，且该组织成员行未删除、账号有效。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_access.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/projects/access.py label_studio/projects/tests/access_setup.py label_studio/projects/tests/test_access.py
git commit -m "feat: add project access predicates"
```

### Task 2: 成员行生命周期与一次性迁移

**Files:**
- Create: `label_studio/projects/membership.py`
- Create: `label_studio/projects/migrations/0039_projectmember_unique_and_historical_disable.py`
- Modify: `label_studio/projects/models.py` 中 `ProjectMember.Meta`
- Test: `label_studio/projects/tests/test_membership.py`
- Test: `label_studio/projects/tests/test_access_migration.py`

**Interfaces:**
- Consumes: Task 1 的 `can_manage_project`。
- Produces:
  - `grant_project_member(*, project, actor, target) -> ProjectMember`
  - `revoke_project_member(*, project, actor, target) -> None`
  - 约束名 `unique_project_member_project_user`

- [ ] **Step 1: 写失败测试**

成员服务测试：

```python
def test_repeat_grant_keeps_one_row(self):
    world = make_access_world()
    first = grant_project_member(project=world.project_1, actor=world.creator, target=world.unassigned)
    second = grant_project_member(project=world.project_1, actor=world.creator, target=world.unassigned)
    self.assertEqual(first.id, second.id)
    self.assertEqual(ProjectMember.objects.filter(project=world.project_1, user=world.unassigned).count(), 1)
    self.assertTrue(second.enabled)

def test_implicit_manager_cannot_be_granted_or_revoked(self):
    world = make_access_world()
    with self.assertRaises(ValidationError) as raised:
        revoke_project_member(project=world.project_1, actor=world.owner, target=world.creator)
    self.assertEqual(
        raised.exception.detail,
        'This user already manages the project. Membership cannot grant or revoke that access.',
    )
    self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.creator).exists())
```

再断言：取消不存在的行不报错且不产生行；取消后标注仍在、`enabled` 为 False；再次授权把同一行改回 True；`outsider`、停用账号和已软删除组织成员都得到 `Select an active user in this organization.`，响应文本不包含目标邮箱；普通成员调用 `grant_project_member` 得到 `PermissionDenied`，数据库不变。

迁移测试使用 `TransactionTestCase`。先 `call_command('migrate', 'projects', '0038')`，用历史模型插入同一 `(project, user)` 的两行，小主键的 `created_at` 更晚、大主键的 `updated_at` 更晚，且两行 `enabled=True`。迁到 `0039` 后只剩最小主键，`created_at` 是两行中的最早值，`updated_at` 是最晚值，`enabled` 为 False。再把该行设为 True 并执行 `call_command('migrate', 'projects')`，`enabled` 仍为 True。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_membership.py label_studio/projects/tests/test_access_migration.py -v`

Expected: `grant_project_member` 未定义，迁移 `0039` 不存在。

- [ ] **Step 3: 实现迁移函数和 `grant_project_member`**

迁移的 `RunPython` 按主键顺序读取历史 `ProjectMember`。每个 `(project_id, user_id)` 保留第一行，把 `created_at` 写成同组最小值、`updated_at` 写成最大值、`enabled` 写成 False，删除同组其余行。这个函数只放在该迁移里，不放到 `AppConfig.ready`。随后添加：

```python
models.UniqueConstraint(fields=['project', 'user'], name='unique_project_member_project_user')
```

`grant_project_member` 在 `transaction.atomic()` 中 `update_or_create`，冲突时再读一次并启用。它不接受角色或项目字段。`revoke_project_member` 把已有行更新为 `enabled=False`，没有行时直接返回。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_membership.py label_studio/projects/tests/test_access_migration.py -v`

Expected: PASS。PostgreSQL 由现有 `run_pytest_postgresql` 作业覆盖同一测试，不新增工作流，迁移里不写 SQLite 专用 SQL。

- [ ] **Step 5: Commit**

```bash
git add label_studio/projects/membership.py label_studio/projects/models.py label_studio/projects/migrations/0039_projectmember_unique_and_historical_disable.py label_studio/projects/tests/test_membership.py label_studio/projects/tests/test_access_migration.py
git commit -m "feat: constrain project membership and disable historical grants"
```

### Task 3: 把项目可见范围接到查询和对象权限

**Files:**
- Modify: `label_studio/projects/mixins.py` 的 `has_permission` 与 `all_members`
- Modify: `label_studio/projects/models.py` 的 `ProjectManager.for_user`
- Modify: `label_studio/data_manager/managers.py` 的 `TaskManager.for_user`
- Modify: `label_studio/tasks/models.py` 的 `AnnotationManager.for_user`
- Modify: `label_studio/projects/api.py` 的列表、counts、详情、summary、next、history、sample、model versions、annotators
- Modify: `label_studio/projects/serializers.py` 的 `ProjectSerializer`
- Test: `label_studio/projects/tests/test_project_visibility.py`

**Interfaces:**
- Consumes: `visible_projects`、`can_access_project`、`can_manage_project`、`project_member_users`。
- Produces: 项目序列化里的只读 `access: {can_annotate: bool, can_manage: bool}`。`Project.has_permission(user)` 仍设置 `user.project = self`，然后返回 `can_access_project`。`Project.objects.for_user(user)` 返回 `visible_projects(user)`。

- [ ] **Step 1: 写失败测试**

```python
def test_list_search_pagination_and_counts_hide_other_project(self):
    world = make_access_world()
    self.client.force_authenticate(world.member_a)
    listed = self.client.get(reverse('projects:api:project-list'), {'search': world.project_2.title, 'page_size': 1})
    self.assertEqual(listed.status_code, 200)
    self.assertEqual(listed.json()['count'], 0)
    self.assertEqual(listed.json()['results'], [])
    counts = self.client.get(reverse('projects:api:project-counts-list'))
    self.assertEqual([row['id'] for row in counts.json()], [world.project_1.id])
```

再断言：`member_a` 读取项目 2 的详情、summary、next、history、sample、model versions、annotators 都是 404；项目 1 的列表项 `access` 为 `{'can_annotate': True, 'can_manage': False}`，`creator` 看到的同一项目两项都为 True。显式 `ids` 同时包含两个项目时整单 404，不能先分页再过滤。`annotators` 仍返回在该项目提交过标注的用户，包括后来被取消授权的作者。Token 认证和 `force_authenticate` 对项目 2 都是 404。`creator` 提交项目创建得到 403，且不新增项目；`owner` 创建的项目，其 `created_by` 和 `organization` 以服务端写入为准，忽略请求体里的值。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_project_visibility.py::ProjectVisibilityTests::test_list_search_pagination_and_counts_hide_other_project -v`

Expected: FAIL，列表仍返回另一个项目，或响应没有 `access`。

- [ ] **Step 3: 让列表和 `for_user` 使用 `visible_projects`**

项目列表、counts 和上述详情入口的 queryset 改为 `visible_projects(request.user)`。`ids` 中任何一个不在该 queryset 里时，在分页前抛出 `NotFound`。`ProjectSerializer` 增加只读 `access`，值来自 `can_access_project` 和 `can_manage_project`，写请求忽略这个字段。创建项目时丢弃客户端的 `created_by` 和 `organization`，并在保存前调用 `can_create_project`。任务和标注的 `for_user` 改为 `project__in=visible_projects(user)`。`all_members` 改为 `project_member_users(self)`。

然后运行 `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests label_studio/tasks/tests -q`。失败若是因为同组织的非成员仍被当作可见，就把测试用户换成项目创建者或启用成员。不要放宽 `visible_projects`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_project_visibility.py label_studio/projects/tests/test_access.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/projects/mixins.py label_studio/projects/models.py label_studio/projects/api.py label_studio/projects/serializers.py label_studio/data_manager/managers.py label_studio/tasks/models.py label_studio/projects/tests/test_project_visibility.py
git commit -m "feat: limit project queries to visible projects"
```

### Task 4: 动作映射

**Files:**
- Create: `label_studio/projects/action_permissions.py`
- Test: `label_studio/projects/tests/test_action_permissions.py`

**Interfaces:**
- Consumes: Task 1 的判断函数。
- Produces:
  - `Action`：`ACCESS`、`MANAGE`、`CREATE_PROJECT`、`ORG_OWNER`、`SELF`、`ANNOTATION_WRITE`
  - `PERMISSION_ACTIONS: dict[str, Action]`
  - `PUBLIC_VIEWS: frozenset[str]`
  - `resolve_permission_name(view, request) -> str | None`
  - `ensure_project_visible(user, project) -> None`
  - `ensure_project_manage(user, project) -> None`
  - `ensure_can_create_project(user) -> None`
  - `ensure_org_owner(user, organization) -> None`
  - `ProjectActionPermission`

映射固定为：

| 权限字符串 | 动作 |
| --- | --- |
| `projects.view`、`tasks.view`、`annotations.view`、`annotations.create`、`views.view` | `ACCESS` |
| `projects.change`、`projects.delete`、`projects.reset_cache`、`tasks.create`、`tasks.change`、`tasks.delete`、`views.create`、`views.change`、`views.delete`、`views.reset`、`actions.perform`、`predictions.any`、`storages.view`、`storages.change`、`storages.sync`、`labels.create`、`labels.view`、`labels.change`、`labels.delete`、`models.create`、`models.view`、`models.change`、`models.delete`、`webhooks.view`、`webhooks.change` | `MANAGE` |
| `projects.create` | `CREATE_PROJECT` |
| `organizations.change`、`organizations.delete`、`organizations.invite`、`organizations.create`、`model_provider_connection.create`、`model_provider_connection.view`、`model_provider_connection.change`、`model_provider_connection.delete` | `ORG_OWNER` |
| `organizations.view`、`users.token.any`、`avatar.any` | `SELF` |
| `annotations.change`、`annotations.delete` | `ANNOTATION_WRITE` |

`webhooks.view` 和 `webhooks.change` 在 Webhook 的 `project_id` 为空时改走 `ensure_org_owner`，不走项目管理。`ProjectActionsAPI` 在 `action_id=next_task` 时走访问，其余已注册动作走管理；没有 `action_id` 时拒绝。这些例外写在 `action_permissions.py`，不要散落到视图里。

- [ ] **Step 1: 写失败测试**

```python
def test_unmapped_permission_is_denied(self):
    self.assertIsNone(PERMISSION_ACTIONS.get('not.a.real.permission'))
    request = self.factory.get('/')
    request.user = make_access_world().owner
    view = type('Unmapped', (), {'permission_required': 'not.a.real.permission', 'request': request})()
    self.assertFalse(ProjectActionPermission().has_permission(request, view))

def test_visible_member_without_manage_gets_403_not_404(self):
    world = make_access_world()
    with self.assertRaises(PermissionDenied):
        ensure_project_manage(world.member_a, world.project_1)

def test_inaccessible_project_gets_404(self):
    world = make_access_world()
    with self.assertRaises(NotFound):
        ensure_project_manage(world.member_a, world.project_2)
```

再断言 `resolve_permission_name` 能读出 `ViewClassPermission` 的当前方法、字符串形式的 `permission_required`，以及 DRF `@action` 上的声明。三者都没有时返回 `None`。`ensure_org_owner` 对另一个组织返回 404，对同组织普通成员返回 403。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_action_permissions.py -v`

Expected: 导入 `projects.action_permissions` 失败。

- [ ] **Step 3: 按上表实现 `PERMISSION_ACTIONS` 和 `ensure_project_manage`**

`ensure_project_visible` 在 `can_access_project` 为假时抛 `NotFound`。`ensure_project_manage` 先做同样的 404 判断，再在不能管理时抛 `PermissionDenied`。`ProjectActionPermission` 只解释映射，不调用 `user.has_perm()`。此任务先不要把它放进 `DEFAULT_PERMISSION_CLASSES`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_action_permissions.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/projects/action_permissions.py label_studio/projects/tests/test_action_permissions.py
git commit -m "feat: map declared permissions to project actions"
```

### Task 5: 项目成员接口

**Files:**
- Create: `label_studio/projects/member_api.py`
- Modify: `label_studio/projects/urls.py` 的 `_api_urlpatterns`
- Test: `label_studio/projects/tests/test_member_api.py`

**Interfaces:**
- Consumes: `grant_project_member`、`revoke_project_member`、`ensure_project_manage`、`project_member_users`。
- Produces: 路由名 `projects:api:project-member-list`、`projects:api:project-member-available`、`projects:api:project-member`。
  - `GET /api/projects/<pk>/members/`
  - `GET /api/projects/<pk>/members/available/?search=`
  - `PUT /api/projects/<pk>/members/<user_id>/`
  - `DELETE /api/projects/<pk>/members/<user_id>/`
  - 成员对象字段：`id`、`display_name`、`email`、`enabled`、`created_at`、`updated_at`、`access_source`

`access_source` 只取 `organization_owner`、`project_creator`、`member`。同一个人既是组织负责人又是创建者时只返回一行，`access_source` 为 `organization_owner`。隐式身份没有成员行时，`created_at` 和 `updated_at` 为 `null`，`enabled` 为 `true`。列表包含 `enabled=False` 的显式成员。分页使用页码和 `page_size`，默认 20，与组织成员列表相同。

- [ ] **Step 1: 写失败测试**

```python
def test_member_grant_is_idempotent_and_hides_other_organizations(self):
    world = make_access_world()
    self.client.force_authenticate(world.creator)
    url = reverse(
        'projects:api:project-member',
        kwargs={'pk': world.project_1.id, 'user_id': world.unassigned.id},
    )
    first = self.client.put(url)
    second = self.client.put(url)
    self.assertEqual(first.status_code, 200)
    self.assertEqual(second.status_code, 200)
    self.assertEqual(first.json()['id'], second.json()['id'])
    self.assertEqual(first.json()['access_source'], 'member')
    self.assertTrue(first.json()['enabled'])
    outsider = self.client.put(
        reverse('projects:api:project-member', kwargs={'pk': world.project_1.id, 'user_id': world.outsider.id})
    )
    self.assertEqual(outsider.status_code, 400)
    self.assertNotIn(world.outsider.email, outsider.content.decode())
```

再断言：普通成员调用这四个接口得到 403，且不新增成员行；不可见项目得到 404；对 `creator` 的 PUT 和 DELETE 得到 400 及 Global Constraints 中的原句；DELETE 启用成员返回 204，标注还在；再次 DELETE 仍是 204。`available` 只返回同组织有效用户的 `id`、`display_name`、`email`，搜索按邮箱和姓名过滤，不返回已经启用的成员和隐式管理者，但返回可以被重新启用的禁用成员。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_member_api.py::MemberApiTests::test_member_grant_is_idempotent_and_hides_other_organizations -v`

Expected: 路由未找到，状态码 404。

- [ ] **Step 3: 实现四个视图，权限声明为 `projects.change`**

视图在读取序列化器之前调用 `ensure_project_manage`。PUT 和 DELETE 只把 URL 中的用户交给 Task 2 的函数，请求体中的角色、项目和组织字段忽略。`available` 复用组织成员查询，不创建账号、不发邀请。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_member_api.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/projects/member_api.py label_studio/projects/urls.py label_studio/projects/tests/test_member_api.py
git commit -m "feat: add project member management API"
```

### Task 6: 标注作者、草稿和父对象

**Files:**
- Modify: `label_studio/tasks/api.py` 的 `AnnotationsListAPI.perform_create` 与 `AnnotationAPI.perform_update`
- Modify: `label_studio/tasks/models.py` 的 `AnnotationDraft.has_permission`
- Modify: `label_studio/tasks/serializers.py` 中嵌套草稿和草稿计数字段
- Modify: `label_studio/projects/serializers.py` 的 summary 草稿字段
- Test: `label_studio/tasks/tests/test_project_access.py`

**Interfaces:**
- Consumes: `can_modify_annotation`、`draft_visible_to`、`ensure_project_visible`、`ensure_project_manage`。
- Produces: 不新增公共函数。创建请求若带了别人的 `completed_by`，在 `serializer.save()` 之前返回 400，并且不插入标注。

- [ ] **Step 1: 写失败测试**

```python
def test_member_cannot_submit_as_someone_else(self):
    world = make_access_world()
    task = TaskFactory(project=world.project_1)
    self.client.force_authenticate(world.member_a)
    response = self.client.post(
        reverse('tasks:api:task-annotations', kwargs={'pk': task.id}),
        {'result': [], 'completed_by': world.member_b.id},
        format='json',
    )
    self.assertEqual(response.status_code, 400)
    self.assertFalse(Annotation.objects.filter(task=task).exists())
```

再断言：不带 `completed_by` 的创建、跳过和本人更新成功，作者始终是 `member_a`。`member_a` 修改或删除 `member_b` 的标注返回 403，结果和作者都不变。`creator` 可以修改该标注，但 `completed_by` 仍是 `member_b`。`member_a` 和 `creator` 的任务详情、草稿列表和 summary 响应都不包含 `member_b` 草稿里的文本 `secret-draft-text`；直接读取、保存或删除该草稿都是 404。用别人的草稿调用转换也是 404。`member_a` 把自己的草稿转换成 `member_b` 的标注返回 403，不产生新标注。请求体里的 `task` 或 `project` 与 URL 父对象不一致时返回 400，数据库不变。项目 2 的任务 ID 返回 404。

导入测试调用 `POST /api/projects/<pk>/import`。管理者导入一条由同组织非成员完成的历史标注后，标注作者保持该用户，且不创建 `ProjectMember`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/tasks/tests/test_project_access.py::AnnotationAccessTests::test_member_cannot_submit_as_someone_else -v`

Expected: FAIL，当前请求会接受不同的 `completed_by` 或返回非 400。

- [ ] **Step 3: 在 `perform_create` 保存前拒绝冒用的 `completed_by`**

普通创建只允许缺省或等于 `request.user`。更新从 `validated_data` 去掉 `completed_by`，不再通过 `check_annotation_author` 改作者。草稿 queryset 增加 `user=request.user`；`AnnotationDraft.has_permission` 改为 `draft_visible_to`。嵌套草稿和 summary 里的草稿标签只按当前用户过滤，不新增聚合表。父对象不一致时沿用现有 `ValidationError`。导入路径继续使用 `resolve_completed_by_id`，不要在那里调用 `grant_project_member`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/tasks/tests/test_project_access.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/tasks/api.py label_studio/tasks/models.py label_studio/tasks/serializers.py label_studio/projects/serializers.py label_studio/tasks/tests/test_project_access.py
git commit -m "feat: enforce annotation authorship and private drafts"
```

### Task 7: Data Manager 与批量动作

**Files:**
- Modify: `label_studio/data_manager/api.py`
- Modify: `label_studio/data_manager/actions/__init__.py` 的 `check_action_permission`
- Modify: `label_studio/data_manager/managers.py` 的 prepared queryset 项目范围
- Test: `label_studio/data_manager/tests/test_project_access.py`

**Interfaces:**
- Consumes: `ensure_project_visible`、`ensure_project_manage`、`visible_projects`，以及 Task 4 对 `next_task` 的例外。
- Produces: `ProjectStateAPI` 的 `can_delete_tasks`、`can_manage_annotations`、`can_manage_tasks` 等于 `can_manage_project(request.user, project)`。这三个字段仍只用于界面。

- [ ] **Step 1: 写失败测试**

```python
def test_mixed_task_ids_are_rejected_before_side_effects(self):
    world = make_access_world()
    own = TaskFactory(project=world.project_1)
    foreign = TaskFactory(project=world.project_2)
    self.client.force_authenticate(world.creator)
    url = reverse('data_manager:dm-actions')
    with (
        patch('data_manager.actions.basic.emit_webhooks_for_instance') as emit,
        patch('data_manager.actions.basic.start_job_async_or_sync') as enqueue,
    ):
        response = self.client.post(
            f'{url}?id=delete_tasks&project={world.project_1.id}',
            {'selectedItems': {'all': False, 'included': [own.id, foreign.id]}},
            format='json',
        )
    self.assertEqual(response.status_code, 404)
    self.assertTrue(Task.objects.filter(id=own.id).exists())
    self.assertTrue(Task.objects.filter(id=foreign.id).exists())
    emit.assert_not_called()
    enqueue.assert_not_called()
```

再断言：`member_a` 可以读取列、状态、共享视图，并用请求内筛选只看到项目 1 的任务；保存视图、改顺序、锁定、重置返回 403，视图行不变。`member_a` 调用 `next_task` 返回 200。`member_a` 调用删除任务返回 403，任务还在。`ProjectStateAPI` 对 `member_a` 的三个 `can_*` 都为 False，对 `creator` 都为 True。视图的 `project` 与 URL 项目不一致时返回 400，不保存。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/data_manager/tests/test_project_access.py::DataManagerAccessTests::test_mixed_task_ids_are_rejected_before_side_effects -v`

Expected: FAIL，当前实现会删除属于所选项目的那一部分，或仍然调用 Webhook。

- [ ] **Step 3: 在动作函数运行前检查全部任务 ID**

`check_action_permission` 改为调用 Task 4 的规则，不再调用 `user.has_perm()`。选中 ID 先与该项目的任务主键比较，有缺失就抛 `NotFound`。prepared queryset 的项目条件使用 `visible_projects`。视图写操作使用 `views.*` 的管理映射。GET 筛选保持 `tasks.view`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/data_manager/tests/test_project_access.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/data_manager/api.py label_studio/data_manager/actions/__init__.py label_studio/data_manager/managers.py label_studio/data_manager/tests/test_project_access.py
git commit -m "feat: restrict data manager writes to project managers"
```

### Task 8: 导入、导出和 Nginx 鉴权

**Files:**
- Modify: `label_studio/data_import/api.py`，包括 `UploadedFileResponse` 和 `DownloadStorageData`
- Modify: `label_studio/data_export/api.py`，包括 `ProjectExportFilesAuthCheck`
- Modify: `label_studio/projects/api.py` 里的导入、再导入列表和详情
- Test: `label_studio/data_import/tests/test_project_access.py`
- Test: `label_studio/data_export/tests/test_project_access.py`

**Interfaces:**
- Consumes: `ensure_project_manage`、`ensure_project_visible`。
- Produces: 不新增公共函数。导出下载在作业已经开始后仍然重新检查管理权。

- [ ] **Step 1: 写失败测试**

`member_a` 调用项目 1 的导入、再导入、上传列表、上传删除、`DownloadStorageData`、导出创建、导出下载和 `/api/auth/export/`，状态码都是 403，不新增 `ProjectImport` 或 `Export`。`member_a` 读取项目 1 的导入任务列表也是 403。`member_a` 访问项目 2 的这些 URL 返回 404。`creator` 可以创建导出。把 `member_a` 先设成管理者并创建导出，再取消其管理身份后下载，返回 403，文件不被打开。测试用 `patch` 确认普通成员的导入请求没有调用入队函数。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/data_import/tests/test_project_access.py label_studio/data_export/tests/test_project_access.py -v`

Expected: FAIL，普通成员目前得到 200。

- [ ] **Step 3: 在导入和导出视图的副作用之前调用 `ensure_project_manage`**

`ProjectExportFilesAuthCheck` 先解析文件名中的项目。不可访问返回 404，可访问但不能管理返回 403。`UploadedFileResponse` 对不可访问文件返回 404，不再返回 403。显式重写了 `permission_classes` 的导入视图也要调用同一个函数。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/data_import/tests/test_project_access.py label_studio/data_export/tests/test_project_access.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/data_import/api.py label_studio/data_export/api.py label_studio/projects/api.py label_studio/data_import/tests/test_project_access.py label_studio/data_export/tests/test_project_access.py
git commit -m "feat: require management permission for import and export"
```

### Task 9: 存储、机器学习、Webhook 和文件边界

**Files:**
- Modify: `label_studio/io_storages/api.py`
- Modify: `label_studio/io_storages/localfiles/functions.py`
- Modify: `label_studio/io_storages/localfiles/views.py`
- Modify: `label_studio/io_storages/proxy_api.py`
- Modify: `label_studio/io_storages/react_code_proxy.py`
- Modify: `label_studio/ml/api.py`
- Modify: `label_studio/webhooks/api.py`
- Modify: `label_studio/webhooks/models.py` 的 `Webhook.has_permission`
- Test: `label_studio/io_storages/tests/test_project_access.py`
- Test: `label_studio/ml/tests/test_project_access.py`
- Test: `label_studio/webhooks/tests/test_project_access.py`

**Interfaces:**
- Consumes: `ensure_project_manage`、`ensure_project_visible`、`ensure_org_owner`、`normalize_storage_path`。
- Produces:
  - `storage_directories_overlap(path_a: str, path_b: str) -> bool`
  - `key_within_prefix(key: str, prefix: str) -> bool`

- [ ] **Step 1: 写失败测试**

```python
def test_annotator_storage_sync_does_not_construct_client(self):
    world = make_access_world()
    storage = S3ImportStorageFactory(project=world.project_1)
    self.client.force_authenticate(world.member_a)
    url = reverse('storages:api:storage-s3-sync', kwargs={'pk': storage.id})
    with patch('io_storages.s3.models.S3ImportStorage.get_client') as get_client:
        response = self.client.post(url)
    self.assertEqual(response.status_code, 403)
    get_client.assert_not_called()
```

再断言：普通成员读取存储、ML 后端和项目 Webhook 配置得到 403，响应不含 `aws_access_key_id`、`password` 或 Webhook URL；更新请求里更换 `project` 得到 400，原项目字段不变。交互式预测 POST 对项目成员返回 200，响应体不含存储密码。组织级 Webhook 和模型供应商连接只有 `owner` 可以读写，`creator` 得到 403。本地路径 `/data/project-a` 与 `/data/project-a/images` 重叠，保存第二个存储返回 400。云端 key `project-b/file.png` 不能通过项目 A 的前缀 `project-a/` 解析，代理在签名前返回 404。`../` 和绝对 key 返回 400。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/io_storages/tests/test_project_access.py::StorageAccessTests::test_annotator_storage_sync_does_not_construct_client -v`

Expected: FAIL，客户端被调用，或状态码不是 403。

- [ ] **Step 3: 在 `serializer.is_valid()` 之前调用 `ensure_project_manage`**

存储校验、同步、ML 训练和测试、Webhook 保存都按这个顺序。`storage_directories_overlap` 用 `normalize_storage_path` 后判断相等或一方是另一方的父目录。`key_within_prefix` 拒绝空前缀、`..` 和越出前缀的 key。本地文件视图继续使用现有目录边界，再调用 `can_access_project`。不要新增逐文件 ACL 表或签名撤销服务。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/io_storages/tests/test_project_access.py label_studio/ml/tests/test_project_access.py label_studio/webhooks/tests/test_project_access.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/io_storages label_studio/ml/api.py label_studio/ml/tests/test_project_access.py label_studio/webhooks/api.py label_studio/webhooks/models.py label_studio/webhooks/tests/test_project_access.py
git commit -m "feat: check project permission before storage and webhook side effects"
```

### Task 10: 组织、账号、后台和撤销后的成员关系

**Files:**
- Modify: `label_studio/organizations/models.py` 的 `OrganizationMember.soft_delete`
- Modify: `label_studio/organizations/api.py`
- Modify: `label_studio/organizations/serializers.py` 的项目贡献字段
- Modify: `label_studio/users/serializers.py` 的 `BaseWhoAmIUserSerializer.get_permissions`
- Modify: `label_studio/users/api.py`
- Modify: `label_studio/users/admin.py`
- Modify: `label_studio/server.py` 的 `_create_user`
- Modify: `label_studio/projects/views.py` 和 `label_studio/data_manager/views.py`。这两个页面目前只渲染壳模板；测试固定它们不能开始嵌入项目数据。
- Test: `label_studio/organizations/tests/test_project_access.py`
- Test: `label_studio/users/tests/test_project_access.py`

**Interfaces:**
- Consumes: `visible_projects`、`ensure_org_owner`、`can_create_project`。
- Produces:
  - `user_may_use_django_admin(user) -> bool`
  - whoami `permissions`：普通用户只有 `users.token.any` 和 `avatar.any`；有效组织负责人另外包含 `projects.create`、`organizations.change`、`organizations.invite`、`organizations.delete`、`organizations.create`。不要返回 `projects.change`、`storages.change` 或 `webhooks.change`。

- [ ] **Step 1: 写失败测试**

```python
def test_rejoining_organization_does_not_restore_project_member(self):
    world = make_access_world()
    task = TaskFactory(project=world.project_1)
    TaskLock.objects.create(task=task, user=world.member_a, expire_at=timezone.now() + timedelta(minutes=5))
    membership = OrganizationMember.objects.get(user=world.member_a, organization=world.project_1.organization)
    membership.soft_delete()
    row = ProjectMember.objects.get(project=world.project_1, user=world.member_a)
    self.assertFalse(row.enabled)
    self.assertFalse(TaskLock.objects.filter(task=task, user=world.member_a).exists())
    membership.deleted_at = None
    membership.save(update_fields=['deleted_at'])
    world.member_a.active_organization = world.project_1.organization
    world.member_a.save(update_fields=['active_organization'])
    row.refresh_from_db()
    self.assertFalse(row.enabled)
    self.assertFalse(can_access_project(world.member_a, world.project_1))
```

再准备 `creator` 被移出后重新加入：`can_manage_project` 恢复为真，但其 `ProjectMember.enabled` 若原本为 False 则保持 False。普通用户修改另一个用户返回 403。用户修改自己的姓名返回 200；请求体里的 `is_staff`、`is_superuser` 和 `active_organization` 不改变数据库里的值。组织成员列表和邀请重置只有 `owner` 成功。`OrganizationMemberListAPI` 的 GET 权限声明改为 `organizations.change`。贡献项目字段与 `visible_projects(request.user)` 求交。whoami 断言如上。`is_staff=True`、`is_superuser=True` 的普通成员请求项目 2 仍是 404，访问 `/admin/` 不是 200。`is_staff=True` 的组织负责人可以打开 `/admin/`。`_create_user` 创建出的用户两个标志都为 False。项目设置 HTML 响应不包含未授权项目的标题。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/organizations/tests/test_project_access.py::OrganizationAccessTests::test_rejoining_organization_does_not_restore_project_member -v`

Expected: FAIL，重新加入后 `enabled` 仍为 True，或软删除没有禁用成员行。

- [ ] **Step 3: 在 `soft_delete` 的同一事务里禁用该组织下的项目成员行**

不要在 `add_user` 或清空 `deleted_at` 的路径里把 `enabled` 改回 True。`admin.site.has_permission` 改为 `user_may_use_django_admin`：账号有效、`is_staff` 为真、并且是某个组织的 `created_by` 兼未删除成员。不要因为 `is_superuser` 单独放行。`_create_user` 删除两处标志赋值。组织管理接口调用 `ensure_org_owner`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/organizations/tests/test_project_access.py label_studio/users/tests/test_project_access.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/organizations/models.py label_studio/organizations/api.py label_studio/organizations/serializers.py label_studio/users/serializers.py label_studio/users/api.py label_studio/users/admin.py label_studio/server.py label_studio/projects/views.py label_studio/organizations/tests/test_project_access.py label_studio/users/tests/test_project_access.py
git commit -m "feat: keep project grants tied to organization membership"
```

### Task 11: 默认权限类和覆盖检查

**Files:**
- Modify: `label_studio/core/settings/base.py` 的 `DEFAULT_PERMISSION_CLASSES`
- Modify: 覆盖测试点名的、尚未接入的 API 视图
- Test: `label_studio/projects/tests/test_permission_coverage.py`

**Interfaces:**
- Consumes: `ProjectActionPermission`、`PERMISSION_ACTIONS`、`PUBLIC_VIEWS`。
- Produces: 默认权限类列表包含 `projects.action_permissions.ProjectActionPermission`。显式设置 `permission_classes` 的项目资源视图也包含它，或者在读取对象后、副作用前调用对应的 `ensure_*`。

- [ ] **Step 1: 写失败测试**

测试遍历 URL resolver 中的全部 `APIView` 子类。每个类必须满足一项：在 `PUBLIC_VIEWS` 中；能解析出已映射的 `permission_required`；或出现在本测试的 `EXPLICIT_ENSURE_VIEWS` 中。`EXPLICIT_ENSURE_VIEWS` 只收录文件和代理视图，并且这些视图的源码调用了 `ensure_project_visible` 或 `ensure_project_manage`。另外断言 `PredictionAPI` 的 GET 使用 `tasks.view`，其余方法使用 `predictions.any`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_permission_coverage.py -v`

Expected: FAIL，列出至少一个没有映射的视图类。

- [ ] **Step 3: 把 `ProjectActionPermission` 加入默认权限类，并给失败列表中的视图补上表内声明**

不要把未映射视图加入 `PUBLIC_VIEWS`。现有测试若因非成员被拒绝而失败，把调用者改成创建者或启用成员，不要删除权限类。

- [ ] **Step 4: 运行覆盖测试和相邻模块测试**

Run: `DJANGO_DB=sqlite uv run pytest label_studio/projects/tests/test_permission_coverage.py label_studio/projects/tests label_studio/tasks/tests label_studio/data_manager/tests label_studio/data_import/tests label_studio/data_export/tests -q`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add label_studio/core/settings/base.py label_studio/projects/tests/test_permission_coverage.py
git commit -m "feat: enforce project action permissions by default"
```

把 Step 3 里实际修改的视图文件一并加入这次提交。

### Task 12: 项目成员页面和只读能力

**Files:**
- Create: `web/apps/labelstudio/src/pages/Settings/MembersSettings/MembersSettings.jsx`
- Modify: `web/apps/labelstudio/src/pages/Settings/index.jsx`
- Modify: `web/apps/labelstudio/src/pages/Projects/ProjectsList.jsx`
- Modify: `web/apps/labelstudio/src/providers/ApiProvider.tsx`
- Modify: `web/libs/datamanager/src/sdk/lsf-sdk.js`
- Test: `web/apps/labelstudio/src/pages/Settings/MembersSettings/members-settings.test.jsx`
- Test: `web/libs/datamanager/src/sdk/__tests__/annotation-editable.test.js`

**Interfaces:**
- Consumes: 成员接口和项目 `access`。whoami 只提供 `projects.create` 这一项组织级创建能力。
- Produces:
  - `annotationEditable(annotation, currentUserId, canManage) -> bool`
  - `shouldHoldProjectAccessDenied(pathname, status) -> bool`

- [ ] **Step 1: 写失败测试**

```javascript
test("another annotator's result is read only for a member", () => {
  expect(annotationEditable({ completed_by: 2 }, 1, false)).toBe(false);
  expect(annotationEditable({ completed_by: 1 }, 1, false)).toBe(true);
  expect(annotationEditable({ completed_by: 2 }, 1, true)).toBe(true);
});

test("project denial stays on the page", () => {
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 403)).toBe(true);
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 404)).toBe(true);
  expect(shouldHoldProjectAccessDenied("/organization", 404)).toBe(false);
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 401)).toBe(false);
});
```

成员页测试断言：按钮文字是 `添加成员` 和 `取消授权`；取消前出现确认，确认文字为 `取消授权后，该用户不能再访问此项目。已提交的标注会保留。` 组织负责人和项目创建者没有取消按钮。不能创建项目且列表为空时，空状态是 `暂无获授权的项目，请联系项目负责人`。组织负责人的空列表仍保留创建项目入口。

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd web && bun test --dom apps/labelstudio/src/pages/Settings/MembersSettings/members-settings.test.jsx libs/datamanager/src/sdk/__tests__/annotation-editable.test.js`

Expected: FAIL，模块尚未导出这两个函数。

- [ ] **Step 3: 按测试中的文案和返回值实现页面与两个函数**

设置菜单项为 `项目成员`，路由放在现有设置页之下。使用 `@humansignal/ui` 的按钮、空状态、确认框和分页。添加成员是明确提交，不自动保存。`access.can_manage` 为假时不渲染导入、导出、删除任务、共享视图编辑和批量写入口。`annotationEditable` 接到现有标注初始化，不新增编辑器模式。`shouldHoldProjectAccessDenied` 为真时，`ApiProvider` 不再跳转、不再显示保存成功，并停止继续提交；页面保留当前未提交内容，并提供 `返回项目列表`。401 仍走现有登录跳转。

- [ ] **Step 4: 运行测试并确认通过**

Run: `cd web && bun test --dom apps/labelstudio/src/pages/Settings/MembersSettings/members-settings.test.jsx libs/datamanager/src/sdk/__tests__/annotation-editable.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/apps/labelstudio/src/pages/Settings web/apps/labelstudio/src/pages/Projects/ProjectsList.jsx web/apps/labelstudio/src/providers/ApiProvider.tsx web/libs/datamanager/src/sdk/lsf-sdk.js web/libs/datamanager/src/sdk/__tests__/annotation-editable.test.js
git commit -m "feat: show project members and hide unauthorized actions"
```

### Task 13: 浏览器验收

**Files:**
- Create: `web/apps/labelstudio-e2e/src/support/commands.ts` 中的登录命令，若文件不存在则创建
- Create: `web/apps/labelstudio-e2e/src/project-members.cy.ts`
- Modify: `web/apps/labelstudio-e2e/src/support/e2e.ts`

**Interfaces:**
- Consumes: Task 5 的成员接口、Task 12 的页面文案、现有 `/user/login/`。
- Produces: Cypress 命令 `cy.login(email, password)`，使用会话 cookie 登录。

- [ ] **Step 1: 写 Cypress 规格**

规格按这个顺序操作：组织负责人创建项目并在成员页添加用户 A；A 登录后只看到该项目，提交一条标注；A 的界面没有导入和成员管理按钮；负责人取消 A 的授权；A 在原来的页面再次保存，看到 `项目不可访问，可能已被删除或访问权限已取消`，并且没有保存成功提示。

- [ ] **Step 2: 运行规格并确认失败**

Run: `cd web && bun --bun run cypress run --project apps/labelstudio-e2e --spec src/project-members.cy.ts`

Expected: FAIL。本地需要已有的 `http://localhost:8080/` 后端；没有后端时不要把规格改成只做组件渲染。

- [ ] **Step 3: 补上登录命令，并只修正规格与实现之间的选择器差异**

选择器使用 Task 12 已经断言过的按钮文字和 `data-testid`。不要用隐藏按钮代替后端拒绝，也不要在规格里直接改数据库。

- [ ] **Step 4: 重新运行规格**

Run: `cd web && bun --bun run cypress run --project apps/labelstudio-e2e --spec src/project-members.cy.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/apps/labelstudio-e2e
git commit -m "test: cover project member grant and revoked save"
```

## 发布前检查

- 规格第 10 节的备份、组织负责人修复、历史账号盘点和目录重叠检查由运维在维护窗口完成。代码只提供一次性迁移，不提供在线关闭 ACL 的开关。
- 发布分支要包含任务 1–11。只发布可见范围或只发布界面，都不满足规格的成功标准。
- 回滚到旧社区版会重新扩大可见范围，只能在普通用户入口关闭时进行。

## Self-review

- 规格第 4–9 节的规则分别落到任务 1、2、4、6、7、8、9。成员接口是任务 5。组织移除和后台标志是任务 10。覆盖清单由任务 11 执行。界面和浏览器验收是任务 12、13。
- 五个 Review Focus 分别有测试：禁用成员行、活动组织不一致、重新加入组织、混合 ID、存储客户端不被构造。
- 任务间函数名保持为 `visible_projects`、`can_access_project`、`can_manage_project`、`can_create_project`、`grant_project_member`、`revoke_project_member`、`ensure_project_manage`。
- 计划没有写视图函数体；固定下来的是查询条件、权限映射、错误原文和迁移规则。
