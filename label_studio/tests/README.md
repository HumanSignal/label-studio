label-studio-py3.10u1214742@USNYCGLQ004Q0VC label_studio % DJANGO_DB=sqlite DJANGO_SETTINGS_MODULE=core.settings.label_studio pytest  tests/io_storages.tavern.yml::test_export_azure_storage -vv -ss
=> Database and media directory: /Users/u1214742/Library/Application Support/label-studio
=> Static URL is set to: /static/
Read environment variables from: /Users/u1214742/Library/Application Support/label-studio/.env
get 'SECRET_KEY' casted as '<class 'str'>' with default ''
Starting new HTTPS connection (1): pypi.org:443
https://pypi.org:443 "GET /pypi/label-studio/json HTTP/1.1" 200 32193

 Your requests version is under 2.28 and it does not support HEADER_VALIDATORS.

====================================================== test session starts ======================================================
platform darwin -- Python 3.10.12, pytest-7.2.2, pluggy-1.5.0 -- /Users/u1214742/Library/Caches/pypoetry/virtualenvs/label-studio-D2Dtkonh-py3.10/bin/python
cachedir: .pytest_cache
django: settings: core.settings.label_studio (from env)
rootdir: /Users/u1214742/Library/CloudStorage/OneDrive-MMC/2023_OneDrive/Documents/DE_code/label-studio/label_studio, configfile: pytest.ini
plugins: cov-2.12.1, tavern-2.3.0, xdist-2.5.0, env-0.6.2, anyio-4.4.0, django-4.1.0, mock-1.10.3, forked-1.6.0, requests-mock-1.12.1
collected 1 item

