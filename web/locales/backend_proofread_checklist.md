# 后端翻译校对清单
生成自 `web/locales/extracted_backend_messages_zh-CN.auto.json`。

## 一：空翻译（需要人工翻译）

- **Directory indexes are not allowed here.**
  Occurrences: label_studio/core/utils/static_serve.py
- **“%(path)s” does not exist**
  Occurrences: label_studio/core/utils/static_serve.py
- **md5 of file**
  Occurrences: label_studio/data_export/models.py
- **Export status**
  Occurrences: label_studio/data_export/models.py
- **Exporting meta data**
  Occurrences: label_studio/data_export/models.py
- **data**
  Occurrences: label_studio/data_manager/models.py
- **ordering**
  Occurrences: label_studio/data_manager/models.py
- **order**
  Occurrences: label_studio/data_manager/models.py
- **selected items**
  Occurrences: label_studio/data_manager/models.py
- **conjunction**
  Occurrences: label_studio/data_manager/models.py
- **index**
  Occurrences: label_studio/data_manager/models.py
- **column**
  Occurrences: label_studio/data_manager/models.py
- **type**
  Occurrences: label_studio/data_manager/models.py
- **operator**
  Occurrences: label_studio/data_manager/models.py
- **value**
  Occurrences: label_studio/data_manager/models.py
- **Submitted**
  Occurrences: label_studio/fsm/state_choices.py, label_studio/tasks/choices.py
- **Initialized**
  Occurrences: label_studio/io_storages/base_models.py
- **Queued**
  Occurrences: label_studio/io_storages/base_models.py
- **last sync**
  Occurrences: label_studio/io_storages/base_models.py
- **last sync count**
  Occurrences: label_studio/io_storages/base_models.py
- **last_sync_job**
  Occurrences: label_studio/io_storages/base_models.py
- **synchronizable**
  Occurrences: label_studio/io_storages/base_models.py
- **can_delete_objects**
  Occurrences: label_studio/io_storages/base_models.py
- **key**
  Occurrences: label_studio/io_storages/base_models.py
- **object exists**
  Occurrences: label_studio/io_storages/base_models.py, label_studio/io_storages/base_models.py
- **container**
  Occurrences: label_studio/io_storages/azure_blob/models.py
- **prefix**
  Occurrences: label_studio/io_storages/azure_blob/models.py, label_studio/io_storages/gcs/models.py, label_studio/io_storages/s3/models.py
- **regex_filter**
  Occurrences: label_studio/io_storages/azure_blob/models.py, label_studio/io_storages/gcs/models.py, label_studio/io_storages/localfiles/models.py ...
- **use_blob_urls**
  Occurrences: label_studio/io_storages/azure_blob/models.py, label_studio/io_storages/gcs/models.py, label_studio/io_storages/localfiles/models.py ...
- **account_name**
  Occurrences: label_studio/io_storages/azure_blob/models.py
- **account_key**
  Occurrences: label_studio/io_storages/azure_blob/models.py
- **presign**
  Occurrences: label_studio/io_storages/azure_blob/models.py, label_studio/io_storages/gcs/models.py, label_studio/io_storages/s3/models.py
- **presign_ttl**
  Occurrences: label_studio/io_storages/azure_blob/models.py, label_studio/io_storages/gcs/models.py, label_studio/io_storages/s3/models.py
- **recursive scan**
  Occurrences: label_studio/io_storages/azure_blob/models.py, label_studio/io_storages/gcs/models.py, label_studio/io_storages/localfiles/models.py ...
- **Perform recursive scan over the container content**
  Occurrences: label_studio/io_storages/azure_blob/models.py
- **bucket**
  Occurrences: label_studio/io_storages/gcs/models.py, label_studio/io_storages/s3/models.py
- **google_application_credentials**
  Occurrences: label_studio/io_storages/gcs/models.py
- **Perform recursive scan over the bucket content**
  Occurrences: label_studio/io_storages/gcs/models.py, label_studio/io_storages/s3/models.py
- **path**
  Occurrences: label_studio/io_storages/localfiles/models.py, label_studio/io_storages/redis/models.py
