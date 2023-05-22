import hashlib

def create_file_id(name, manufacturer, version, block_size=256):
    """
    Function that creates a unique file id.

    :param name (str)
    :param manufacturer (str)
    :param version (float or int)
    :return: unique hash for a sensor
    """
    input_string = name + manufacturer + str(version)
    hashed = hashlib.sha256(input_string.encode()).hexdigest()
    return hashed[:10]



        