tests/io_storages.tavern.yml::test_export_azure_storage Creating test database for alias 'default' ('file:memorydb_default?mode=memory&cache=shared')...
Operations to perform:
  Synchronize unmigrated apps: annoying, corsheaders, django_extensions, django_filters, drf_generators, drf_yasg, humanize, messages, rest_framework, rules, staticfiles
  Apply all migrations: admin, auth, authtoken, contenttypes, core, data_export, data_import, data_manager, django_rq, io_storages, labels_manager, ml, ml_model_providers, ml_models, organizations, projects, sessions, tasks, users, webhooks
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0001_initial... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying auth.0008_alter_user_username_max_length... OK
  Applying auth.0009_alter_user_last_name_max_length... OK
  Applying users.0001_squashed_0009_auto_20210219_1237... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying auth.0010_alter_group_name_max_length... OK
  Applying auth.0011_update_proxy_permissions... OK
  Applying auth.0012_alter_user_first_name_max_length... OK
  Applying authtoken.0001_initial... OK
  Applying authtoken.0002_auto_20160226_1747... OK
  Applying authtoken.0003_tokenproxy... OK
  Applying organizations.0001_squashed_0008_auto_20201005_1552... OK
  Applying projects.0001_squashed_0065_auto_20210223_2014... OK
  Applying projects.0002_auto_20210304_1457... OK
  Applying projects.0003_project_color... OK
  Applying projects.0004_auto_20210306_0506... OK
  Applying projects.0003_auto_20210305_1008... OK
  Applying projects.0005_merge_20210308_1141... OK
  Applying projects.0006_auto_20210308_1559... OK
  Applying projects.0007_auto_20210309_1304... OK
  Applying projects.0008_auto_20210314_1840... OK
  Applying projects.0009_project_evaluate_predictions_automatically... OK
  Applying projects.0010_auto_20210505_2037... OK
  Applying projects.0011_auto_20210517_2101... OK
  Applying projects.0012_auto_20210906_1323... OK
  Applying projects.0013_project_reveal_preannotations_interactively... OK
  Applying projects.0014_project_parsed_label_config... OK
  Applying projects.0013_project_skip_queue... OK
  Applying projects.0015_merge_20220117_0749... OK
  Applying projects.0016_auto_20220211_2218... OK
  Applying core.0001_initial... OK
  Applying projects.0017_project_pinned_at... OK
  Applying projects.0018_alter_project_control_weights... OK
  Applying projects.0019_labelstreamhistory... OK
  Applying projects.0020_labelstreamhistory_unique_history... OK
  Applying projects.0019_project_project_pinned__a39ccb_idx... OK
  Applying projects.0021_merge_20230215_1943... OK
  Applying organizations.0002_auto_20210310_2044... OK
  Applying organizations.0003_auto_20211010_1339... OK
  Applying data_export.0001_initial... OK
  Applying data_export.0002_auto_20210921_0954... OK
  Applying data_export.0003_auto_20211004_1416... OK
  Applying data_export.0004_auto_20211019_0852... OK
  Applying data_export.0005_auto_20211025_1137... OK
  Applying data_export.0006_convertedformat... OK
  Applying data_export.0007_auto_20230327_1910... OK
  Applying data_export.0008_convertedformat_traceback... OK
  Applying data_export.0009_alter_convertedformat_traceback... OK
  Applying data_export.0010_alter_convertedformat_export_type... OK
  Applying data_import.0001_initial... OK
  Applying data_import.0002_alter_fileupload_file... OK
  Applying tasks.0001_squashed_0041_taskcompletionhistory_was_cancelled... OK
  Applying tasks.0002_auto_20210305_2035... OK
  Applying io_storages.0001_squashed_0002_auto_20210302_1827... OK
  Applying tasks.0002_auto_20210304_1423... OK
  Applying tasks.0003_merge_20210308_1141... OK
  Applying tasks.0004_auto_20210308_1559... OK
  Applying tasks.0005_auto_20210309_1239... OK
  Applying tasks.0006_remove_annotation_state... OK
  Applying tasks.0007_auto_20210618_1653... OK
  Applying tasks.0008_auto_20210903_1332... OK
  Applying tasks.0009_auto_20210914_0020... OK
  Applying tasks.0010_auto_20210914_0032... OK
  Applying tasks.0009_auto_20210913_0739... OK
  Applying tasks.0011_merge_20210914_1036... OK
  Applying tasks.0012_auto_20211010_1339... OK
  Applying tasks.0013_task_updated_by... OK
  Applying tasks.0014_task_inner_id... OK
  Applying tasks.0015_task_fill_inner_id... OK
  Applying tasks.0016_auto_20220414_1408... OK
  Applying tasks.0017_auto_20220330_1310... OK
  Applying tasks.0018_manual_migrate_counters... OK
  Applying tasks.0017_new_index_anno_result... OK
  Applying tasks.0019_merge_20220512_2038... OK
  Applying tasks.0020_auto_20220515_2332... OK
  Applying tasks.0021_auto_20220515_2358... OK
  Applying tasks.0020_auto_20220516_0545... OK
  Applying tasks.0022_merge_20220517_1128... OK
  Applying tasks.0023_auto_20220620_1007... OK
  Applying data_manager.0001_squashed_0005_view_user... OK
  Applying data_manager.0002_remove_annotations_ids... OK
  Applying data_manager.0003_remove_predictions_model_versions... OK
  Applying data_manager.0004_remove_avg_lead_time... OK
  Applying data_manager.0005_remove_updated_by... OK
  Applying data_manager.0006_remove_inner_id... OK
  Applying data_manager.0007_auto_20220708_0832... OK
  Applying data_manager.0008_manual_counters_update... OK
  Applying data_manager.0009_alter_view_user... OK
  Applying data_manager.0010_auto_20230718_1423... OK
  Applying django_rq.0001_initial... OK
  Applying tasks.0024_manual_migrate_counters_again... OK
  Applying tasks.0025_auto_20220721_0110... OK
  Applying tasks.0026_auto_20220725_1705... OK
  Applying tasks.0027_auto_20220801_1728... OK
  Applying tasks.0028_auto_20220802_2220... OK
  Applying tasks.0029_annotation_project... OK
  Applying tasks.0030_auto_20221102_1118... OK
  Applying tasks.0031_alter_task_options... OK
  Applying tasks.0032_annotation_updated_by... OK
  Applying tasks.0033_annotation_updated_by_fill... OK
  Applying tasks.0034_annotation_unique_id... OK
  Applying tasks.0035_tasklock_unique_id... OK
  Applying tasks.0036_auto_20221223_1102... OK
  Applying tasks.0034_auto_20221221_1101... OK
  Applying tasks.0035_auto_20221221_1116... OK
  Applying tasks.0037_merge_0035_auto_20221221_1116_0036_auto_20221223_1102... OK
  Applying tasks.0038_auto_20230209_1412... OK
  Applying tasks.0039_annotation_draft_created_at... OK
  Applying tasks.0040_auto_20230628_1101... OK
  Applying projects.0022_projectimport... OK
  Applying projects.0023_projectreimport... OK
  Applying projects.0022_projectsummary_created_labels_drafts... OK
  Applying projects.0023_merge_20230512_1333... OK
  Applying projects.0024_merge_0023_merge_20230512_1333_0023_projectreimport... OK
  Applying tasks.0041_prediction_project... OK
  Applying tasks.0042_auto_20230810_2304... OK
  Applying tasks.0043_auto_20230825... OK
  Applying tasks.0044_auto_20230907_0155... OK
  Applying tasks.0045_auto_20231124_1238... OK
  Applying projects.0025_project_label_config_hash... OK
  Applying projects.0026_auto_20231103_0020... OK
  Applying organizations.0004_organization_contact_info... OK
  Applying organizations.0005_organizationmember_deleted_at... OK
  Applying organizations.0006_alter_organizationmember_deleted_at... OK
  Applying ml_models.0001_initial... OK
  Applying ml_models.0002_modelrun... OK
  Applying ml_models.0003_auto_20240228_2228... OK
  Applying ml_models.0004_modelrun_job_id... OK
  Applying tasks.0046_prediction_model_run... OK
  Applying ml.0001_initial... OK
  Applying ml.0002_auto_20210308_1559... OK
  Applying ml.0003_auto_20210309_1239... OK
  Applying ml.0004_auto_20210820_1610... OK
  Applying ml.0005_auto_20211010_1344... OK
  Applying ml.0006_mlbackend_auto_update... OK
  Applying ml.0007_auto_20240314_1957... OK
  Applying tasks.0046_auto_20240314_1957... OK
  Applying tasks.0047_merge_20240318_2210... OK
  Applying io_storages.0002_auto_20210311_0530... OK
  Applying io_storages.0003_localfilesimportstorage... OK
  Applying io_storages.0004_gcsstoragemixin_google_application_credentials... OK
  Applying io_storages.0005_s3importstorage_recursive_scan... OK
  Applying io_storages.0006_auto_20210906_1323... OK
  Applying io_storages.0007_auto_20210928_1252... OK
  Applying io_storages.0008_auto_20211129_1132... OK
  Applying io_storages.0009_auto_20220310_0922... OK
  Applying io_storages.0010_auto_20221014_1708... OK
  Applying io_storages.0011_gcsstoragemixin_google_project_id... OK
  Applying io_storages.0012_auto_20230418_1510... OK
  Applying io_storages.0013_auto_20230420_0259... OK
  Applying io_storages.0014_init_statuses... OK
  Applying io_storages.0015_auto_20230804_1732... OK
  Applying io_storages.0016_add_aws_sse_kms_key... OK
  Applying io_storages.0017_azureserviceprincipalexportstorage_azureserviceprincipalexportstoragelink_azureserviceprincipalimpor... OK
  Applying io_storages.0018_azureserviceprincipalstoragemixin_user_delegation_key... OK
  Applying labels_manager.0001_initial... OK
  Applying labels_manager.0002_auto_20220131_1325... OK
  Applying labels_manager.0003_auto_20221213_1612... OK
  Applying ml_model_providers.0001_initial... OK
  Applying ml_models.0005_auto_20240319_1738... OK
  Applying ml_models.0006_alter_modelrun_project_subset... OK
  Applying sessions.0001_initial... OK
  Applying users.0002_auto_20210308_1559... OK
  Applying users.0003_user_active_organization... OK
  Applying users.0004_auto_20210914_0109... OK
  Applying users.0005_auto_20211010_1339... OK
  Applying users.0006_user_allow_newsletters... OK
  Applying users.0007_user_is_deleted... OK
  Applying users.0008_alter_user_managers... OK
  Applying users.0009_auto_20231201_0001... OK
  Applying webhooks.0001_initial... OK
  Applying webhooks.0002_auto_20220319_0013... OK
  Applying webhooks.0003_alter_webhookaction_action... OK
  Applying webhooks.0004_auto_20221221_1101... OK