- **Perform recursive scan over the directory content**
  Occurrences: label_studio/io_storages/localfiles/models.py
- **host**
  Occurrences: label_studio/io_storages/redis/models.py
- **port**
  Occurrences: label_studio/io_storages/redis/models.py, label_studio/io_storages/redis/models.py
- **db**
  Occurrences: label_studio/io_storages/redis/models.py, label_studio/io_storages/redis/models.py
- **aws_access_key_id**
  Occurrences: label_studio/io_storages/s3/models.py
- **aws_secret_access_key**
  Occurrences: label_studio/io_storages/s3/models.py
- **aws_session_token**
  Occurrences: label_studio/io_storages/s3/models.py
- **aws_sse_kms_key_id**
  Occurrences: label_studio/io_storages/s3/models.py
- **region_name**
  Occurrences: label_studio/io_storages/s3/models.py
- **s3_endpoint**
  Occurrences: label_studio/io_storages/s3/models.py
- **JWT API tokens enabled**
  Occurrences: label_studio/jwt_auth/models.py
- **legacy API tokens enabled**
  Occurrences: label_studio/jwt_auth/models.py
- **Connected**
  Occurrences: label_studio/ml/models.py
- **Disconnected**
  Occurrences: label_studio/ml/models.py
- **Error**
  Occurrences: label_studio/ml/models.py
- **Training**
  Occurrences: label_studio/ml/models.py
- **Predicting**
  Occurrences: label_studio/ml/models.py
- **None**
  Occurrences: label_studio/ml/models.py
- **Basic Auth**
  Occurrences: label_studio/ml/models.py
- **is_interactive**
  Occurrences: label_studio/ml/models.py
- **error_message**
  Occurrences: label_studio/ml/models.py
- **basic auth user**
  Occurrences: label_studio/ml/models.py
- **model version**
  Occurrences: label_studio/ml/models.py, label_studio/ml/models.py, label_studio/ml/models.py ...
- **timeout**
  Occurrences: label_studio/ml/models.py
- **auto_update**
  Occurrences: label_studio/ml/models.py
- **batch size**
  Occurrences: label_studio/ml/models.py
- **TextClassification**
  Occurrences: label_studio/ml_models/models.py
- **NamedEntityRecognition**
  Occurrences: label_studio/ml_models/models.py
- **prompt**
  Occurrences: label_studio/ml_models/models.py
- **HasGT**
  Occurrences: label_studio/ml_models/models.py
- **Sample**
  Occurrences: label_studio/ml_models/models.py
- **Input**
  Occurrences: label_studio/ml_models/models.py
- **Output**
  Occurrences: label_studio/ml_models/models.py
- **Pending**
  Occurrences: label_studio/ml_models/models.py
- **InProgress**
  Occurrences: label_studio/ml_models/models.py
- **triggered at**
  Occurrences: label_studio/ml_models/models.py
- **OpenAI**
  Occurrences: label_studio/ml_model_providers/models.py
- **AzureOpenAI**
  Occurrences: label_studio/ml_model_providers/models.py
- **AzureAIFoundry**
  Occurrences: label_studio/ml_model_providers/models.py
- **VertexAI**
  Occurrences: label_studio/ml_model_providers/models.py
- **Gemini**
  Occurrences: label_studio/ml_model_providers/models.py
- **Anthropic**
  Occurrences: label_studio/ml_model_providers/models.py
- **Custom**
  Occurrences: label_studio/ml_model_providers/models.py
- **Organization**
  Occurrences: label_studio/ml_model_providers/models.py
- **User**
  Occurrences: label_studio/ml_model_providers/models.py
- **Model**
  Occurrences: label_studio/ml_model_providers/models.py
- **api_key**
  Occurrences: label_studio/ml_model_providers/models.py
- **auth_token**
  Occurrences: label_studio/ml_model_providers/models.py
- **google application credentials**
  Occurrences: label_studio/ml_model_providers/models.py
- **google location**
  Occurrences: label_studio/ml_model_providers/models.py
