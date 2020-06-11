from .base import create_storage, register_storage, get_available_storage_names, get_storage_form
from .filesystem import JSONStorage, DirJSONsStorage, TasksJSONStorage, CompletionsDirStorage, ExternalTasksJSONStorage
from .s3 import S3Storage, S3CompletionsStorage
from .gcs import GCSStorage, GCSCompletionsStorage

register_storage('json', JSONStorage)
register_storage('dir-jsons', DirJSONsStorage)
register_storage('tasks-json', ExternalTasksJSONStorage)
register_storage('completions-dir', CompletionsDirStorage)
register_storage('s3', S3Storage)
register_storage('s3-completions', S3CompletionsStorage)
register_storage('gcs', GCSStorage)
register_storage('gcs-completions', GCSCompletionsStorage)
