/* 
to mock a request, you can define the endpoint with a schema that looks like this:
endpointName:{                              //endpointName is what is used when calling callAPI, passed in as a string
      method: "GET",                        //Optional. defaults to GET. options are GET, POST, PATCH, DELETE
      mock: undefined,                      //Optional. function that returns the mock data
      path: "/tasks/:taskID/annotations",   //Required. path to the endpoint you want to mock
}
see an example below
*/
export const APIConfig = {
  gateway: "/api/dm",
  endpoints: {
    tasks: {
      path: "/tasks",
      mock: (url, params, fakeRequest) => {
        console.log("mock", url, params, fakeRequest);
        return {
          "total_annotations": 1,
          "total_predictions": 1,
          "total": 1,
          "tasks": [
            {
              "id": 1,
              "agreement": null,
              "drafts": [],
              "annotators": [],
              "inner_id": 101,
              "cancelled_annotations": 0,
              "total_annotations": 0,
              "total_predictions": 0,
              "completed_at": null,
              "annotations_results": "",
              "predictions_results": "",
              "file_upload": null,
              "storage_filename": null,
              "annotations_ids": "",
              "predictions_model_versions": "",
              "updated_by": [],
              "reviewers": [],
              "comments": "",
              "comment_authors": [],
              "reviewed": null,
              "reviews_accepted": 0,
              "reviews_rejected": 0,
              "ground_truth": null,
              "data": {
                "text": "/storage-data/uploaded/?filepath=upload/390739/eb88d7f7-lorem-ipsum.txt"
              },
              "meta": {},
              "created_at": "2024-07-04T10:29:58.730116Z",
              "updated_at": "2024-07-04T10:29:58.730126Z",
              "is_labeled": false,
              "overlap": 1,
              "comment_count": 0,
              "unresolved_comment_count": 0,
              "last_comment_updated_at": null,
              "project": params.project
            },
          ]
        };
      },
    },
  },
};