- **is_internal**
  Occurrences: label_studio/ml_model_providers/models.py
- **budget_limit**
  Occurrences: label_studio/ml_model_providers/models.py
- **budget_last_reset_date**
  Occurrences: label_studio/ml_model_providers/models.py
- **budget_reset_period**
  Occurrences: label_studio/ml_model_providers/models.py
- **budget_total_spent**
  Occurrences: label_studio/ml_model_providers/models.py
- **budget_alert_threshold**
  Occurrences: label_studio/ml_model_providers/models.py
- **deleted at**
  Occurrences: label_studio/organizations/models.py, label_studio/projects/models.py
- **created_by**
  Occurrences: label_studio/organizations/models.py
- **contact info**
  Occurrences: label_studio/organizations/models.py
- **label config**
  Occurrences: label_studio/projects/models.py
- **parsed label config**
  Occurrences: label_studio/projects/models.py
- **expert instruction**
  Occurrences: label_studio/projects/models.py
- **show instruction**
  Occurrences: label_studio/projects/models.py
- **show skip button**
  Occurrences: label_studio/projects/models.py
- **reveal_preannotations_interactively**
  Occurrences: label_studio/projects/models.py
- **color**
  Occurrences: label_studio/projects/models.py
- **min_annotations_to_start_training**
  Occurrences: label_studio/projects/models.py
- **control weights**
  Occurrences: label_studio/projects/models.py
- **data_types**
  Occurrences: label_studio/projects/models.py
- **is draft**
  Occurrences: label_studio/projects/models.py
- **published**
  Occurrences: label_studio/projects/models.py
- **show ground truth first**
  Occurrences: label_studio/projects/models.py
- **annotator evaluation enabled**
  Occurrences: label_studio/projects/models.py
- **overlap_cohort_percentage**
  Occurrences: label_studio/projects/models.py
- **task_data_login**
  Occurrences: label_studio/projects/models.py
- **task_data_password**
  Occurrences: label_studio/projects/models.py
- **pinned at**
  Occurrences: label_studio/projects/models.py
- **custom_task_lock_ttl**
  Occurrences: label_studio/projects/models.py
- **deleted by**
  Occurrences: label_studio/projects/models.py
- **purge at**
  Occurrences: label_studio/projects/models.py
- **Business number %d**
  Occurrences: label_studio/projects/models.py
- **common data columns**
  Occurrences: label_studio/projects/models.py
- **Max time (minutes) between activity**
  Occurrences: label_studio/session_policy/models.py
- **Imported**
  Occurrences: label_studio/tasks/choices.py
- **Skipped**
  Occurrences: label_studio/tasks/choices.py, label_studio/users/product_tours/models.py
- **Accepted**
  Occurrences: label_studio/tasks/choices.py
- **Rejected**
  Occurrences: label_studio/tasks/choices.py
- **Fixed and accepted**
  Occurrences: label_studio/tasks/choices.py
- **Deleted review**
  Occurrences: label_studio/tasks/choices.py
- **is_labeled**
  Occurrences: label_studio/tasks/models.py
- **inner id**
  Occurrences: label_studio/tasks/models.py
- **total_annotations**
  Occurrences: label_studio/tasks/models.py
- **cancelled_annotations**
  Occurrences: label_studio/tasks/models.py
- **total_predictions**
  Occurrences: label_studio/tasks/models.py
- **precomputed_agreement**
  Occurrences: label_studio/tasks/models.py
- **comment count**
  Occurrences: label_studio/tasks/models.py
- **unresolved comment count**
  Occurrences: label_studio/tasks/models.py
- **was cancelled**
  Occurrences: label_studio/tasks/models.py
- **ground_truth**
  Occurrences: label_studio/tasks/models.py
- **last action**
  Occurrences: label_studio/tasks/models.py
- **was postponed**
  Occurrences: label_studio/tasks/models.py
- **cluster**
  Occurrences: label_studio/tasks/models.py
- **mislabeling**
  Occurrences: label_studio/tasks/models.py
- **message**
  Occurrences: label_studio/tasks/models.py
