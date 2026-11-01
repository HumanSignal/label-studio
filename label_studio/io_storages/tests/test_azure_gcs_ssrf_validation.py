import json
from unittest.mock import patch

import pytest
from io_storages.azure_blob.models import AzureBlobImportStorage
from io_storages.azure_blob.utils import (
    AZURE,
    get_blob_service_client,
    validate_azure_account_name,
    validate_azure_account_url,
)
from io_storages.gcs.utils import GCS, GOOGLE_TOKEN_URI, GOOGLE_UNIVERSE_DOMAIN
from tests.utils import make_project

ACCOUNT_KEY = 'dGVzdC1hY2NvdW50LWtleQ=='  # gitleaks:allow base64("test-account-key")

INJECTED_ACCOUNT_NAMES = [
    'x;BlobEndpoint=http://127.0.0.1:9;AccountName=x',
    '169.254.169.254/x',
    'attacker.example/',
    'http://169.254.169.254',
    'Acct',
    ' acct',
]


@pytest.mark.parametrize('account_name', INJECTED_ACCOUNT_NAMES)
def test_azure_account_name_rejects_host_injection(account_name):
    """The account name becomes the endpoint host, so only a plain account name is accepted.

    Each value would otherwise point the client at an arbitrary host, either through
    connection string settings (BlobEndpoint) or through the URL template.
    """
    with pytest.raises(ValueError, match='account name'):
        validate_azure_account_name(account_name)
    with pytest.raises(ValueError, match='account name'):
        get_blob_service_client(account_name, ACCOUNT_KEY)
    with pytest.raises(ValueError, match='account name'):
        AZURE.get_client_and_container('container', account_name=account_name, account_key=ACCOUNT_KEY)


def test_azure_account_key_rejects_connection_string_settings():
    """The account key must not carry connection string settings such as BlobEndpoint."""
    with pytest.raises(ValueError, match='account key'):
        get_blob_service_client('acct', f'{ACCOUNT_KEY};BlobEndpoint=http://127.0.0.1:9')


def test_azure_blob_client_targets_the_account_endpoint():
    """A valid name and key produce a client bound to the public Azure endpoint of that account."""
    client = get_blob_service_client('acct', ACCOUNT_KEY)

    assert client.url == 'https://acct.blob.core.windows.net/'
    assert client.credential.account_name == 'acct'


def test_azure_blob_storage_model_rejects_injected_account_name():
    """Storages saved before the check are rejected when the client is built, not only on save."""
    storage = AzureBlobImportStorage(
        container='container', account_name='x;BlobEndpoint=http://127.0.0.1:9;AccountName=x', account_key=ACCOUNT_KEY
    )

    with pytest.raises(ValueError, match='account name'):
        storage.get_client_and_container()


@pytest.mark.django_db
@pytest.mark.parametrize('url', ['/api/storages/azure/', '/api/storages/azure/validate'])
def test_azure_blob_storage_api_rejects_injected_account_name(business_client, url):
    """Create and validate endpoints return 400 and never build a client for an injected account name."""
    project = make_project({}, business_client.user, use_ml_backend=False)
    payload = {
        'project': project.id,
        'container': 'container',
        'account_name': 'x;BlobEndpoint=http://127.0.0.1:9;AccountName=x',
        'account_key': ACCOUNT_KEY,
    }

    with patch('io_storages.azure_blob.utils.BlobServiceClient') as mock_client:
        response = business_client.post(url, data=json.dumps(payload), content_type='application/json')

    assert response.status_code == 400
    assert 'account name' in json.dumps(response.json())
    mock_client.assert_not_called()


@pytest.mark.parametrize(
    'account_url',
    [
        'https://acct.blob.core.windows.net',
        'https://acct.blob.core.windows.net/',
        'https://acct-secondary.blob.core.windows.net',
        'https://acct.privatelink.blob.core.windows.net',
        'https://acct.blob.core.usgovcloudapi.net',
        'https://acct.blob.core.chinacloudapi.cn',
    ],
)
def test_azure_account_url_accepts_azure_blob_endpoints(account_url):
    """Public and sovereign cloud Blob endpoints are valid account URLs."""
    validate_azure_account_url(account_url)


@pytest.mark.parametrize(
    'account_url',
    [
        'http://169.254.169.254/',
        'http://acct.blob.core.windows.net',
        'https://attacker.example/',
        'https://attacker.example/.blob.core.windows.net',
        'https://attacker.example\\.blob.core.windows.net',
        'https://acct.blob.core.windows.net@attacker.example',
        'https://acct.blob.core.windows.net:8443',
        'https://acct.blob.core.windows.net.attacker.example',
        'https://acct.blob.core.windows.net/\n',
    ],
)
def test_azure_account_url_rejects_foreign_hosts(account_url):
    """Anything that is not an https Azure Blob endpoint is rejected, including URL parser tricks."""
    with pytest.raises(ValueError, match='account URL'):
        validate_azure_account_url(account_url)


def _service_account_info(**overrides):
    return {
        'type': 'service_account',
        'project_id': 'project',
        'private_key_id': 'key-id',
        'client_email': 'sa@project.iam.gserviceaccount.com',
        'client_id': '1',
        'token_uri': GOOGLE_TOKEN_URI,
        **overrides,
    }


def test_gcs_client_pins_token_uri_and_universe_domain():
    """Tenant-supplied token_uri and universe_domain never reach google-auth.

    The signed JWT is sent to token_uri and API calls go to the universe domain,
    so both are replaced with the Google endpoints whatever the JSON says.
    """
    info = _service_account_info(token_uri='http://169.254.169.254/token', universe_domain='attacker.example')

    with (
        patch.dict(GCS._client_cache, clear=True),
        patch('io_storages.gcs.utils.service_account.Credentials.from_service_account_info') as mock_from_info,
        patch('io_storages.gcs.utils.gcs.Client'),
    ):
        GCS.get_client(google_application_credentials=json.dumps(info))

    passed_info = mock_from_info.call_args[0][0]
    assert passed_info['token_uri'] == GOOGLE_TOKEN_URI
    assert passed_info['universe_domain'] == GOOGLE_UNIVERSE_DOMAIN
    assert passed_info['client_email'] == 'sa@project.iam.gserviceaccount.com'