2024-06-23 00:00:00,276 botocore.credentials [DEBUG] Looking for credentials via: env
[2024-06-23 00:00:00,276] [botocore.credentials::load_credentials::2053] [DEBUG] Looking for credentials via: env
2024-06-23 00:00:00,276 botocore.credentials [INFO] Found credentials in environment variables.
[2024-06-23 00:00:00,276] [botocore.credentials::load::1127] [INFO] Found credentials in environment variables.
String {"id": 1, "result": [{"from_name": "label", "to_name": "image", "type": "choices", "value": {"choices": ["pos"]}}], "created_username": " test_suites_user@heartex.com, 1", "created_ago": "0\u00a0minutes", "completed_by": {"id": 1, "first_name": "", "last_name": "", "email": "test_suites_user@heartex.com"}, "task": {"id": 1, "data": {"image_url": "http://test.heartex.com/my_super_image.jpg"}, "meta": {}, "created_at": "2024-06-23T00:00:01.036300Z", "updated_at": "2024-06-23T00:00:01.036311Z", "is_labeled": true, "overlap": 1, "inner_id": 2, "total_annotations": 1, "cancelled_annotations": 0, "total_predictions": 0, "comment_count": 0, "unresolved_comment_count": 0, "last_comment_updated_at": null, "project": 1, "updated_by": null, "file_upload": null, "comment_authors": []}, "was_cancelled": false, "ground_truth": false, "created_at": "2024-06-23T00:00:01.051661Z", "updated_at": "2024-06-23T00:00:01.051677Z", "draft_created_at": null, "lead_time": 12.34, "import_id": null, "last_action": null, "project": 1, "updated_by": 1, "parent_prediction": null, "parent_annotation": null, "last_created_by": null} uploaded to bucket test-container
[2024-06-23 00:00:01,089] [django.request::log_response::224] [WARNING] Bad Request: /api/storages/export/azure/1/sync
[2024-06-23 00:00:01,089] [django.request::log_response::224] [WARNING] Bad Request: /api/storages/export/azure/1/sync
PASSEDDestroying test database for alias 'default' ('file:memorydb_default?mode=memory&cache=shared')...