- **error_type**
  Occurrences: label_studio/tasks/models.py
- **inference time**
  Occurrences: label_studio/tasks/models.py
- **Time taken for inference in seconds**
  Occurrences: label_studio/tasks/models.py
- **prompt tokens count**
  Occurrences: label_studio/tasks/models.py
- **Number of tokens in the prompt**
  Occurrences: label_studio/tasks/models.py
- **completion tokens count**
  Occurrences: label_studio/tasks/models.py
- **Number of tokens in the completion**
  Occurrences: label_studio/tasks/models.py
- **total tokens count**
  Occurrences: label_studio/tasks/models.py
- **Total number of tokens**
  Occurrences: label_studio/tasks/models.py
- **prompt cost**
  Occurrences: label_studio/tasks/models.py
- **Cost of the prompt**
  Occurrences: label_studio/tasks/models.py
- **completion cost**
  Occurrences: label_studio/tasks/models.py
- **Cost of the completion**
  Occurrences: label_studio/tasks/models.py
- **total cost**
  Occurrences: label_studio/tasks/models.py
- **Total cost**
  Occurrences: label_studio/tasks/models.py
- **Additional metadata in JSON format**
  Occurrences: label_studio/tasks/models.py
- **Create**
  Occurrences: label_studio/templates/standard_form.html
- **year**
  Occurrences: label_studio/users/models.py
- **last activity**
  Occurrences: label_studio/users/models.py
- **phone**
  Occurrences: label_studio/users/models.py
- **custom hotkeys**
  Occurrences: label_studio/users/models.py
- **Custom keyboard shortcuts configuration for the user interface**
  Occurrences: label_studio/users/models.py
- **staff status**
  Occurrences: label_studio/users/models.py
- **Designates whether the user can log into this admin site.**
  Occurrences: label_studio/users/models.py
- **active**
  Occurrences: label_studio/users/models.py
- **Designates whether to treat this user as active. Unselect this instead of deleting accounts.**
  Occurrences: label_studio/users/models.py
- **date joined**
  Occurrences: label_studio/users/models.py
- **user**
  Occurrences: label_studio/users/models.py
- **users**
  Occurrences: label_studio/users/models.py
- **Ready**
  Occurrences: label_studio/users/product_tours/models.py
- **State**
  Occurrences: label_studio/users/product_tours/models.py
- **Interaction Data**
  Occurrences: label_studio/users/product_tours/models.py
- **Creation time**
  Occurrences: label_studio/webhooks/models.py
- **Last update time**
  Occurrences: label_studio/webhooks/models.py
- **Label link deleted**
  Occurrences: label_studio/webhooks/models.py
- **Action value**
  Occurrences: label_studio/webhooks/models.py

## 二：可疑翻译（含英文或部分未翻译—建议人工校对）

- **Completed with errors** → `已完成 with errors`
  Occurrences: label_studio/io_storages/base_models.py
- **Google Project ID** → `Google 项目 ID`
  Occurrences: label_studio/io_storages/gcs/models.py
- **JWT API token time to live (days)** → `JWT API 令牌 time to live (days))`
  Occurrences: label_studio/jwt_auth/models.py
- **Tag name** → `Tag 名称`
  Occurrences: label_studio/labels_manager/models.py
- **url** → `URL`
  Occurrences: label_studio/ml/models.py
- **basic auth password** → `basic auth 密码`
  Occurrences: label_studio/ml/models.py
- **extra params** → `附加信息 params`
  Occurrences: label_studio/ml/models.py
- **total predictions** → `total 预测`
  Occurrences: label_studio/ml_models/models.py
- **total correct predictions** → `total correct 预测`
  Occurrences: label_studio/ml_models/models.py
- **total tasks** → `total 任务`
  Occurrences: label_studio/ml_models/models.py
- **google project id** → `google 项目 id`
  Occurrences: label_studio/ml_model_providers/models.py
- **organization title** → `organization 标题`
  Occurrences: label_studio/organizations/models.py
- **enable empty annotation** → `enable empty 标注`
  Occurrences: label_studio/projects/models.py
