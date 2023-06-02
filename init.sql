INSERT INTO auth_group (id, name)
VALUES (1, 'annotator'),(2, 'project_manger'),(3, 'admin');

INSERT INTO `django_content_type` (`app_label`, `model`)
VALUES ('organizations', 'permission');

set @organizations_content_type_id=(select id from django_content_type where app_label='organizations' and model='permission');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('组织创建', @organizations_content_type_id, 'create');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('组织详情', @organizations_content_type_id, 'view');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('组织修改', @organizations_content_type_id, 'change');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('组织删除', @organizations_content_type_id, 'delete');

INSERT INTO `django_content_type` (`app_label`, `model`)
VALUES ('projects', 'permission');

set @project_content_type_id=(select id from django_content_type where app_label='projects' and model='permission');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('项目创建', @project_content_type_id, 'create');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('项目详情', @project_content_type_id, 'view');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('项目修改', @project_content_type_id, 'change');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('项目删除', @project_content_type_id, 'delete');

INSERT INTO `django_content_type` (`app_label`, `model`)
VALUES ('tasks', 'permission');

set @tasks_content_type_id=(select id from django_content_type where app_label='tasks' and model='permission');

INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注任务创建', @tasks_content_type_id, 'create');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注任务详情', @tasks_content_type_id, 'view');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注任务修改', @tasks_content_type_id, 'change');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注任务删除', @tasks_content_type_id, 'delete');

INSERT INTO `django_content_type` (`app_label`, `model`)
VALUES ('annotations', 'permission');

set @annotations_content_type_id=(select id from django_content_type where app_label='annotations' and model='permission');

INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注创建', @annotations_content_type_id, 'create');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注查看', @annotations_content_type_id, 'view');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注删除', @annotations_content_type_id, 'delete');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标注设置', @annotations_content_type_id, 'change');

INSERT INTO `django_content_type` (`app_label`, `model`)
VALUES ('predictions', 'permission');

set @predictions_content_type_id=(select id from django_content_type where app_label='predictions' and model='permission');

INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('推理管理', @predictions_content_type_id, 'any');

INSERT INTO `django_content_type` (`app_label`, `model`)
VALUES ('avatar', 'permission');

set @avatar_content_type_id=(select id from django_content_type where app_label='avatar' and model='permission');

INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('头像管理', @avatar_content_type_id, 'any');

INSERT INTO `django_content_type` (`app_label`, `model`)
VALUES ('labels', 'permission');

set @labels_content_type_id=(select id from django_content_type where app_label='labels' and model='permission');

INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标签查看', @labels_content_type_id, 'view');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标签创建', @labels_content_type_id, 'create');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标签修改', @labels_content_type_id, 'change');
INSERT INTO auth_permission (name, content_type_id, codename) VALUES ('标签删除', @labels_content_type_id, 'delete');

insert into auth_group_permissions (group_id, permission_id)
select 1,id
from auth_permission
where 
	(content_type_id = @project_content_type_id and codename in ("view")) or 
	(content_type_id = @tasks_content_type_id and codename in ("create", "view")) or 
	(content_type_id = @annotations_content_type_id and codename in ("create", "view", "change", "delete")) or 
	(content_type_id = @predictions_content_type_id and codename in ("any")) or 
	(content_type_id = @labels_content_type_id and codename in ("view")) or 
	(content_type_id = @avatar_content_type_id and codename in ("any"));

-- Project_manger
insert into auth_group_permissions (group_id, permission_id)
select 2,id
from auth_permission
where 
	(content_type_id = @project_content_type_id and codename in ("create", "change", "view", "delete")) or 
	(content_type_id = @tasks_content_type_id and codename in ("create", "view", "change", "delete")) or 
	(content_type_id = @annotations_content_type_id and codename in ("create", "view", "change", "delete")) or 
	(content_type_id = @predictions_content_type_id and codename in ("any")) or 
	(content_type_id = @labels_content_type_id and codename in ("view", "create", "change", "delete")) or 
	(content_type_id = @avatar_content_type_id and codename in ("any"));

-- admin
insert into auth_group_permissions (group_id, permission_id)
select 3,id
from auth_permission
where
	(content_type_id = @organizations_content_type_id and codename in ("create", "change", "view", "delete")) or 
	(content_type_id = @project_content_type_id and codename in ("create", "change", "view", "delete")) or 
	(content_type_id = @tasks_content_type_id and codename in ("create", "view", "change", "delete")) or 
	(content_type_id = @annotations_content_type_id and codename in ("create", "view", "change", "delete")) or 
	(content_type_id = @predictions_content_type_id and codename in ("any")) or 
	(content_type_id = @labels_content_type_id and codename in ("view", "create", "change", "delete")) or 
	(content_type_id = @avatar_content_type_id and codename in ("any"));