spi:::

label-studio-py3.10u1214742@USNYCGLQ004Q0VC label_studio % DJANGO_DB=sqlite DJANGO_SETTINGS_MODULE=core.settings.label_studio pytest  tests/io_storages.tavern.yml::test_export_azure_storage_service_principal -vv -ss
=> Database and media directory: /Users/u1214742/Library/Application Support/label-studio
=> Static URL is set to: /static/
Read environment variables from: /Users/u1214742/Library/Application Support/label-studio/.env
get 'SECRET_KEY' casted as '<class 'str'>' with default ''
Starting new HTTPS connection (1): pypi.org:443
https://pypi.org:443 "GET /pypi/label-studio/json HTTP/1.1" 200 32193

 Your requests version is under 2.28 and it does not support HEADER_VALIDATORS.

====================================================== test session starts ======================================================
platform darwin -- Python 3.10.12, pytest-7.2.2, pluggy-1.5.0 -- /Users/u1214742/Library/Caches/pypoetry/virtualenvs/label-studio-D2Dtkonh-py3.10/bin/python
cachedir: .pytest_cache
django: settings: core.settings.label_studio (from env)
rootdir: /Users/u1214742/Library/CloudStorage/OneDrive-MMC/2023_OneDrive/Documents/DE_code/label-studio/label_studio, configfile: pytest.ini
plugins: cov-2.12.1, tavern-2.3.0, xdist-2.5.0, env-0.6.2, anyio-4.4.0, django-4.1.0, mock-1.10.3, forked-1.6.0, requests-mock-1.12.1
collected 1 item

