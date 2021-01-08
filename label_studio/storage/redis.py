import json
import os
import logging
import redis
from wtforms import StringField, IntegerField

from .base import BaseStorage, BaseForm

logger = logging.getLogger(__name__)

def get_redis_connection(db = None, redis_config={}):
    """Get a redis connection from the provided arguments.

    Args:
        db (int): Database ID of database to use. This needs to 
                  always be provided to prevent accidental overwrite
                  to a default value. Therefore, the default is None,
                  but raises an error if not provided.
        redis_config (dict, optional): Further redis configuration.

    Returns:
        redis.StrictRedis object with connection to database.
    """    
    if not db:
        # This should never happen, but better to check than to accidentally 
        # overwrite an existing database by choosing a wrong default:
        raise ValueError("Please explicitely pass a redis db id to prevent accidentally overwriting existing database!")

    # Since tasks are always text, we use StrictRedis with utf-8 decoding.
    r = redis.StrictRedis(db=db, charset="utf-8", decode_responses=True, **redis_config)
    # Test connection
    # (this will raise redis.exceptions.ConnectionError if it cannot connect)
    r.ping()
    return r


class RedisBaseStorageForm(BaseForm):
    path = StringField('Path', description='Storage prefix (optional)')
    host = StringField('Host', description='Server Host IP (optional)')
    port = StringField('ServerPort', description='Server Port (optional)')
    password = StringField('ServerPassword', description='Server Password (optional)')
    bound_params = dict(path='path', host="host", port="port", password="password")


class RedisStorageForm(RedisBaseStorageForm):
    db = IntegerField('DB', description='Server Database (Must be different from Completions storage!)', default = 1)
    bound_params = dict(db="db", **RedisBaseStorageForm.bound_params)


class RedisCompletionsStorageForm(RedisBaseStorageForm):
    db = IntegerField('DB', description='Server Database (Must be different from Task storage!)', default = 2)
    bound_params = dict(db="db", **RedisBaseStorageForm.bound_params)


class RedisStorage(BaseStorage):
    """Storage class for a redis database connection. 
    
    Inherits from BaseStorage.

    Conventions:
    A redis server hosts multiple, enumerated databases (0,1,2...).
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

    description = 'Redis database connection'
    
    form = RedisStorageForm

    def __init__(self, project_path, path=None, db=1, host=None, port=None,
                 password=None, **kwargs):
        """Initialize the storage.

        If no path is provided manually (None or empty string), the 
        project_path is instead used.

        For Server Host IP, Port and Password, the Redis default values are 
        used if no values are provided. All these values are packed into

        By default, db 1 is used for tasks.

        Args:
            project_path (str): Labelstudio project path
            path (str or None, optional): The path that is used as a prefix. 
                                          Defaults to None.
            db (int): The Redis database to use. Defaults to 1.
            host (str, optional): Redis server host IP. Defaults to None.
            port (str, optional): Redis server port. Defaults to None.
            password (str, optional): Server password. Defaults to None.
        """                  
        
        # Check if a path was manually provided as an input parameter:
        if not path or len(path) == 0: 
            path = project_path

        # Append "/" to path if necessary:
        path = path.rstrip("/")+"/"
        
        super().__init__(path=path, project_path=project_path, **kwargs)

        # This seems clunky, but also seems necessary since templates/tasks.html
        # seems to expect all configuration to be part of the class?
        self.host = host
        self.port = port
        self.password = password
        self.db = db

        # Re-build config from class object:
        # We only want to set params that are not set to "None" so as to not
        # overwrite Redis' default parameters. This is because Redis' default
        # parameters might change in the future and we would have to manually
        # adapt them here, which is a potential source for breakage / errors.
        redis_config = {}
        if self.host: redis_config["host"] = self.host
        if self.port: redis_config["port"] = self.port
        if self.password: redis_config["password"] = self.password

        self.r = get_redis_connection(db=self.db, redis_config=redis_config)


    def fullkey(self, key):
        # Convert a key (which can be an int or a string containing one) to 
        # the full key in redis, e.g. "username/projectid/key"
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

    def __contains__(self, key):
        return self.r.exists(self.fullkey(key))

    def set_many(self, keys, values):
        for key, value in zip(keys, values):
            self.r.set(self.fullkey(key), json.dumps(value))

    def ids(self):
        # We find all keys for this project by filtering the path, even though
        # it is just part of the name.
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

    def remove_all(self):
        for key in self.ids():
            self.remove(key)

    def empty(self):
        return len(self.ids()) == 0

    def sync(self):
        pass



class RedisCompletionsStorage(RedisStorage):
    """ Completions storage connector for redis.

    Basically the exact same code as the task storage, but with db=2 as default.
    """

    description = 'Redis Completions Storage'

    form = RedisCompletionsStorageForm

    def __init__(self, project_path, path=None, db=2, **kwargs):

        logger.debug("Creating RedisCompletionStorage.")
        
        # Call parent:
        super(RedisCompletionsStorage, self).__init__(path=path, project_path=project_path, db=db, **kwargs)
