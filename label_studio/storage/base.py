from abc import ABC, abstractmethod


_storage = {}


def register_storage(storage_type, class_def):
    if storage_type in _storage:
        raise IndexError('Storage {} already exists'.format(storage_type))
    _storage[storage_type] = class_def


def create_storage(storage_type, path, project_path=None, **kwargs):
    if storage_type not in _storage:
        raise NotImplementedError('Can\'t create storage "{}"'.format(storage_type))
    return _storage[storage_type](path=path, project_path=project_path, **kwargs)


class BaseStorage(ABC):

    def __init__(self, path, project_path=None, **kwargs):
        self.path = path
        self.project_path = project_path

    @property
    @abstractmethod
    def readable_path(self):
        pass

    @classmethod
    def from_dict(cls, d):
        return cls(**d)

    @abstractmethod
    def get(self, id):
        pass

    @abstractmethod
    def __contains__(self, id):
        pass

    @abstractmethod
    def set(self, id, value):
        pass

    @abstractmethod
    def set_many(self, ids, values):
        pass

    @abstractmethod
    def ids(self):
        pass

    @abstractmethod
    def max_id(self):
        pass

    @abstractmethod
    def items(self):
        pass

    @abstractmethod
    def remove(self, id):
        pass

    @abstractmethod
    def remove_all(self):
        pass

    @abstractmethod
    def empty(self):
        pass