tests/io_storages.tavern.yml::test_export_azure_storage_service_principal Creating test database for alias 'default' ('file:memorydb_default?mode=memory&cache=shared')...
Operations to perform:
  Synchronize unmigrated apps: annoying, corsheaders, django_extensions, django_filters, drf_generators, drf_yasg, humanize, messages, rest_framework, rules, staticfiles
  Apply all migrations: admin, auth, authtoken, contenttypes, core, data_export, data_import, data_manager, django_rq, io_storages, labels_manager, ml, ml_model_providers, ml_models, organizations, projects, sessions, tasks, users, webhooks
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0001_initial... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying auth.0008_alter_user_username_max_length... OK
  Applying auth.0009_alter_user_last_name_max_length... OK
  Applying users.0001_squashed_0009_auto_20210219_1237... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying auth.0010_alter_group_name_max_length... OK
  Applying auth.0011_update_proxy_permissions... OK
  Applying auth.0012_alter_user_first_name_max_length... OK
  Applying authtoken.0001_initial... OK
  Applying authtoken.0002_auto_20160226_1747... OK
  Applying authtoken.0003_tokenproxy... OK
  Applying organizations.0001_squashed_0008_auto_20201005_1552... OK
  Applying projects.0001_squashed_0065_auto_20210223_2014... OK
  Applying projects.0002_auto_20210304_1457... OK
  Applying projects.0003_project_color... OK
  Applying projects.0004_auto_20210306_0506... OK
  Applying projects.0003_auto_20210305_1008... OK
  Applying projects.0005_merge_20210308_1141... OK
  Applying projects.0006_auto_20210308_1559... OK
  Applying projects.0007_auto_20210309_1304... OK
  Applying projects.0008_auto_20210314_1840... OK
  Applying projects.0009_project_evaluate_predictions_automatically... OK
  Applying projects.0010_auto_20210505_2037... OK
  Applying projects.0011_auto_20210517_2101... OK
  Applying projects.0012_auto_20210906_1323... OK
  Applying projects.0013_project_reveal_preannotations_interactively... OK
  Applying projects.0014_project_parsed_label_config... OK
  Applying projects.0013_project_skip_queue... OK
  Applying projects.0015_merge_20220117_0749... OK
  Applying projects.0016_auto_20220211_2218... OK
  Applying core.0001_initial... OK
  Applying projects.0017_project_pinned_at... OK
  Applying projects.0018_alter_project_control_weights... OK
  Applying projects.0019_labelstreamhistory... OK
  Applying projects.0020_labelstreamhistory_unique_history... OK
  Applying projects.0019_project_project_pinned__a39ccb_idx... OK
  Applying projects.0021_merge_20230215_1943... OK
  Applying organizations.0002_auto_20210310_2044... OK
  Applying organizations.0003_auto_20211010_1339... OK
  Applying data_export.0001_initial... OK
  Applying data_export.0002_auto_20210921_0954... OK
  Applying data_export.0003_auto_20211004_1416... OK
  Applying data_export.0004_auto_20211019_0852... OK
  Applying data_export.0005_auto_20211025_1137... OK
  Applying data_export.0006_convertedformat... OK
  Applying data_export.0007_auto_20230327_1910... OK
  Applying data_export.0008_convertedformat_traceback... OK
  Applying data_export.0009_alter_convertedformat_traceback... OK
  Applying data_export.0010_alter_convertedformat_export_type... OK
  Applying data_import.0001_initial... OK
  Applying data_import.0002_alter_fileupload_file... OK
  Applying tasks.0001_squashed_0041_taskcompletionhistory_was_cancelled... OK
  Applying tasks.0002_auto_20210305_2035... OK
  Applying io_storages.0001_squashed_0002_auto_20210302_1827... OK
  Applying tasks.0002_auto_20210304_1423... OK
  Applying tasks.0003_merge_20210308_1141... OK
  Applying tasks.0004_auto_20210308_1559... OK
  Applying tasks.0005_auto_20210309_1239... OK
  Applying tasks.0006_remove_annotation_state... OK
  Applying tasks.0007_auto_20210618_1653... OK
  Applying tasks.0008_auto_20210903_1332... OK
  Applying tasks.0009_auto_20210914_0020... OK
  Applying tasks.0010_auto_20210914_0032... OK
  Applying tasks.0009_auto_20210913_0739... OK
  Applying tasks.0011_merge_20210914_1036... OK
  Applying tasks.0012_auto_20211010_1339... OK
  Applying tasks.0013_task_updated_by... OK
  Applying tasks.0014_task_inner_id... OK
  Applying tasks.0015_task_fill_inner_id... OK
  Applying tasks.0016_auto_20220414_1408... OK
  Applying tasks.0017_auto_20220330_1310... OK
  Applying tasks.0018_manual_migrate_counters... OK
  Applying tasks.0017_new_index_anno_result... OK
  Applying tasks.0019_merge_20220512_2038... OK
  Applying tasks.0020_auto_20220515_2332... OK
  Applying tasks.0021_auto_20220515_2358... OK
  Applying tasks.0020_auto_20220516_0545... OK
  Applying tasks.0022_merge_20220517_1128... OK
  Applying tasks.0023_auto_20220620_1007... OK
  Applying data_manager.0001_squashed_0005_view_user... OK
  Applying data_manager.0002_remove_annotations_ids... OK
  Applying data_manager.0003_remove_predictions_model_versions... OK
  Applying data_manager.0004_remove_avg_lead_time... OK
  Applying data_manager.0005_remove_updated_by... OK
  Applying data_manager.0006_remove_inner_id... OK
  Applying data_manager.0007_auto_20220708_0832... OK
  Applying data_manager.0008_manual_counters_update... OK
  Applying data_manager.0009_alter_view_user... OK
  Applying data_manager.0010_auto_20230718_1423... OK
  Applying django_rq.0001_initial... OK
  Applying tasks.0024_manual_migrate_counters_again... OK
  Applying tasks.0025_auto_20220721_0110... OK
  Applying tasks.0026_auto_20220725_1705... OK
  Applying tasks.0027_auto_20220801_1728... OK
  Applying tasks.0028_auto_20220802_2220... OK
  Applying tasks.0029_annotation_project... OK
  Applying tasks.0030_auto_20221102_1118... OK
  Applying tasks.0031_alter_task_options... OK
  Applying tasks.0032_annotation_updated_by... OK
  Applying tasks.0033_annotation_updated_by_fill... OK
  Applying tasks.0034_annotation_unique_id... OK
  Applying tasks.0035_tasklock_unique_id... OK
  Applying tasks.0036_auto_20221223_1102... OK
  Applying tasks.0034_auto_20221221_1101... OK
  Applying tasks.0035_auto_20221221_1116... OK
  Applying tasks.0037_merge_0035_auto_20221221_1116_0036_auto_20221223_1102... OK
  Applying tasks.0038_auto_20230209_1412... OK
  Applying tasks.0039_annotation_draft_created_at... OK
  Applying tasks.0040_auto_20230628_1101... OK
  Applying projects.0022_projectimport... OK
  Applying projects.0023_projectreimport... OK
  Applying projects.0022_projectsummary_created_labels_drafts... OK
  Applying projects.0023_merge_20230512_1333... OK
  Applying projects.0024_merge_0023_merge_20230512_1333_0023_projectreimport... OK
  Applying tasks.0041_prediction_project... OK
  Applying tasks.0042_auto_20230810_2304... OK
  Applying tasks.0043_auto_20230825... OK
  Applying tasks.0044_auto_20230907_0155... OK
  Applying tasks.0045_auto_20231124_1238... OK
  Applying projects.0025_project_label_config_hash... OK
  Applying projects.0026_auto_20231103_0020... OK
  Applying organizations.0004_organization_contact_info... OK
  Applying organizations.0005_organizationmember_deleted_at... OK
  Applying organizations.0006_alter_organizationmember_deleted_at... OK
  Applying ml_models.0001_initial... OK
  Applying ml_models.0002_modelrun... OK
  Applying ml_models.0003_auto_20240228_2228... OK
  Applying ml_models.0004_modelrun_job_id... OK
  Applying tasks.0046_prediction_model_run... OK
  Applying ml.0001_initial... OK
  Applying ml.0002_auto_20210308_1559... OK
  Applying ml.0003_auto_20210309_1239... OK
  Applying ml.0004_auto_20210820_1610... OK
  Applying ml.0005_auto_20211010_1344... OK
  Applying ml.0006_mlbackend_auto_update... OK
  Applying ml.0007_auto_20240314_1957... OK
  Applying tasks.0046_auto_20240314_1957... OK
  Applying tasks.0047_merge_20240318_2210... OK
  Applying io_storages.0002_auto_20210311_0530... OK
  Applying io_storages.0003_localfilesimportstorage... OK
  Applying io_storages.0004_gcsstoragemixin_google_application_credentials... OK
  Applying io_storages.0005_s3importstorage_recursive_scan... OK
  Applying io_storages.0006_auto_20210906_1323... OK
  Applying io_storages.0007_auto_20210928_1252... OK
  Applying io_storages.0008_auto_20211129_1132... OK
  Applying io_storages.0009_auto_20220310_0922... OK
  Applying io_storages.0010_auto_20221014_1708... OK
  Applying io_storages.0011_gcsstoragemixin_google_project_id... OK
  Applying io_storages.0012_auto_20230418_1510... OK
  Applying io_storages.0013_auto_20230420_0259... OK
  Applying io_storages.0014_init_statuses... OK
  Applying io_storages.0015_auto_20230804_1732... OK
  Applying io_storages.0016_add_aws_sse_kms_key... OK
  Applying io_storages.0017_azureserviceprincipalexportstorage_azureserviceprincipalexportstoragelink_azureserviceprincipalimpor... OK
  Applying io_storages.0018_azureserviceprincipalstoragemixin_user_delegation_key... OK
  Applying labels_manager.0001_initial... OK
  Applying labels_manager.0002_auto_20220131_1325... OK
  Applying labels_manager.0003_auto_20221213_1612... OK
  Applying ml_model_providers.0001_initial... OK
  Applying ml_models.0005_auto_20240319_1738... OK
  Applying ml_models.0006_alter_modelrun_project_subset... OK
  Applying sessions.0001_initial... OK
  Applying users.0002_auto_20210308_1559... OK
  Applying users.0003_user_active_organization... OK
  Applying users.0004_auto_20210914_0109... OK
  Applying users.0005_auto_20211010_1339... OK
  Applying users.0006_user_allow_newsletters... OK
  Applying users.0007_user_is_deleted... OK
  Applying users.0008_alter_user_managers... OK
  Applying users.0009_auto_20231201_0001... OK
  Applying webhooks.0001_initial... OK
  Applying webhooks.0002_auto_20220319_0013... OK
  Applying webhooks.0003_alter_webhookaction_action... OK
  Applying webhooks.0004_auto_20221221_1101... OK
