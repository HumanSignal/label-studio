from datetime import datetime
from urllib.parse import urlparse
import mlflow
import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.linear_model import ElasticNet
import requests
import json
import logging

logging.basicConfig(level=logging.WARN)
logger = logging.getLogger(__name__)

def eval_metrics(actual, pred):
    rmse = np.sqrt(mean_squared_error(actual, pred))
    mae = mean_absolute_error(actual, pred)
    r2 = r2_score(actual, pred)
    return rmse, mae, r2

if __name__ == '__main__':
    access_token = 'ENTER YOUR ACCESS TOKEN'
    ls_url = 'ENTER YOUR LS URL'
    project = 'ENTER YOUR PROJECT NUMBER'
    url = ls_url + f'/api/project/{project}/tasks'
    headers = {
        'Authorization': 'Token ' + access_token,
        'Content-Type': 'application/json'
    }
    load_date = datetime.now()
    # Load data from Label Studio
    json_data = json.loads(requests.get(url, headers=headers).text)
    # Filter only labeled data
    filtered_data = [item for item in json_data if item['is_labeled']]
    ''' Join annotations with your data
    Use filtered_data['data'] as key to your data points (it's your task description)
    Use list filtered_data['annotations'] with ['result] field to fill in your target variable 
    '''
    data = pd.DataFrame()
    # Split the data into training and test sets
    train, test = train_test_split(data)
    train_x = train.drop(["target"], axis=1)
    test_x = test.drop(["target"], axis=1)
    train_y = train[["target"]]
    test_y = test[["target"]]

    with mlflow.start_run():
        alpha = 1.0
        l1_ratio = 0.5
        # Train your model
        lr = ElasticNet(alpha=alpha, l1_ratio=l1_ratio, random_state=42)
        lr.fit(train_x, train_y)
        # Measure your model results
        predicted_qualities = lr.predict(test_x)
        (rmse, mae, r2) = eval_metrics(test_y, predicted_qualities)
        # Log parameters of your experiment
        mlflow.log_param("alpha", alpha)
        mlflow.log_param("l1_ratio", l1_ratio)
        # Log your data set parameters
        mlflow.log_param("Load_date", load_date)
        # Log metrics
        mlflow.log_metric("rmse", rmse)
        mlflow.log_metric("r2", r2)
        mlflow.log_metric("mae", mae)

        tracking_url_type_store = urlparse(mlflow.get_tracking_uri()).scheme

        # Model registry does not work with file store
        if tracking_url_type_store != "file":
            # Register the model
            # There are other ways to use the Model Registry, which depends on the use case,
            # please refer to the doc for more information:
            # https://mlflow.org/docs/latest/model-registry.html#api-workflow
            mlflow.sklearn.log_model(lr, "model", registered_model_name="ElasticnetModel")
        else:
            mlflow.sklearn.log_model(lr, "model")