/**
 * To mock a request, you can define the endpoint inside `endpoints` with a schema that looks like this:
 * endpointName: {                                                        // endpointName is what is used when calling callAPI, passed in as a string
 *   method?: "GET",                                                      // defaults to GET. options are GET, POST, PATCH, DELETE
 *   path: "/tasks/:taskID/annotations",                                  // actual endpoint pattern you want to mock
 *   mock?: (url: string, params: Object, fakeRequest: Request) => any,   // function that returns the mock data wrapped into internal response object
 *                                                                        //    accepts string: url, json object: params and Request: fakeRequest
 * }
 * You can copy the `project` endpoint definition and change it to your needs
 */
export const API_CONFIG = {
  gateway: `${window.APP_SETTINGS.hostname}/api`,
  endpoints: {
    project: {
      path: "/projects/:pk",
      mock: (url, params, fakeRequest) => {
        console.log("mock", url, params, fakeRequest);
        const response = {
          id: params.pk,
          title: "My Sample Project",
          description: "",
          label_config:
            '<View>\n  <Text name="text" value="$text" />\n  <View style="box-shadow: 2px 2px 5px #999;\n               padding: 20px; margin-top: 2em;\n               border-radius: 5px;" >\n    <Header value="Choose text sentiment"/>\n    <Choices name="sentiment" toName="text"\n             choice="single" showInLine="true" >\n      <Choice value="Positive"/>\n      <Choice value="Negative"/>\n      <Choice value="Neutral"/>\n    </Choices>\n  </View>\n</View>\n\n<!-- {\n  "data": {"text": "This is a great 3D movie that delivers everything almost right in your face."}\n} -->',
          expert_instruction: "",
          show_instruction: false,
          show_skip_button: true,
          enable_empty_annotation: true,
          show_annotation_history: false,
          organization: 1,
          color: "#FFFFFF",
          maximum_annotations: 1,
          is_published: false,
          model_version: "model 0",
          is_draft: false,
          created_by: {
            id: 1,
            first_name: "",
            last_name: "",
            email: "sample@humansignal.com",
            avatar: null,
          },
          created_at: "2024-07-04T10:05:02.630847Z",
          min_annotations_to_start_training: 0,
          start_training_on_annotation_update: false,
          show_collab_predictions: true,
          num_tasks_with_annotations: 100,
          task_number: 101,
          useful_annotation_number: 200,
          ground_truth_number: 100,
          skipped_annotations_number: 0,
          total_annotations_number: 300,
          total_predictions_number: 100,
          sampling: "Sequential sampling",
          show_ground_truth_first: false,
          show_overlap_first: false,
          overlap_cohort_percentage: 100,
          task_data_login: null,
          task_data_password: null,
          control_weights: {
            sentiment: {
              type: "Choices",
              labels: {
                Neutral: 1.0,
                Negative: 1.0,
                Positive: 1.0,
              },
              overall: 1.0,
            },
          },
          parsed_label_config: {
            sentiment: {
              type: "Choices",
              inputs: [
                {
                  type: "Text",
                  value: "text",
                  valueType: null,
                },
              ],
              labels: ["Positive", "Negative", "Neutral"],
              to_name: ["text"],
              labels_attrs: {
                Neutral: {
                  value: "Neutral",
                },
                Negative: {
                  value: "Negative",
                },
                Positive: {
                  value: "Positive",
                },
              },
            },
          },
          evaluate_predictions_automatically: false,
          config_has_control_tags: true,
          skip_queue: "REQUEUE_FOR_OTHERS",
          reveal_preannotations_interactively: false,
          pinned_at: null,
          finished_task_number: 100,
          queue_total: 101,
          queue_done: 100,
          workspace: 74097,
          review_settings: {
            id: 1,
            requeue_rejected_tasks_to_annotator: false,
            review_criteria: "one",
            anonymize_annotations: false,
            only_finished_tasks: false,
            instruction: "",
            show_instruction: false,
            show_data_manager_to_reviewers: true,
            show_agreement_to_reviewers: false,
            require_comment_on_reject: false,
            requeue_rejected_tasks_mode: "remove",
            review_only_manual_assignments: false,
            project: 1,
          },
          assignment_settings: {
            id: 1,
            label_stream_task_distribution: "auto_distribution",
            project: 1,
          },
          members: [],
          custom_script: null,
          comment_classification_config: null,
          duplication_done: null,
          require_comment_on_skip: false,
          data_types: {
            text: "Text",
          },
          reviewer_queue_total: 0,
          queue_left: 0,
          members_count: 0,
        };
        return response;
      },
    },
  },
};
