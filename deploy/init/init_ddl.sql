# ************************************************************
# Sequel Ace SQL dump
# 版本号： 20025
#
# https://sequel-ace.com/
# https://github.com/Sequel-Ace/Sequel-Ace
#
# 主机: 127.0.0.1 (MySQL 8.0.30)
# 数据库: label_studio2
# 生成时间: 2023-06-01 07:50:01 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE='NO_AUTO_VALUE_ON_ZERO', SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

use label_studio2;
# 转储表 auth_group
# ------------------------------------------------------------

CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 auth_group_permissions
# ------------------------------------------------------------

CREATE TABLE `auth_group_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 auth_permission
# ------------------------------------------------------------

CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 authtoken_token
# ------------------------------------------------------------

CREATE TABLE `authtoken_token` (
  `key` varchar(40) NOT NULL,
  `created` datetime(6) NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `authtoken_token_user_id_35299eff_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 core_asyncmigrationstatus
# ------------------------------------------------------------

CREATE TABLE `core_asyncmigrationstatus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meta` json DEFAULT NULL,
  `name` longtext NOT NULL,
  `status` varchar(100) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `project_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `core_asyncmigrationstatus_project_id_c78fbf75_fk_project_id` (`project_id`),
  CONSTRAINT `core_asyncmigrationstatus_project_id_c78fbf75_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 data_export_convertedformat
# ------------------------------------------------------------

