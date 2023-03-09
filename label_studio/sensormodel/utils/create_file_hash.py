import hashlib
import os

def create_file_id(file_path, block_size=256):
        """
        Function that takes a file and returns the first 10 characters of a hash of
        10 times block size in the middle of the file.

        :param file_path: File path as string
        :param block_size:
        :return: Hash of 10 blocks of 128 bits of size as string plus file size as string.
        """

        file_size = os.path.getsize(file_path)
        start_index = int(file_size / 2)
        with file_path.open(mode='r') as f:
            f.seek(start_index)
            n = 1
            md5 = hashlib.md5()
            while True:
                data = f.read(block_size)
                n += 1
                if n == 10:
                    break
                md5.update(data.encode('utf-8'))
        return '{}{}'.format(md5.hexdigest()[0:9], str(file_size))