# atta-ai-label-studio
基于开源项目[label-studio](https://github.com/heartexlabs/label-studio/tree/1.7.3)的1.7.3版本做的二次开发，并原版本上尽量做最小改动来实现功能。

## 项目架构
### 前端
- node版本：14
- 框架：主要是react，其中组织模块有部分用到vue
- ui组件：该组织自己封装的前端组件
### 后端：django
- python版本：`>=3.7 <=3.9`
- 数据库：改造后使用mysql
- 缓存：redis，这个主要是给django-rq做任务异步执行

## 改造功能
### 1. 配置改造
目前算法平台有部分隐私配置是在apollo上，例如：oss相关，数据库等。在`core/settings`下增加`apollo.py`来处理与apollo服务交互，同时新引入的配置统一加入到同目录下`label_studio.py`中
```
注：接入apollo后启动项目需要如下环境变量

"APOLLO_CONFIG_ENV": "PRO",
"APOLLO_CONFIG_URL": "http://10.12.0.243:40003",
"APOLLO_CONFIG_CLUSTER": "dev20",
"APOLLO_AUTH_TOKEN": "helloapollo"
```

### 2. 云存储支持oss
在`io_storages`模块下增加oss相关API，同时关闭现在支持的存储，只留下oss`io_storages/functions.py`，同时oss的`bucket`、 `ak`、`endpoint`, 都通过apollo配置获取

### 3. 权限改造

#### 角色分类
角色共分为三种：平台管理员、项目管理员、项目标注员，对应功能权限如下

| **功能**           | **平台管理员** | **项目管理员** | 项目标注员      |
| ------------------ | -------------- | -------------- | --------------- |
| 个人账号管理       | ✅              | ✅              | ✅               |
| 平台成员管理       | ✅              | ❌              | ❌               |
| 项目查看           | ✅              | ✅              | ✅（已分配项目） |
| 项目删除           | ✅              | ❌              | ❌               |
| 项目创建           | ✅              | ✅              | ❌               |
| 项目成员添加       | ✅              | ✅              | ❌               |
| 项目设置           | ✅              | ✅              | ❌               |
| 数据导入管理       | ✅              | ✅              | ❌               |
| 数据导出管理       | ✅              | ✅              | ❌               |
| 标注任务分配、删除 | ✅              | ✅              | ❌               |
| 任务查看           | ✅              | ✅              | ✅               |
| 任务标注           | ✅              | ✅              | ✅               |
| 任务标注结果管理   | ✅              | ✅              | ✅               |

#### 
#### 接口权限改造
基于django的auth扩展，在对应API中指定路由使用的权限，通过统一的权限校验