2024-06-23 00:22:05,546 botocore.credentials [DEBUG] Looking for credentials via: env
[2024-06-23 00:22:05,546] [botocore.credentials::load_credentials::2053] [DEBUG] Looking for credentials via: env
2024-06-23 00:22:05,547 botocore.credentials [INFO] Found credentials in environment variables.
[2024-06-23 00:22:05,547] [botocore.credentials::load::1127] [INFO] Found credentials in environment variables.
[2024-06-23 00:22:06,290] [core.utils.common::custom_exception_handler::91] [ERROR] 6c025e12-e3d4-4e0c-b99f-e2915022505f {'non_field_errors': [ErrorDetail(string='', code='invalid')]}
Traceback (most recent call last):
  File "/Users/u1214742/Library/Caches/pypoetry/virtualenvs/label-studio-D2Dtkonh-py3.10/lib/python3.10/site-packages/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
  File "/Users/u1214742/Library/Caches/pypoetry/virtualenvs/label-studio-D2Dtkonh-py3.10/lib/python3.10/site-packages/django/utils/decorators.py", line 43, in _wrapper
    return bound_method(*args, **kwargs)
  File "/Users/u1214742/Library/Caches/pypoetry/virtualenvs/label-studio-D2Dtkonh-py3.10/lib/python3.10/site-packages/rest_framework/generics.py", line 242, in post
    return self.create(request, *args, **kwargs)
  File "/Users/u1214742/Library/Caches/pypoetry/virtualenvs/label-studio-D2Dtkonh-py3.10/lib/python3.10/site-packages/rest_framework/mixins.py", line 18, in create
    serializer.is_valid(raise_exception=True)
  File "/Users/u1214742/Library/Caches/pypoetry/virtualenvs/label-studio-D2Dtkonh-py3.10/lib/python3.10/site-packages/rest_framework/serializers.py", line 235, in is_valid
    raise ValidationError(self.errors)
