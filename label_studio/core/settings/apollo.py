import os
import requests
import logging
from http import HTTPStatus


class ApolloBaseConfig():
    def __init__(self):
        self.apollo_long_key_value_storage = dict()
        self._get_apollo_entry_from_env()
        self.apollo_request_header = {"apollo_auth_token": self.apollo_auth_token}
        try:
            self.apollo_available = bool(
                self.apollo_config_url
                and requests.get(
                    self.apollo_config_url,
                    headers=self.apollo_request_header,
                    timeout=1,
                ).status_code
                == HTTPStatus.OK
            )
        except (
            requests.exceptions.ConnectTimeout,
            requests.exceptions.ConnectionError,
        ):
            logging.warning(f"Apollo入口连接超时：{self.apollo_config_url}，无法获取任何Apollo配置。")
            self.apollo_available = False
        self.apollo_route = "configs"
        self.apollo_config_cluster = os.getenv("APOLLO_CONFIG_CLUSTER")
        self.apollo_config_env = os.getenv("APOLLO_CONFIG_ENV")

    def _get_apollo_entry_from_env(self):
        self.apollo_config_url = os.getenv("APOLLO_CONFIG_URL")
        self.apollo_auth_token = os.getenv("APOLLO_AUTH_TOKEN")

    def get_apollo_configs(self, app: str, namespace: str) -> dict:
        # if self.apollo_available:
        url = f"{self.apollo_config_url}/{self.apollo_route}/{app}/{self.apollo_config_cluster}/{namespace}"
        res = requests.get(url, headers=self.apollo_request_header)
        if res.status_code == HTTPStatus.OK:
            return res.json().get("configurations")
        else:
            logging.warning(
                f"获取Apollo具体配置失败：{url}\n请确认当前环境{self.apollo_config_cluster}中，项目{app}所"
                f"对应的namespace：{namespace}的相关配置已发布。")


if __name__ == "__main__":
    APOLLO_APPLICATION = "machine-learning"
    APOLLO_NAMESPACE = "mlflow"

    MLFLOW_APOLLO_CONFIG_DICT = ApolloBaseConfig().get_apollo_configs(app=APOLLO_APPLICATION, namespace=APOLLO_NAMESPACE)
    print(MLFLOW_APOLLO_CONFIG_DICT)