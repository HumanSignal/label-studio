from typing import Sequence, Tuple


def sdk_logs(caplog) -> Sequence[Tuple[str, str, str]]:
    """
    Get the SDK logs from the passed caplog fixture. Useful for asserting on SDK log output.
    """

    return [record_tuple for record_tuple in caplog.record_tuples if record_tuple[0].startswith('label_studio_sdk.')]