rest_framework.exceptions.ValidationError: {'non_field_errors': [ErrorDetail(string='', code='invalid')]}
[2024-06-23 00:22:06,292] [django.request::log_response::224] [WARNING] Bad Request: /api/storages/export/azure_spi
[2024-06-23 00:22:06,292] [django.request::log_response::224] [WARNING] Bad Request: /api/storages/export/azure_spi
Status code was 400, expected 201:
    {"id": "6c025e12-e3d4-4e0c-b99f-e2915022505f", "status_code": 400, "version": "1.12.2.dev0", "detail": "Validation error", "exc_info": null, "validation_errors": {"non_field_errors": [""]}}
FAILEDDestroying test database for alias 'default' ('file:memorydb_default?mode=memory&cache=shared')...


spi other:
data
OrderedDict([('synchronizable', True), ('presign', True), ('use_blob_urls', True), ('container', 'pytest-azure_spi-images'), ('title', 'Testing Azure_spi storage (bucket from conftest.py)'), ('project', <Project: test_azure_spi_storage (id=1)>)])
initial_data
<QueryDict: {'container': ['pytest-azure_spi-images'], 'project': ['1'], 'title': ['Testing Azure_spi storage (bucket from conftest.py)'], 'use_blob_urls': ['True']}>

spi now:
<QueryDict: {'container': ['pytest-azure_spi-images'], 'project': ['1'], 'title': ['Testing Azure_spi storage (bucket from conftest.py)'], 'use_blob_urls': ['True']}>

OrderedDict([('synchronizable', True), ('presign', True), ('use_blob_urls', True), ('container', 'pytest-azure_spi-images'), ('title', 'Testing Azure_spi storage (bucket from conftest.py)'), ('project', <Project: test_azure_spi_storage (id=1)>), ('client_secret', None)])