- **show annotation history** → `show 标注 history`
  Occurrences: label_studio/projects/models.py
- **show predictions to annotator** → `show 预测 to annotator`
  Occurrences: label_studio/projects/models.py
- **evaluate predictions automatically** → `evaluate 预测 automatically`
  Occurrences: label_studio/projects/models.py
- **maximum annotation number** → `maximum 标注 number`
  Occurrences: label_studio/projects/models.py
- **show overlap first** → `show 重叠 first`
  Occurrences: label_studio/projects/models.py
- **all data columns** → `全部 data columns`
  Occurrences: label_studio/projects/models.py
- **created labels** → `创建 labels`
  Occurrences: label_studio/projects/models.py
- **created labels in drafts** → `创建 labels in drafts`
  Occurrences: label_studio/projects/models.py
- **Max session age (minutes)** → `Max session age (minutes))`
  Occurrences: label_studio/session_policy/models.py
- **Created from prediction** → `创建 from 预测`
  Occurrences: label_studio/tasks/choices.py
- **Created from another annotation** → `创建 from another 标注`
  Occurrences: label_studio/tasks/choices.py
- **last comment updated at** → `last comment 更新 at`
  Occurrences: label_studio/tasks/models.py
- **draft created at** → `draft 创建 at`
  Occurrences: label_studio/tasks/models.py
- **last created by** → `last 创建 by`
  Occurrences: label_studio/tasks/models.py
- **bulk created** → `bulk 创建`
  Occurrences: label_studio/tasks/models.py
- **Reference to the associated prediction** → `Reference to the associated 预测`
  Occurrences: label_studio/tasks/models.py
- **Reference to the associated failed prediction** → `Reference to the associated 失败 预测`
  Occurrences: label_studio/tasks/models.py
- **Prediction Meta** → `预测 Meta`
  Occurrences: label_studio/tasks/models.py
- **Prediction Metas** → `预测 Metas`
  Occurrences: label_studio/tasks/models.py
- **email address** → `电子邮件 address`
  Occurrences: label_studio/users/models.py
- **first name** → `first 名称`
  Occurrences: label_studio/users/models.py
- **last name** → `last 名称`
  Occurrences: label_studio/users/models.py
- **last annotation activity** → `last 标注 activity`
  Occurrences: label_studio/users/models.py
- **allow newsletters** → `允许 newsletters`
  Occurrences: label_studio/users/models.py
- **Please enter a password %(min_length)d–%(max_length)d characters in length.** → `Please enter a 密码 %(min_length)d–%(max_length)d characters in length.`
  Occurrences: label_studio/users/validators.py, label_studio/users/validators.py
- **Your password must be between %(min_length)d and %(max_length)d characters.** → `Your 密码 must be between %(min_length)d and %(max_length)d characters.`
  Occurrences: label_studio/users/validators.py
- **URL of webhook** → `URL of Webhook`
  Occurrences: label_studio/webhooks/models.py, label_studio/webhooks/models.py
- **does webhook send the payload** → `does Webhook send the payload`
  Occurrences: label_studio/webhooks/models.py
- **Use webhook for all actions** → `Use Webhook for 全部 actions`
  Occurrences: label_studio/webhooks/models.py
- **request extra headers of webhook** → `request 附加信息 headers of Webhook`
  Occurrences: label_studio/webhooks/models.py
- **is webhook active** → `is Webhook active`
  Occurrences: label_studio/webhooks/models.py
- **Project deleted** → `项目 deleted`
  Occurrences: label_studio/webhooks/models.py
- **Task deleted** → `任务 deleted`
  Occurrences: label_studio/webhooks/models.py
- **Label link created** → `Label link 创建`
  Occurrences: label_studio/webhooks/models.py
- **Label link updated** → `Label link 更新`
  Occurrences: label_studio/webhooks/models.py
- **action of webhook** → `action of Webhook`
  Occurrences: label_studio/webhooks/models.py

---
说明：自动翻译采用规则/在线工具，质量有限。校对时请优先处理空翻译与含英文的条目。