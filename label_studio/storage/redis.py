import json
import os
import logging
from copy import deepcopy
import redis
from pathlib import PurePath

from label_studio.utils.io import json_load, delete_dir_content, iter_files
from .base import BaseStorage, BaseForm, CloudStorage, StringField, Optional


logger = logging.getLogger(__name__)

def get_redis_connection(db = None):
    if not db:
        # This should never happen, but better to check than to accidentally 
        # overwrite an existing database by choosing a wrong default:
        logger.error("No redis db id passed!")
    # Since tasks are always text, we use StrictRedis with utf decoding.
    return redis.StrictRedis(db=db, charset="utf-8", decode_responses=True)

class RedisStorageForm(BaseForm):
    path = StringField('Path', description='Storage prefix')

    # Bind here form fields to storage fields {"form field": "storage_field"}
    bound_params = dict(path='path')


class RedisStorage(BaseStorage):
    """Storage class for a redis database connection. 
    
    Inherits from BaseStorage.

    Conventions:
    A redis server hosts multiple, enumerated databases (0,1,2...)
    The database used for storage should ONLY contain tasks. Any data already
    in there might be lost / overwritten at any point in time and / or break
    the functionality.

    All keys are integers, but redis saves them as strings, so we sometimes
    need to convert. The redis key is our prefix (e.g. "my_project/") + the 
    labelstudio key as string (e.g. "3").

    Example: If path is defined as "my_project", calling set(1, my_val) will
    write to 
    my_project/1 (the "/" is added if not already in path)
    
    Values are python dicts encoded as utf-8 strings.
    """

    description = 'Redis task database'
    
    form = RedisStorageForm

    def __init__(self, project_path, path=None, db=1, **kwargs):
        """Initialize the storage.

        If no path is provided manually (None or empty string), the 
        project_path is instead used.

        By default, redis db 1 is used, expect if this is overwritten manually

        Args:
            project_path (str): Labelstudio project path
            path (str or None, optional): The path that is used as a prefix. 
                                          Defaults to None.
        """        
        
        # Check if a path was manually provided as an input parameter:
        if not path or len(path) == 0: 
            path = project_path

        # Append "/" to path if necessary:
        path = path.rstrip("/")+"/"
        
        super().__init__(path=path, project_path=project_path, **kwargs)

        # Get redis database object and test connection:
        # database 0 is used by default and might contain other stuff,
        # so we use 1 instead to add an extra layer of safety.
        self.r = get_redis_connection(db=db)
        if not self.r.ping():
            logger.error("Redis connection could not be established")


    def fullkey(self, key):
        # Convert a key (which can be an int or a string containing one) to 
        # the full path in redis, e.g. username/projectid/key
        return self.path + str(key)

    def fullkey_to_key(self, fullkey):
        # Return just the key, as int.
        return int(fullkey[len(self.path):])

    @property
    def readable_path(self):
        return self.path

    def get(self, key):
        value = self.r.get(self.fullkey(key))
        if not value:
            return None
        return json.loads(value)

    def set(self, key, value):
        self.r.set(self.fullkey(key), json.dumps(value))
        #TODO Raise flag to save async?

    def __contains__(self, key):
        return self.r.exists(self.fullkey(key))

    def set_many(self, keys, values):
        for key, value in zip(keys, values):
            self.r.set(self.fullkey(key), json.dumps(value))
        #TODO: Maybe save async?

    def ids(self):
        # We find all keys for this project by filtering the path, even though
        # it is just part of the name. Similar to blob storage.
        fullkeys = self.r.keys(self.path+"*")
        keys = [self.fullkey_to_key(fk) for fk in fullkeys]
        return keys

    def max_id(self):
        return max(self.ids(), default=-1)

    def items(self):
        # This is an expensive operations since it attempts to load all items!
        # It is luckily rarely used.
        all_data = {key: self.get(key) for key in self.ids()}
        return all_data.items()

    def remove(self, key):
        self.r.delete(self.fullkey(key))
        #TODO: Sync ?self._save()

    def remove_all(self):
        for key in self.ids():
            self.remove(key)
        # Sync?

    def empty(self):
        return len(self.ids()) == 0

    def sync(self):
        pass



class RedisCompletionsStorage(RedisStorage):
    """ Completions storage connector for redis.

    Basically the exact same code as the task storage, but with db=2 as default.
    """

    description = 'Redis Completions Storage'

    def __init__(self, project_path, path=None, db=2, **kwargs):

        logger.debug("Creating RedisCompletionStorage.")
        
        # Call parent:
        super(RedisCompletionsStorage, self).__init__(path=path, project_path=project_path, db=db, **kwargs)
