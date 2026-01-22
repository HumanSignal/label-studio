import base64
import logging
import time
from typing import Union
from urllib.parse import unquote

from core.utils.exceptions import extract_message
from django.conf import settings
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect, StreamingHttpResponse
from drf_spectacular.utils import extend_schema
from projects.models import Project
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from tasks.models import Task

from label_studio.io_storages.functions import get_storage_by_url
from label_studio.io_storages.utils import parse_range

logger = logging.getLogger(__name__)


class ResolveStorageUriAPIMixin:
    def resolve(self, request: HttpRequest, fileuri: str, instance: Union[Task, Project]) -> Response:
        model_name = type(instance).__name__

        if not instance.has_permission(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        # Attempt to base64 decode the fileuri
        try:
            fileuri = base64.urlsafe_b64decode(fileuri.encode()).decode()
        # For backwards compatibility, try unquote if this fails
        except Exception as exc:
            logger.debug(
                f'Failed to decode base64 {fileuri} for {model_name} {instance.id}: {exc} falling back to unquote'
            )
            fileuri = unquote(fileuri)

        # Try to find storage by URL
        project = instance if isinstance(instance, Project) else instance.project
        storage_objects = project.get_all_import_storage_objects
        storage = get_storage_by_url(fileuri, storage_objects)
        if not storage:
            logger.error(f'Could not find storage for URI {fileuri}')
            return Response(status=status.HTTP_404_NOT_FOUND)
        # Not all storages support presigned URLs
        if not hasattr(storage, 'presign'):
            logger.error(f'Storage {storage} does not support presign URLs')
            return Response(status=status.HTTP_404_NOT_FOUND)
        presign = storage.presign

        # Check if storage should use presigned URLs;
        # It's important to have this check here, because it increases security:
        # If storage.presign is False, it means an admin doesn't want to expose presigned URLs anyhow,
        # and all files are proxied through Label Studio using LS auth and RBAC control.

        if presign:
            # Redirect to presigned URL (original flow)
            return self.redirect_to_presign_url(fileuri, instance, model_name)
        else:
            return self.proxy_data_from_storage(request, fileuri, project, storage)

    def redirect_to_presign_url(self, fileuri: str, instance: Union[Task, Project], model_name: str) -> Response:
        """Generate and redirect to a presigned URL for the given file URI"""
        try:
            resolved = instance.resolve_storage_uri(fileuri)
        except Exception as exc:
            logger.error(f'Failed to resolve storage uri {fileuri} for {model_name} {instance.id}: {exc}')
            return Response(status=status.HTTP_404_NOT_FOUND)

        if resolved is None or resolved.get('url') is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        url = resolved['url']
        max_age = 0
        if resolved.get('presign_ttl'):
            max_age = resolved.get('presign_ttl') * 60

        # Proxy to presigned url
        response = HttpResponseRedirect(redirect_to=url, status=status.HTTP_303_SEE_OTHER)
        response.headers['Cache-Control'] = f'no-store, max-age={max_age}'
        # Remove Sentry trace propagation headers to avoid CORS issues
        response.headers.pop('baggage', None)
        response.headers.pop('sentry-trace', None)
        return response

    def time_limited_chunker(self, stream_body):
        """
        Generator that stops yielding chunks after timeout seconds.
        """
        chunk_size = settings.RESOLVER_PROXY_BUFFER_SIZE
        timeout = settings.RESOLVER_PROXY_TIMEOUT
        start_time = time.monotonic()
        deadline = start_time + timeout
        chunks_yielded = 0
        total_bytes = 0

        try:
            for chunk in stream_body.iter_chunks(chunk_size=chunk_size):
                current_time = time.monotonic()
                # Check if we've exceeded our time limit
                if current_time >= deadline:
                    logger.warning(
                        f'Time limit ({timeout}s) reached after yielding {chunks_yielded} chunks ({total_bytes} bytes)'
                    )
                    break

                # Track statistics
                chunks_yielded += 1
                total_bytes += len(chunk)
                yield chunk

        except Exception as e:
            logger.error(f'Error during time-limited streaming: {e}', exc_info=True)
        finally:
            elapsed = time.monotonic() - start_time
            try:
                stream_body.close()
            except Exception as e:
                logger.debug(f"Couldn't close stream: {e}")
            logger.debug(
                f'Stream processing finished after {elapsed:.2f}s, yielded {chunks_yielded} chunks ({total_bytes} bytes)'
            )

    def override_range_header(self, request):
        """
        Process and override Range header to limit stream size.
        This function does a trick: limit stream chunk sizes to MAX_RANGE,
        this way we free sync LSE workers for hanging too long,
        because the connection will be closed after the MAX_RANGE chunk is over.

        This function handles several range request formats:
        1 'bytes=0-' and 'bytes=0-0': Passes through unchanged (header probes)
        2 'bytes=123456-' and 'bytes=123456-0': Limits to MAX_RANGE bytes
        3 'bytes=123456-789012': Limits the range if it exceeds MAX_RANGE
        4 'bytes=-1024': Handles negative start (not supported)

        Returns:
            str: Modified range header in format "bytes=start-end" or None if no range header
        """
        max_range_size = settings.RESOLVER_PROXY_MAX_RANGE_SIZE
        range_header = None

        if rng := request.headers.get('Range'):
            start, end = parse_range(rng)
            # Normalize None end to empty for consistent handling
            if end is None:
                end = ''
            logger.debug(f'>> Range read from request: start: {start}, end: {end}')

            """
            Pass this range as is to storage:
              - 'bytes=0-'  most likely, browser is requesting just headers
              - 'bytes=0-0'  most likely, browser is requesting just headers
            Limit stream to MAX_RANGE bytes:
              - 'bytes=123456-'  browser is requesting from 123456 to the end of the file
              - 'bytes=123456-0'  browser is requesting from 123456 to the end of the file
              - 'bytes=123456-789012'  browser is requesting from 123456 to 789012
            Not supported:
              - 'bytes=-1024'  browser is requesting last 1024 bytes - we don't support this
            """
            # 'bytes=0-' + 'bytes=0-0'
            if start == 0 and (end == '' or end == 0):
                pass
            # 'bytes=123456-' + 'bytes=123456-0'
            elif start > 0 and (end == '' or end == 0):
                end = start + max_range_size
            # 'bytes=123456-' + 'bytes=123456-789012'
            elif start >= 0 and end > 0:
                end = start + max_range_size if end >= start + max_range_size else end
            # 'bytes=-1024'
            elif start < 0:
                logger.warning(f'Start range is negative and not supported: {rng}')
                start = 0
                end = start + max_range_size
            else:
                logger.warning(f'Range is not covered by logic: {rng}')
                start = 0
                end = ''

            range_header = f'bytes={start}-{end}'
            logger.debug(f'>> stream > start: {int(start)/1024/1024} MB')
            logger.debug(f'>> stream > end: {int(end or 0)/1024/1024} MB')
            logger.debug(f'>> stream > range_header: {range_header}')

        return range_header

    def prepare_headers(self, response, metadata, request, project):
        """Prepare and set headers for the streaming response"""
        # Copy important headers from storage
        if metadata.get('ContentLength'):
            response.headers['Content-Length'] = str(metadata['ContentLength'])
        if metadata.get('ContentRange'):
            response.headers['Content-Range'] = metadata['ContentRange']
        if metadata.get('LastModified'):
            last_mod = metadata['LastModified']
            # Accept either datetime-like (has strftime) or preformatted string
            if hasattr(last_mod, 'strftime'):
                response.headers['Last-Modified'] = last_mod.strftime('%a, %d %b %Y %H:%M:%S GMT')
            else:
                response.headers['Last-Modified'] = str(last_mod)

        # Always enable range requests
        response.headers['Accept-Ranges'] = 'bytes'

        # Cache control
        max_age = settings.RESOLVER_PROXY_CACHE_TIMEOUT
        response.headers['Cache-Control'] = f'private, max-age={max_age}, must-revalidate'

        # Generate an ETag based on user ID and user is_active status
        # This ensures cache is invalidated when user status changes
        # "ETag" is a standard HTTP header defined in the HTTP/1.1 specification (RFC 7232)
        #  It stands for "Entity Tag" and is specifically designed for cache validation
        user = request.user
        has_access = int(project.has_permission(user))
        user_status_tag = f'{user.id}{has_access}'
        response.headers['ETag'] = f'{user_status_tag}'
        if metadata.get('ETag'):
            # use original ETag from storage
            response.headers['ETag'] += metadata['ETag'].strip('"')
        response.headers['ETag'] = f'"{response.headers["ETag"]}"'

        return response

    def proxy_data_from_storage(self, request, uri, project, storage):
        """
        Proxy the data using iter_chunks directly from storage streaming object.

        This implementation forwards Range headers to cloud storages and streams the response
        directly using StreamingHttpResponse. It avoids any intermediate buffering
        but doesn't support backward seeking.
        """
        try:
            # Process and limit the range header for downloaded files
            range_header = self.override_range_header(request)

            # Use the storage-specific method to get data stream and content type
            stream, content_type, metadata = storage.get_bytes_stream(uri, range_header=range_header)

            if stream is None:
                logger.error(f'Failed to get direct stream from storage {storage}')
                return Response(
                    {'error': 'Storage stream failed while proxying data', 'detail': 'Stream is None'},
                    status=status.HTTP_424_FAILED_DEPENDENCY,
                )

            # Create time-limited stream
            time_limited_stream = self.time_limited_chunker(stream)

            # Set up streaming response with storage's status code
            status_code = metadata['StatusCode']
            response = StreamingHttpResponse(
                time_limited_stream, content_type=content_type or 'application/octet-stream', status=status_code
            )

            # Prepare response headers
            response = self.prepare_headers(response, metadata, request, project)

            # Process cached requests using ETag - with range-aware handling
            if settings.RESOLVER_PROXY_ENABLE_ETAG_CACHE and 'Range' not in request.headers:
                if request.headers.get('If-None-Match') == response.headers.get('ETag'):
                    return HttpResponse(status=status.HTTP_304_NOT_MODIFIED)

            return response

        except Exception as e:
            logger.error(f'Error in direct proxy from storage: {e}', exc_info=True)
            return Response(
                {'error': 'Storage stream failed while proxying data', 'detail': extract_message(e)},
                status=status.HTTP_424_FAILED_DEPENDENCY,
            )


@extend_schema(exclude=True)
class TaskResolveStorageUri(ResolveStorageUriAPIMixin, APIView):
    """A file proxy to presign storage urls at the task level.

    If the storage has presign=False, it will proxy the data through Label Studio
    instead of redirecting to presigned URLs.
    """

    http_method_names = ['get']
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        """Get the presigned url for a given fileuri or proxy data through Label Studio"""
        request = self.request
        task_id = kwargs.get('task_id')
        fileuri = request.GET.get('fileuri')

        if fileuri is None or task_id is None:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            task = Task.objects.get(pk=task_id)
        except Task.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return self.resolve(request, fileuri, task)


@extend_schema(exclude=True)
class ProjectResolveStorageUri(ResolveStorageUriAPIMixin, APIView):
    """A file proxy to presign storage urls at the project level.

    If the storage has presign=False, it will proxy the data through Label Studio
    instead of redirecting to presigned URLs.
    """

    http_method_names = ['get']
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        """Get the presigned url for a given fileuri or proxy data through Label Studio"""
        request = self.request
        project_id = kwargs.get('project_id')
        fileuri = request.GET.get('fileuri')

        if fileuri is None or project_id is None:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return self.resolve(request, fileuri, project)
