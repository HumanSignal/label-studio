import os
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage
from django.conf import settings
from urllib.parse import unquote, urldefrag, urlsplit, urlunsplit

from core.feature_flags import flag_set
from storages.backends.s3boto3 import S3Boto3Storage
from storages.backends.azure_storage import AzureStorage


class SkipMissedManifestStaticFilesStorage(ManifestStaticFilesStorage):
    """ We need this class to escape missing files from
    django.contrib.staticfiles.finders.FileSystemFinder:
    this class tries to find js/css/png/jpg/... inside of you js/css/...
    """

    # Disable strict cache manifest checking
    manifest_strict = False

    def hashed_name(self, name, content=None, filename=None):
        # `filename` is the name of file to hash if `content` isn't given.
        # `name` is the base name to construct the new hashed filename from.
        parsed_name = urlsplit(unquote(name))
        clean_name = parsed_name.path.strip()
        filename = (filename and urlsplit(unquote(filename)).path.strip()) or clean_name
        opened = content is None
        if opened:
            if not self.exists(filename):
                return ''
            try:
                content = self.open(filename)
            except IOError:
                # Handle directory paths and fragments
                return name
        try:
            file_hash = self.file_hash(clean_name, content)
        finally:
            if opened:
                content.close()
        path, filename = os.path.split(clean_name)
        root, ext = os.path.splitext(filename)
        if file_hash is not None:
            file_hash = ".%s" % file_hash
        hashed_name = os.path.join(path, "%s%s%s" %
                                   (root, file_hash, ext))
        unparsed_name = list(parsed_name)
        unparsed_name[2] = hashed_name
        # Special casing for a @font-face hack, like url(myfont.eot?#iefix")
        # http://www.fontspring.com/blog/the-new-bulletproof-font-face-syntax
        if '?#' in name and not unparsed_name[3]:
            unparsed_name[2] += '?'
        return urlunsplit(unparsed_name)


class StorageProxyMixin:
    def url(self, name, storage_url=False, *args, **kwargs):
        if flag_set('ff_back_dev_2915_storage_nginx_proxy_26092022_short'):
            if storage_url is True:
                return super().url(name, *args, **kwargs)
            return f'{settings.HOSTNAME}/storage-data/uploaded/?filepath={name}'
        else:
            return super().url(name, *args, **kwargs)


class CustomS3Boto3Storage(StorageProxyMixin, S3Boto3Storage):
    pass


class CustomAzureStorage(StorageProxyMixin, AzureStorage):
    pass