CREATE TABLE `data_export_convertedformat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file` varchar(100) DEFAULT NULL,
  `status` varchar(64) NOT NULL,
  `export_type` varchar(64) NOT NULL,
  `export_id` int NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by_id` int DEFAULT NULL,
  `finished_at` datetime(6) DEFAULT NULL,
  `organization_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `traceback` longtext,
  PRIMARY KEY (`id`),
  KEY `data_export_converte_export_id_3305f028_fk_data_expo` (`export_id`),
  KEY `data_export_converte_created_by_id_a765f2cd_fk_htx_user_` (`created_by_id`),
  KEY `data_export_converte_organization_id_d0e9d7c8_fk_organizat` (`organization_id`),
  KEY `data_export_convertedformat_project_id_3cda1a1c_fk_project_id` (`project_id`),
  CONSTRAINT `data_export_converte_created_by_id_a765f2cd_fk_htx_user_` FOREIGN KEY (`created_by_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `data_export_converte_export_id_3305f028_fk_data_expo` FOREIGN KEY (`export_id`) REFERENCES `data_export_export` (`id`),
  CONSTRAINT `data_export_converte_organization_id_d0e9d7c8_fk_organizat` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `data_export_convertedformat_project_id_3cda1a1c_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 data_export_export
# ------------------------------------------------------------

CREATE TABLE `data_export_export` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `file` varchar(100) DEFAULT NULL,
  `md5` varchar(128) NOT NULL,
  `finished_at` datetime(6) DEFAULT NULL,
  `status` varchar(64) NOT NULL,
  `counters` json NOT NULL,
  `created_by_id` int DEFAULT NULL,
  `project_id` int NOT NULL,
  `title` varchar(2048) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `data_export_export_created_by_id_ae0b7af3_fk_htx_user_id` (`created_by_id`),
  KEY `data_export_export_project_id_dc05487f_fk_project_id` (`project_id`),
  CONSTRAINT `data_export_export_created_by_id_ae0b7af3_fk_htx_user_id` FOREIGN KEY (`created_by_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `data_export_export_project_id_dc05487f_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 data_import_fileupload
# ------------------------------------------------------------

CREATE TABLE `data_import_fileupload` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file` varchar(100) NOT NULL,
  `project_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `data_import_fileupload_project_id_1f511810_fk_project_id` (`project_id`),
  KEY `data_import_fileupload_user_id_a3e1f065_fk_htx_user_id` (`user_id`),
  CONSTRAINT `data_import_fileupload_project_id_1f511810_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `data_import_fileupload_user_id_a3e1f065_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 data_manager_filter
# ------------------------------------------------------------

CREATE TABLE `data_manager_filter` (
  `id` int NOT NULL AUTO_INCREMENT,
  `column` varchar(1024) NOT NULL,
  `type` varchar(1024) NOT NULL,
  `operator` varchar(1024) NOT NULL,
  `value` json DEFAULT NULL,
  `index` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 data_manager_filtergroup
# ------------------------------------------------------------

CREATE TABLE `data_manager_filtergroup` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conjunction` varchar(1024) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 data_manager_filtergroup_filters
# ------------------------------------------------------------

CREATE TABLE `data_manager_filtergroup_filters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filtergroup_id` int NOT NULL,
  `filter_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `data_manager_filtergroup_filtergroup_id_filter_id_196c3e22_uniq` (`filtergroup_id`,`filter_id`),
  KEY `data_manager_filterg_filter_id_954bc394_fk_data_mana` (`filter_id`),
  CONSTRAINT `data_manager_filterg_filter_id_954bc394_fk_data_mana` FOREIGN KEY (`filter_id`) REFERENCES `data_manager_filter` (`id`),
  CONSTRAINT `data_manager_filterg_filtergroup_id_85d9bb16_fk_data_mana` FOREIGN KEY (`filtergroup_id`) REFERENCES `data_manager_filtergroup` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 data_manager_view
# ------------------------------------------------------------

CREATE TABLE `data_manager_view` (
  `id` int NOT NULL AUTO_INCREMENT,
  `data` json DEFAULT NULL,
  `project_id` int NOT NULL,
  `ordering` json DEFAULT NULL,
  `filter_group_id` int DEFAULT NULL,
  `selected_items` json DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `data_manager_view_project_id_59f5a002_fk_project_id` (`project_id`),
  KEY `data_manager_view_filter_group_id_39a9ec2b_fk_data_mana` (`filter_group_id`),
  KEY `data_manager_view_user_id_e71e14cd_fk_htx_user_id` (`user_id`),
  CONSTRAINT `data_manager_view_filter_group_id_39a9ec2b_fk_data_mana` FOREIGN KEY (`filter_group_id`) REFERENCES `data_manager_filtergroup` (`id`),
  CONSTRAINT `data_manager_view_project_id_59f5a002_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `data_manager_view_user_id_e71e14cd_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 django_admin_log
# ------------------------------------------------------------

CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_htx_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 django_content_type
# ------------------------------------------------------------

CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 django_migrations
# ------------------------------------------------------------

CREATE TABLE `django_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 django_session
# ------------------------------------------------------------

CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 htx_user
# ------------------------------------------------------------

CREATE TABLE `htx_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(256) NOT NULL,
  `email` varchar(254) NOT NULL,
  `first_name` varchar(256) NOT NULL,
  `last_name` varchar(256) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `last_activity` datetime(6) NOT NULL,
  `activity_at` datetime(6) NOT NULL,
  `phone` varchar(256) NOT NULL,
  `avatar` varchar(100) NOT NULL,
  `active_organization_id` int DEFAULT NULL,
  `allow_newsletters` tinyint(1) DEFAULT NULL,
  `boss_id` varchar(64) NOT NULL,
  `ding_user_id` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `htx_user_active_organization_id_2e1bb565_fk_organization_id` (`active_organization_id`),
  KEY `htx_user_usernam_a41619_idx` (`username`),
  KEY `htx_user_email_051c68_idx` (`email`),
  KEY `htx_user_first_n_93c5de_idx` (`first_name`),
  KEY `htx_user_last_na_2ace53_idx` (`last_name`),
  KEY `htx_user_date_jo_3bd95e_idx` (`date_joined`),
  CONSTRAINT `htx_user_active_organization_id_2e1bb565_fk_organization_id` FOREIGN KEY (`active_organization_id`) REFERENCES `organization` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 htx_user_groups
# ------------------------------------------------------------

CREATE TABLE `htx_user_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `htx_user_groups_user_id_group_id_34da071d_uniq` (`user_id`,`group_id`),
  KEY `htx_user_groups_group_id_d0fee99a_fk_auth_group_id` (`group_id`),
  CONSTRAINT `htx_user_groups_group_id_d0fee99a_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `htx_user_groups_user_id_620c9163_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 htx_user_user_permissions
# ------------------------------------------------------------

CREATE TABLE `htx_user_user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `htx_user_user_permissions_user_id_permission_id_12eb87f0_uniq` (`user_id`,`permission_id`),
  KEY `htx_user_user_permis_permission_id_edaf5db1_fk_auth_perm` (`permission_id`),
  CONSTRAINT `htx_user_user_permis_permission_id_edaf5db1_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `htx_user_user_permissions_user_id_a71f59ac_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_azureblobexportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_azureblobexportstorage` (
  `azureblobstoragemixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `can_delete_objects` tinyint(1) DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`azureblobstoragemixin_ptr_id`),
  KEY `io_storages_azureblo_project_id_43222df5_fk_project_i` (`project_id`),
  CONSTRAINT `io_storages_azureblo_azureblobstoragemixi_54a8d52d_fk_io_storag` FOREIGN KEY (`azureblobstoragemixin_ptr_id`) REFERENCES `io_storages_azureblobstoragemixin` (`id`),
  CONSTRAINT `io_storages_azureblo_project_id_43222df5_fk_project_i` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_azureblobexportstorage_chk_1` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_azureblobexportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_azureblobexportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `annotation_id` int NOT NULL,
  `storage_id` int NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `annotation_id` (`annotation_id`),
  KEY `io_storages_azureblo_storage_id_1b260b1e_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_azureblo_annotation_id_6cc15c83_fk_task_comp` FOREIGN KEY (`annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `io_storages_azureblo_storage_id_1b260b1e_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_azureblobexportstorage` (`azureblobstoragemixin_ptr_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_azureblobimportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_azureblobimportstorage` (
  `azureblobstoragemixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `presign` tinyint(1) NOT NULL,
  `presign_ttl` smallint unsigned NOT NULL,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`azureblobstoragemixin_ptr_id`),
  KEY `io_storages_azureblo_project_id_67a67313_fk_project_i` (`project_id`),
  CONSTRAINT `io_storages_azureblo_azureblobstoragemixi_e6234dd9_fk_io_storag` FOREIGN KEY (`azureblobstoragemixin_ptr_id`) REFERENCES `io_storages_azureblobstoragemixin` (`id`),
  CONSTRAINT `io_storages_azureblo_project_id_67a67313_fk_project_i` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_azureblobimportstorage_chk_1` CHECK ((`presign_ttl` >= 0)),
  CONSTRAINT `io_storages_azureblobimportstorage_chk_2` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_azureblobimportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_azureblobimportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` longtext NOT NULL,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `task_id` int NOT NULL,
  `storage_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `io_storages_azureblo_storage_id_a08c3173_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_azureblo_storage_id_a08c3173_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_azureblobimportstorage` (`azureblobstoragemixin_ptr_id`),
  CONSTRAINT `io_storages_azureblob_task_id_26c31809_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_azureblobstoragemixin
# ------------------------------------------------------------

CREATE TABLE `io_storages_azureblobstoragemixin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `container` longtext,
  `prefix` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  `account_name` longtext,
  `account_key` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_gcsexportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_gcsexportstorage` (
  `gcsstoragemixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `can_delete_objects` tinyint(1) DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`gcsstoragemixin_ptr_id`),
  KEY `io_storages_gcsexportstorage_project_id_c3141a14_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_gcsexpor_gcsstoragemixin_ptr__007e6803_fk_io_storag` FOREIGN KEY (`gcsstoragemixin_ptr_id`) REFERENCES `io_storages_gcsstoragemixin` (`id`),
  CONSTRAINT `io_storages_gcsexportstorage_project_id_c3141a14_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_gcsexportstorage_chk_1` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_gcsexportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_gcsexportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `annotation_id` int NOT NULL,
  `storage_id` int NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `annotation_id` (`annotation_id`),
  KEY `io_storages_gcsexpor_storage_id_e940a32d_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_gcsexpor_annotation_id_2df715a6_fk_task_comp` FOREIGN KEY (`annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `io_storages_gcsexpor_storage_id_e940a32d_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_gcsexportstorage` (`gcsstoragemixin_ptr_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_gcsimportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_gcsimportstorage` (
  `gcsstoragemixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `presign` tinyint(1) NOT NULL,
  `presign_ttl` smallint unsigned NOT NULL,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`gcsstoragemixin_ptr_id`),
  KEY `io_storages_gcsimportstorage_project_id_dfb68296_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_gcsimpor_gcsstoragemixin_ptr__10604ed3_fk_io_storag` FOREIGN KEY (`gcsstoragemixin_ptr_id`) REFERENCES `io_storages_gcsstoragemixin` (`id`),
  CONSTRAINT `io_storages_gcsimportstorage_project_id_dfb68296_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_gcsimportstorage_chk_1` CHECK ((`presign_ttl` >= 0)),
  CONSTRAINT `io_storages_gcsimportstorage_chk_2` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_gcsimportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_gcsimportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` longtext NOT NULL,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `task_id` int NOT NULL,
  `storage_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `io_storages_gcsimpor_storage_id_f3037a96_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_gcsimpor_storage_id_f3037a96_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_gcsimportstorage` (`gcsstoragemixin_ptr_id`),
  CONSTRAINT `io_storages_gcsimportstoragelink_task_id_3bedcb9b_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_gcsstoragemixin
# ------------------------------------------------------------

CREATE TABLE `io_storages_gcsstoragemixin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bucket` longtext,
  `prefix` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  `google_application_credentials` longtext,
  `google_project_id` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_localfilesexportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_localfilesexportstorage` (
  `localfilesmixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `project_id` int NOT NULL,
  `can_delete_objects` tinyint(1) DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`localfilesmixin_ptr_id`),
  KEY `io_storages_localfil_project_id_35dd9dc7_fk_project_i` (`project_id`),
  CONSTRAINT `io_storages_localfil_localfilesmixin_ptr__f0b19499_fk_io_storag` FOREIGN KEY (`localfilesmixin_ptr_id`) REFERENCES `io_storages_localfilesmixin` (`id`),
  CONSTRAINT `io_storages_localfil_project_id_35dd9dc7_fk_project_i` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_localfilesexportstorage_chk_1` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_localfilesexportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_localfilesexportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `annotation_id` int NOT NULL,
  `storage_id` int NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `annotation_id` (`annotation_id`),
  KEY `io_storages_localfil_storage_id_87392e7a_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_localfil_annotation_id_fc4f9825_fk_task_comp` FOREIGN KEY (`annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `io_storages_localfil_storage_id_87392e7a_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_localfilesexportstorage` (`localfilesmixin_ptr_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_localfilesimportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_localfilesimportstorage` (
  `localfilesmixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `project_id` int NOT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`localfilesmixin_ptr_id`),
  KEY `io_storages_localfil_project_id_9ae1d2c5_fk_project_i` (`project_id`),
  CONSTRAINT `io_storages_localfil_localfilesmixin_ptr__fb0a0be4_fk_io_storag` FOREIGN KEY (`localfilesmixin_ptr_id`) REFERENCES `io_storages_localfilesmixin` (`id`),
  CONSTRAINT `io_storages_localfil_project_id_9ae1d2c5_fk_project_i` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_localfilesimportstorage_chk_1` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_localfilesimportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_localfilesimportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` longtext NOT NULL,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `task_id` int NOT NULL,
  `storage_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `io_storages_localfil_storage_id_59a5663c_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_localfil_storage_id_59a5663c_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_localfilesimportstorage` (`localfilesmixin_ptr_id`),
  CONSTRAINT `io_storages_localfile_task_id_d0e8315f_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_localfilesmixin
# ------------------------------------------------------------

CREATE TABLE `io_storages_localfilesmixin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `path` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_ossexportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_ossexportstorage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  `can_delete_objects` tinyint(1) DEFAULT NULL,
  `bucket` longtext,
  `prefix` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  `oss_access_key_id` longtext,
  `oss_secret_access_key` longtext,
  `region_name` longtext,
  `oss_endpoint` longtext,
  `project_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `io_storages_ossexportstorage_project_id_8b09c54d_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_ossexportstorage_project_id_8b09c54d_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_ossexportstorage_chk_1` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_ossexportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_ossexportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `annotation_id` int NOT NULL,
  `storage_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `annotation_id` (`annotation_id`),
  KEY `io_storages_ossexpor_storage_id_4307108b_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_ossexpor_annotation_id_77aa9adf_fk_task_comp` FOREIGN KEY (`annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `io_storages_ossexpor_storage_id_4307108b_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_ossexportstorage` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_ossimportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_ossimportstorage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  `bucket` longtext,
  `prefix` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  `oss_access_key_id` longtext,
  `oss_secret_access_key` longtext,
  `region_name` longtext,
  `oss_endpoint` longtext,
  `presign` tinyint(1) NOT NULL,
  `presign_ttl` smallint unsigned NOT NULL,
  `recursive_scan` tinyint(1) NOT NULL,
  `project_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `io_storages_ossimportstorage_project_id_49af4c69_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_ossimportstorage_project_id_49af4c69_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_ossimportstorage_chk_1` CHECK ((`last_sync_count` >= 0)),
  CONSTRAINT `io_storages_ossimportstorage_chk_2` CHECK ((`presign_ttl` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_ossimportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_ossimportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` longtext NOT NULL,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `storage_id` int NOT NULL,
  `task_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `io_storages_ossimpor_storage_id_6c75234f_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_ossimpor_storage_id_6c75234f_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_ossimportstorage` (`id`),
  CONSTRAINT `io_storages_ossimportstoragelink_task_id_ebf75e2d_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_redisexportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_redisexportstorage` (
  `redisstoragemixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `db` smallint unsigned NOT NULL,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `can_delete_objects` tinyint(1) DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`redisstoragemixin_ptr_id`),
  KEY `io_storages_redisexportstorage_project_id_12a2546c_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_redisexp_redisstoragemixin_pt_d1c2d337_fk_io_storag` FOREIGN KEY (`redisstoragemixin_ptr_id`) REFERENCES `io_storages_redisstoragemixin` (`id`),
  CONSTRAINT `io_storages_redisexportstorage_project_id_12a2546c_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_redisexportstorage_chk_1` CHECK ((`db` >= 0)),
  CONSTRAINT `io_storages_redisexportstorage_chk_2` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_redisexportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_redisexportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `annotation_id` int NOT NULL,
  `storage_id` int NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `annotation_id` (`annotation_id`),
  KEY `io_storages_redisexp_storage_id_807898d8_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_redisexp_annotation_id_8547e508_fk_task_comp` FOREIGN KEY (`annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `io_storages_redisexp_storage_id_807898d8_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_redisexportstorage` (`redisstoragemixin_ptr_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_redisimportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_redisimportstorage` (
  `redisstoragemixin_ptr_id` int NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `db` smallint unsigned NOT NULL,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`redisstoragemixin_ptr_id`),
  KEY `io_storages_redisimportstorage_project_id_c7b9adc0_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_redisimp_redisstoragemixin_pt_73982db6_fk_io_storag` FOREIGN KEY (`redisstoragemixin_ptr_id`) REFERENCES `io_storages_redisstoragemixin` (`id`),
  CONSTRAINT `io_storages_redisimportstorage_project_id_c7b9adc0_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_redisimportstorage_chk_1` CHECK ((`db` >= 0)),
  CONSTRAINT `io_storages_redisimportstorage_chk_2` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_redisimportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_redisimportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` longtext NOT NULL,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `task_id` int NOT NULL,
  `storage_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `io_storages_redisimp_storage_id_17124de8_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_redisimp_storage_id_17124de8_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_redisimportstorage` (`redisstoragemixin_ptr_id`),
  CONSTRAINT `io_storages_redisimportstoragelink_task_id_6730b8ad_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_redisstoragemixin
# ------------------------------------------------------------

CREATE TABLE `io_storages_redisstoragemixin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `path` longtext,
  `host` longtext,
  `port` longtext,
  `password` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_s3exportstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_s3exportstorage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `bucket` longtext,
  `prefix` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  `aws_access_key_id` longtext,
  `aws_secret_access_key` longtext,
  `aws_session_token` longtext,
  `region_name` longtext,
  `s3_endpoint` longtext,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `can_delete_objects` tinyint(1) DEFAULT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `io_storages_s3exportstorage_project_id_5e76add6_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_s3exportstorage_project_id_5e76add6_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_s3exportstorage_chk_1` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_s3exportstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_s3exportstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `annotation_id` int NOT NULL,
  `storage_id` int NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `annotation_id` (`annotation_id`),
  KEY `io_storages_s3export_storage_id_a4563d13_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_s3export_annotation_id_729994fe_fk_task_comp` FOREIGN KEY (`annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `io_storages_s3export_storage_id_a4563d13_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_s3exportstorage` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_s3importstorage
# ------------------------------------------------------------

CREATE TABLE `io_storages_s3importstorage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(256) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `bucket` longtext,
  `prefix` longtext,
  `regex_filter` longtext,
  `use_blob_urls` tinyint(1) NOT NULL,
  `aws_access_key_id` longtext,
  `aws_secret_access_key` longtext,
  `aws_session_token` longtext,
  `region_name` longtext,
  `s3_endpoint` longtext,
  `presign` tinyint(1) NOT NULL,
  `presign_ttl` smallint unsigned NOT NULL,
  `project_id` int NOT NULL,
  `last_sync` datetime(6) DEFAULT NULL,
  `last_sync_count` int unsigned DEFAULT NULL,
  `recursive_scan` tinyint(1) NOT NULL,
  `last_sync_job` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `io_storages_s3importstorage_project_id_dee63a8d_fk_project_id` (`project_id`),
  CONSTRAINT `io_storages_s3importstorage_project_id_dee63a8d_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `io_storages_s3importstorage_chk_1` CHECK ((`presign_ttl` >= 0)),
  CONSTRAINT `io_storages_s3importstorage_chk_2` CHECK ((`last_sync_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 io_storages_s3importstoragelink
# ------------------------------------------------------------

CREATE TABLE `io_storages_s3importstoragelink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` longtext NOT NULL,
  `object_exists` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `storage_id` int NOT NULL,
  `task_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `io_storages_s3import_storage_id_50ca5bd8_fk_io_storag` (`storage_id`),
  CONSTRAINT `io_storages_s3import_storage_id_50ca5bd8_fk_io_storag` FOREIGN KEY (`storage_id`) REFERENCES `io_storages_s3importstorage` (`id`),
  CONSTRAINT `io_storages_s3importstoragelink_task_id_126f4f82_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 labels_manager_label
# ------------------------------------------------------------

CREATE TABLE `labels_manager_label` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `value` json NOT NULL,
  `title` varchar(512) NOT NULL,
  `description` longtext,
  `approved` tinyint(1) NOT NULL,
  `approved_by_id` int DEFAULT NULL,
  `created_by_id` int NOT NULL,
  `organization_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_title` (`title`,`organization_id`),
  KEY `labels_manager_label_approved_by_id_4b6a871f_fk_htx_user_id` (`approved_by_id`),
  KEY `labels_manager_label_created_by_id_e3b3e785_fk_htx_user_id` (`created_by_id`),
  KEY `labels_manager_label_organization_id_5f714874_fk_organization_id` (`organization_id`),
  CONSTRAINT `labels_manager_label_approved_by_id_4b6a871f_fk_htx_user_id` FOREIGN KEY (`approved_by_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `labels_manager_label_created_by_id_e3b3e785_fk_htx_user_id` FOREIGN KEY (`created_by_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `labels_manager_label_organization_id_5f714874_fk_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 labels_manager_labellink
# ------------------------------------------------------------

CREATE TABLE `labels_manager_labellink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_name` varchar(2048) NOT NULL,
  `label_id` int NOT NULL,
  `project_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_label_project` (`project_id`,`label_id`),
  KEY `labels_manager_label_label_id_c8afbfa4_fk_labels_ma` (`label_id`),
  CONSTRAINT `labels_manager_label_label_id_c8afbfa4_fk_labels_ma` FOREIGN KEY (`label_id`) REFERENCES `labels_manager_label` (`id`),
  CONSTRAINT `labels_manager_labellink_project_id_e3d33738_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 ml_mlbackend
# ------------------------------------------------------------

CREATE TABLE `ml_mlbackend` (
  `id` int NOT NULL AUTO_INCREMENT,
  `state` varchar(2) NOT NULL,
  `url` longtext NOT NULL,
  `error_message` longtext,
  `title` longtext,
  `description` longtext,
  `model_version` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `project_id` int NOT NULL,
  `is_interactive` tinyint(1) NOT NULL,
  `timeout` double NOT NULL,
  `auto_update` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ml_mlbackend_project_id_ca08142d_fk_project_id` (`project_id`),
  CONSTRAINT `ml_mlbackend_project_id_ca08142d_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 ml_mlbackendpredictionjob
# ------------------------------------------------------------

CREATE TABLE `ml_mlbackendpredictionjob` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` varchar(128) NOT NULL,
  `model_version` longtext,
  `batch_size` smallint unsigned NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `ml_backend_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ml_mlbackendpredicti_ml_backend_id_c1aea4f1_fk_ml_mlback` (`ml_backend_id`),
  CONSTRAINT `ml_mlbackendpredicti_ml_backend_id_c1aea4f1_fk_ml_mlback` FOREIGN KEY (`ml_backend_id`) REFERENCES `ml_mlbackend` (`id`),
  CONSTRAINT `ml_mlbackendpredictionjob_chk_1` CHECK ((`batch_size` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 ml_mlbackendtrainjob
# ------------------------------------------------------------

CREATE TABLE `ml_mlbackendtrainjob` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` varchar(128) NOT NULL,
  `model_version` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `ml_backend_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ml_mlbackendtrainjob_ml_backend_id_3d40686e_fk_ml_mlbackend_id` (`ml_backend_id`),
  CONSTRAINT `ml_mlbackendtrainjob_ml_backend_id_3d40686e_fk_ml_mlbackend_id` FOREIGN KEY (`ml_backend_id`) REFERENCES `ml_mlbackend` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 organization
# ------------------------------------------------------------

CREATE TABLE `organization` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(1000) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `created_by_id` int DEFAULT NULL,
  `token` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `created_by_id` (`created_by_id`),
  UNIQUE KEY `token` (`token`),
  CONSTRAINT `organization_created_by_id_35551e36_fk_htx_user_id` FOREIGN KEY (`created_by_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 organizations_organizationmember
# ------------------------------------------------------------

CREATE TABLE `organizations_organizationmember` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `organization_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `organizations_organi_organization_id_f26cf71b_fk_organizat` (`organization_id`),
  KEY `organizations_organizationmember_user_id_f3845ee5_fk_htx_user_id` (`user_id`),
  CONSTRAINT `organizations_organi_organization_id_f26cf71b_fk_organizat` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `organizations_organizationmember_user_id_f3845ee5_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 prediction
# ------------------------------------------------------------

CREATE TABLE `prediction` (
  `id` int NOT NULL AUTO_INCREMENT,
  `result` json DEFAULT NULL,
  `score` double DEFAULT NULL,
  `model_version` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `task_id` int NOT NULL,
  `cluster` int DEFAULT NULL,
  `neighbors` json DEFAULT NULL,
  `mislabeling` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `prediction_task_id_4e4fb4d3_fk_task_id` (`task_id`),
  CONSTRAINT `prediction_task_id_4e4fb4d3_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 project
# ------------------------------------------------------------

CREATE TABLE `project` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(50) DEFAULT NULL,
  `label_config` longtext,
  `expert_instruction` longtext,
  `show_instruction` tinyint(1) NOT NULL,
  `maximum_annotations` int NOT NULL,
  `model_version` longtext,
  `data_types` json DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `created_by_id` int DEFAULT NULL,
  `show_skip_button` tinyint(1) NOT NULL,
  `enable_empty_annotation` tinyint(1) NOT NULL,
  `min_annotations_to_start_training` int NOT NULL,
  `show_annotation_history` tinyint(1) NOT NULL,
  `show_collab_predictions` tinyint(1) NOT NULL,
  `show_ground_truth_first` tinyint(1) NOT NULL,
  `sampling` varchar(100) DEFAULT NULL,
  `task_data_login` varchar(256) DEFAULT NULL,
  `task_data_password` varchar(256) DEFAULT NULL,
  `overlap_cohort_percentage` int NOT NULL,
  `show_overlap_first` tinyint(1) NOT NULL,
  `control_weights` json DEFAULT NULL,
  `token` varchar(256) DEFAULT NULL,
  `result_count` int NOT NULL,
  `organization_id` int DEFAULT NULL,
  `is_draft` tinyint(1) NOT NULL,
  `description` longtext,
  `color` varchar(16) DEFAULT NULL,
  `evaluate_predictions_automatically` tinyint(1) NOT NULL,
  `reveal_preannotations_interactively` tinyint(1) NOT NULL,
  `skip_queue` varchar(100) DEFAULT NULL,
  `parsed_label_config` json DEFAULT NULL,
  `pinned_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_organization_id_3c9f74fb_fk_organization_id` (`organization_id`),
  KEY `project_created_by_id_6cc13408_fk_htx_user_id` (`created_by_id`),
  KEY `project_pinned__a39ccb_idx` (`pinned_at`,`created_at`),
  CONSTRAINT `project_created_by_id_6cc13408_fk_htx_user_id` FOREIGN KEY (`created_by_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `project_organization_id_3c9f74fb_fk_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 projects_labelstreamhistory
# ------------------------------------------------------------

CREATE TABLE `projects_labelstreamhistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `data` json NOT NULL,
  `project_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_history` (`user_id`,`project_id`),
  KEY `projects_labelstreamhistory_project_id_906c91dd_fk_project_id` (`project_id`),
  CONSTRAINT `projects_labelstreamhistory_project_id_906c91dd_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `projects_labelstreamhistory_user_id_1b571ab9_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 projects_projectmember
# ------------------------------------------------------------

CREATE TABLE `projects_projectmember` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `project_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `projects_projectmember_project_id_e589ddea_fk_project_id` (`project_id`),
  KEY `projects_projectmember_user_id_a475bbd8_fk_htx_user_id` (`user_id`),
  CONSTRAINT `projects_projectmember_project_id_e589ddea_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `projects_projectmember_user_id_a475bbd8_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 projects_projectonboarding
# ------------------------------------------------------------

CREATE TABLE `projects_projectonboarding` (
  `id` int NOT NULL AUTO_INCREMENT,
  `finished` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `project_id` int NOT NULL,
  `step_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `projects_projectonboarding_project_id_120e4f53_fk_project_id` (`project_id`),
  KEY `projects_projectonbo_step_id_c232d94b_fk_projects_` (`step_id`),
  CONSTRAINT `projects_projectonbo_step_id_c232d94b_fk_projects_` FOREIGN KEY (`step_id`) REFERENCES `projects_projectonboardingsteps` (`id`),
  CONSTRAINT `projects_projectonboarding_project_id_120e4f53_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 projects_projectonboardingsteps
# ------------------------------------------------------------

CREATE TABLE `projects_projectonboardingsteps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(2) DEFAULT NULL,
  `title` varchar(1000) NOT NULL,
  `description` longtext NOT NULL,
  `order` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 projects_projectsummary
# ------------------------------------------------------------

CREATE TABLE `projects_projectsummary` (
  `project_id` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `all_data_columns` json DEFAULT NULL,
  `common_data_columns` json DEFAULT NULL,
  `created_annotations` json DEFAULT NULL,
  `created_labels` json DEFAULT NULL,
  PRIMARY KEY (`project_id`),
  CONSTRAINT `projects_projectsummary_project_id_0d5aff36_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 task
# ------------------------------------------------------------

CREATE TABLE `task` (
  `id` int NOT NULL AUTO_INCREMENT,
  `data` json NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_labeled` tinyint(1) NOT NULL,
  `project_id` int DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `overlap` int NOT NULL,
  `file_upload_id` int DEFAULT NULL,
  `updated_by_id` int DEFAULT NULL,
  `inner_id` bigint DEFAULT NULL,
  `total_annotations` int NOT NULL,
  `cancelled_annotations` int NOT NULL,
  `total_predictions` int NOT NULL,
  `comment_count` int NOT NULL,
  `last_comment_updated_at` datetime(6) DEFAULT NULL,
  `unresolved_comment_count` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `task_project_6acf5f_idx` (`project_id`,`is_labeled`),
  KEY `task_overlap_455a13f0` (`overlap`),
  KEY `task_id_7a9aca_idx` (`id`,`overlap`),
  KEY `task_file_upload_id_549188ed_fk_data_import_fileupload_id` (`file_upload_id`),
  KEY `task_overlap_6a196e_idx` (`overlap`),
  KEY `task_updated_by_id_c9d9ddfb_fk_htx_user_id` (`updated_by_id`),
  KEY `task_id_aef988_idx` (`id`,`project_id`),
  KEY `task_total_annotations_e77e347b` (`total_annotations`),
  KEY `task_cancelled_annotations_60dfe3b9` (`cancelled_annotations`),
  KEY `task_total_predictions_f1a6b218` (`total_predictions`),
  KEY `task_project_499b59_idx` (`project_id`,`inner_id`),
  KEY `task_comment_count_049355cc` (`comment_count`),
  KEY `task_last_comment_updated_at_d1bc3403` (`last_comment_updated_at`),
  KEY `task_unresolved_comment_count_8707d0c7` (`unresolved_comment_count`),
  CONSTRAINT `task_file_upload_id_549188ed_fk_data_import_fileupload_id` FOREIGN KEY (`file_upload_id`) REFERENCES `data_import_fileupload` (`id`),
  CONSTRAINT `task_project_id_963d6354_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `task_updated_by_id_c9d9ddfb_fk_htx_user_id` FOREIGN KEY (`updated_by_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 task_comment_authors
# ------------------------------------------------------------

CREATE TABLE `task_comment_authors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_comment_authors_task_id_user_id_f6f772c9_uniq` (`task_id`,`user_id`),
  KEY `task_comment_authors_user_id_ff0b1cf0_fk_htx_user_id` (`user_id`),
  CONSTRAINT `task_comment_authors_task_id_80618a4a_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`),
  CONSTRAINT `task_comment_authors_user_id_ff0b1cf0_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 task_completion
# ------------------------------------------------------------

CREATE TABLE `task_completion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `result` json DEFAULT NULL,
  `was_cancelled` tinyint(1) NOT NULL,
  `ground_truth` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `task_id` int DEFAULT NULL,
  `prediction` json DEFAULT NULL,
  `lead_time` double DEFAULT NULL,
  `result_count` int NOT NULL,
  `completed_by_id` int DEFAULT NULL,
  `parent_prediction_id` int DEFAULT NULL,
  `parent_annotation_id` int DEFAULT NULL,
  `last_action` varchar(128) DEFAULT NULL,
  `last_created_by_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `updated_by_id` int DEFAULT NULL,
  `unique_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`),
  KEY `task_completion_completed_by_id_3f3206b1_fk_htx_user_id` (`completed_by_id`),
  KEY `task_completion_task_id_b9049fbc` (`task_id`),
  KEY `task_comple_task_id_e82920_idx` (`task_id`,`ground_truth`),
  KEY `task_comple_was_can_f87d4e_idx` (`was_cancelled`),
  KEY `task_comple_ground__088a1b_idx` (`ground_truth`),
  KEY `task_comple_created_f55e6f_idx` (`created_at`),
  KEY `task_completion_parent_prediction_id_053d00d9_fk_prediction_id` (`parent_prediction_id`),
  KEY `task_completion_parent_annotation_id_58398c37_fk_task_comp` (`parent_annotation_id`),
  KEY `task_comple_task_id_d49cd7_idx` (`task_id`,`completed_by_id`),
  KEY `task_completion_last_created_by_id_a04457d1_fk_htx_user_id` (`last_created_by_id`),
  KEY `task_comple_last_ac_777e69_idx` (`last_action`),
  KEY `task_comple_id_653858_idx` (`id`,`task_id`),
  KEY `task_comple_task_id_8072c3_idx` (`task_id`,`was_cancelled`),
  KEY `task_completion_updated_by_id_1164a739_fk_htx_user_id` (`updated_by_id`),
  KEY `task_comple_project_2cbbfc_idx` (`project_id`,`ground_truth`),
  KEY `task_comple_project_5c60f3_idx` (`project_id`,`was_cancelled`),
  CONSTRAINT `task_completion_completed_by_id_3f3206b1_fk_htx_user_id` FOREIGN KEY (`completed_by_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `task_completion_last_created_by_id_a04457d1_fk_htx_user_id` FOREIGN KEY (`last_created_by_id`) REFERENCES `htx_user` (`id`),
  CONSTRAINT `task_completion_parent_annotation_id_58398c37_fk_task_comp` FOREIGN KEY (`parent_annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `task_completion_parent_prediction_id_053d00d9_fk_prediction_id` FOREIGN KEY (`parent_prediction_id`) REFERENCES `prediction` (`id`),
  CONSTRAINT `task_completion_project_id_94072c87_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `task_completion_task_id_b9049fbc_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`),
  CONSTRAINT `task_completion_updated_by_id_1164a739_fk_htx_user_id` FOREIGN KEY (`updated_by_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 tasks_annotationdraft
# ------------------------------------------------------------

CREATE TABLE `tasks_annotationdraft` (
  `id` int NOT NULL AUTO_INCREMENT,
  `result` json NOT NULL,
  `lead_time` double DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `annotation_id` int DEFAULT NULL,
  `task_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `was_postponed` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_taskcompletiondraft_task_id_e575af88_fk_task_id` (`task_id`),
  KEY `tasks_taskcompletiondraft_user_id_b4b84cef_fk_htx_user_id` (`user_id`),
  KEY `tasks_annotationdraf_annotation_id_86db74e5_fk_task_comp` (`annotation_id`),
  KEY `tasks_annotationdraft_was_postponed_6a1ee000` (`was_postponed`),
  CONSTRAINT `tasks_annotationdraf_annotation_id_86db74e5_fk_task_comp` FOREIGN KEY (`annotation_id`) REFERENCES `task_completion` (`id`),
  CONSTRAINT `tasks_taskcompletiondraft_task_id_e575af88_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`),
  CONSTRAINT `tasks_taskcompletiondraft_user_id_b4b84cef_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 tasks_tasklock
# ------------------------------------------------------------

CREATE TABLE `tasks_tasklock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expire_at` datetime(6) NOT NULL,
  `task_id` int NOT NULL,
  `user_id` int NOT NULL,
  `unique_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`),
  KEY `tasks_tasklock_task_id_6531a5ed_fk_task_id` (`task_id`),
  KEY `tasks_tasklock_user_id_748ae86f_fk_htx_user_id` (`user_id`),
  CONSTRAINT `tasks_tasklock_task_id_6531a5ed_fk_task_id` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`),
  CONSTRAINT `tasks_tasklock_user_id_748ae86f_fk_htx_user_id` FOREIGN KEY (`user_id`) REFERENCES `htx_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 users_permission
# ------------------------------------------------------------

CREATE TABLE `users_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 webhook
# ------------------------------------------------------------

CREATE TABLE `webhook` (
  `id` int NOT NULL AUTO_INCREMENT,
  `url` varchar(2048) NOT NULL,
  `send_payload` tinyint(1) NOT NULL,
  `send_for_all_actions` tinyint(1) NOT NULL,
  `headers` json NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `organization_id` int NOT NULL,
  `project_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhook_organization_id_b5440e9a_fk_organization_id` (`organization_id`),
  KEY `webhook_project_id_e686d00c_fk_project_id` (`project_id`),
  KEY `webhook_created_at_b2a71ea5` (`created_at`),
  KEY `webhook_updated_at_695b4e7f` (`updated_at`),
  CONSTRAINT `webhook_organization_id_b5440e9a_fk_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `webhook_project_id_e686d00c_fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# 转储表 webhook_action
# ------------------------------------------------------------

CREATE TABLE `webhook_action` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(128) NOT NULL,
  `webhook_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `webhook_action_webhook_id_action_11842b15_uniq` (`webhook_id`,`action`),
  KEY `webhook_action_action_4398909e` (`action`),
  CONSTRAINT `webhook_action_webhook_id_4eb6213f_fk_webhook_id` FOREIGN KEY (`webhook_id`) REFERENCES `webhook` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
