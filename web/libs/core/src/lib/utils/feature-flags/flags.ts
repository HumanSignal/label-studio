/**
 * Canonical registry for all frontend feature flag constants (FF_*).
 * Add new flags here only — do not define new constants in editor, datamanager,
 * LSE, or app-level feature-flags files. Use via `import { ff } from "@humansignal/core"`.
 * See `.agents/skills/feature-flags/SKILL.md`.
 */

//// LEGACY FLAGS ////
// Consider all pre-XFN flags legacy. Should be revised and removed.

/**
 * Model version selector per model backend
 */
export const FF_DEV_1682 = "ff_front_dev_1682_model_version_dropdown_070622_short";

/**
 * Enables "Enterprise Awareness" features
 */
export const FF_LSDV_E_297 = "fflag_feat_front_lsdv_e_297_increase_oss_to_enterprise_adoption_short";

//// END OF LEGACY FLAGS ////

/**
 * Prompter workflow
 */
export const FF_DIA_835 = "fflag_feat_all_dia_835_prompter_workflow_long";

/**
 * Joyride
 */
export const FF_PRODUCT_TOUR = "fflag_feat_dia_1697_product_tour_short";

/**
 * Enables JWT tokens
 */
export const FF_AUTH_TOKENS = "fflag__feature_develop__prompts__dia_1829_jwt_token_auth";

export const FF_IMPROVE_GLOBAL_ERROR_MESSAGES = "fflag_feat_front_optic_1746_improve_global_error_messages_short";

/**
 * Sample datasets UI for the import flow
 */
export const FF_SAMPLE_DATASETS = "fflag_feat_dia_1920_project_creation_sample_data_short";

/**
 * JSON preview window for the import flow
 */
export const FF_JSON_PREVIEW = "fflag_feat_dia_1925_view_sample_raw_json_short";

/**
 * Enables the theme toggle in the UI to enable the dark mode
 */
export const FF_THEME_TOGGLE = "fflag_feat_front_optic_1217_theme_toggle_short";

/**
 * Fixes synced audio/video buffering
 */
export const FF_SYNCED_BUFFERING = "fflag_fix_front_fit_31_synced_media_buffering";

/**
 * Enables enterprise email notifications
 */
export const FF_ENTERPRISE_EMAIL_NOTIFICATIONS = "fflag_feat_front_fit_183_email_notifications_short";

/**
 * New storage providers experience
 * @link https://app.launchdarkly.com/projects/default/flags/fflag_feat_bros_193_new_cloud_storage_providers_short/targeting?env=production&selected-env=production
 */
export const FF_NEW_STORAGES = "fflag_feat_bros_193_new_cloud_storage_providers_short";

/**
 * Modify MST models to allow custom tags
 */
export const FF_CUSTOM_TAGS = "fflag_feat_front_bros_194_custom_tags_short";

/**
 * Agreement Filtered
 */
export const FF_AGREEMENT_FILTERED = "fflag_feat_utc_239_filterable_agreement_column_short";

/**
 * Consensus control-tag agreement (v2) — enables dimension-based agreement calculation
 * and the v2 agreement UI (new Agreement column). When disabled, the legacy
 * agreement_selected column and v1 UI are used instead.
 */
export const FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT = "fflag_utc_428_consensus_control_tag_agreement";

/**
 * Add or update task-data columns from the Data Manager.
 */
export const FF_UTC_1012_ADD_OR_MODIFY_COLUMNS = "fflag_utc_1012_add_or_modify_columns";

/**
 * FSM State Fields
 */
export const FF_FSM_STATE_FIELDS = "fflag_feat_fit_710_fsm_state_fields";

/**
 * Starter Cloud (Self Serve) plan
 * @link https://app.launchdarkly.com/default/test/features/fflag_feat_front_leap_482_self_serve_short/
 */
export const FF_SELF_SERVE = "fflag_feat_front_leap_482_self_serve_short";

/**
 * Preview performance improvements - uses lightweight static preview for large configs
 */
export const FF_PREVIEW_PERFORMANCE = "fflag_fix_all_fit_287_preview_performance_improvements";

/**
 * Lazy load annotations in LabelStream to improve performance for tasks with many annotations
 * Also enables virtualization of annotation tabs carousel
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_all_fit_720_lazy_load_annotations
 */
export const FF_FIT_720_LAZY_LOAD_ANNOTATIONS = "fflag_fix_all_fit_720_lazy_load_annotations";

/**
 * Use agreement dashboard v2 in Task Summary ViewAll summary tab
 */
export const FF_UTC_554_AGREEMENT_V2_IN_TASK_SUMMARY_VIEW = "fflag_feat_utc_554_agreement_v2_in_task_summary_view";
/**
 * Analytics Label Distribution page
 */
export const FF_FIT_1443_ANALYTICS_LABEL_DISTRIBUTION_PAGE =
  "fflag_feat_all_fit_1443_analytics_label_distribution_page";

/**
 * LSE project hub: Dashboard + Members under a shared layout
 */
export const FF_LSE_PROJECT_DASHBOARDS_V3 = "fflag_feat_front_lse_project_dashboards_v3_short";

/**
 * LSE project throughput: Velocity and Diagnostics replacement of the old Project Dashboard view.
 */
export const FF_LSE_PROJECT_DASHBOARDS_V3_THROUGHPUT = "fflag_feat_lse_project_dashboards_v3_throughput_short";

/**
 * LSE project throughput: Velocity / Diagnostics tabbed UI and Diagnostics tab (FIT-1678).
 */
export const FF_LSE_PROJECT_DASHBOARDS_V3_DIAGNOSTICS = "fflag_feat_lse_project_dashboards_v3_diagnostics_short";

/**
 * LSE project hub: redesigned Members dashboard (performance + inter-rater reliability) under Dashboard V3.
 */
export const FF_LSE_PROJECT_DASHBOARDS_V3_MEMBERS = "fflag_feat_lse_project_dashboards_v3_members_short";

/**
 * LSE project hub: Data Quality tab (FIT-1634) — Agreement analysis sub-tab consumes
 * the FIT-1633 endpoints; Label distribution sub-tab is a placeholder owned by FIT-1536.
 */
export const FF_LSE_PROJECT_DASHBOARDS_V3_DATA_QUALITY = "fflag_feat_lse_project_dashboards_v3_data_quality_short";

/**
 * Show per-item classifications (like Choices or Taxonomy) alongside regions in the Outliner panel
 */
export const FF_CLASSIFICATIONS_IN_OUTLINER = "fflag_feat_front_bros_766_per_item_in_outliner";

/**
 * Segment Anything via ML backend — server-side SAM2 flow. Controls the
 * editor-side interactive UI (point / box prompts, Accept, Track).
 */
export const FF_SEGMENT_ANYTHING_ML_BACKEND = "fflag_feat_bros_951_ml_backend_short";

/**
 * Non-antd Taxonomy control (design-system tree + search) for the Taxonomy tag and comment classifications.
 */
export const FF_ECHO_466_TAXONOMY_ANTD_REMOVAL = "fflag_feat_all_echo_466_taxonomy_antd_removal_short";

/**
 * Single feature flag for migrating app-chrome dialogs from legacy `modal()` / `Modal` to `ModalWindow`.
 * Use `ff.isActive(FF_MODAL_WINDOW_APP_CHROME)` next to each migrated modal (not a global switch in app Modal.tsx).
 */
export const FF_MODAL_WINDOW_APP_CHROME = "fflag_feat_front_fit_1559_modal_window_short";

/**
 * New drafts + undo/redo architecture in the new editor (`editor-shell`).
 * When OFF, both editors behave exactly as today (existing draft / `screenHistoryAtom` path).
 * When ON, the editor-shell routes changes through the Canvas / UndoRedoStack / Draft / DraftBridge
 * model (per-annotation undo/redo, draft as a separate concept, host-owned debounce/persistence).
 * See docs/drafts/DRAFTS.md.
 */
export const FF_INTERFACES_NEW_DRAFTS = "fflag_feat_interfaces_new_drafts";

/**
 * Annotation course builder for project onboarding and workforce learning.
 */
export const FF_ANNOTATION_COURSE_BUILDER = "fflag_feat_annotation_course_builder";

/**
 * Enable Interfaces section for custom labeling interface builder.
 */
export const FF_INTERFACES = "fflag_feat_all_optic_interfaces_short";

/**
 * AI agent workflow inside Custom Interfaces (chat, plan mode, tool loop).
 * Requires FF_INTERFACES; when off, users can still author interfaces manually in the code editor.
 */
export const FF_INTERFACES_AGENT_WORKFLOW = "fflag_feat_interfaces_agent_workflow";

/**
 * WASM FFmpeg Streaming Decoder (progressive seek/decode) for long compressed audio files
 */
export const FF_FIT_2003_WASM_STREAMING_DECODER = "fflag_feat_front_fit_2003_wasm_streaming_decoder";

/**
 * Virtualized JSON viewer (Task Source, Code tab) and CodeMirror 6 editor path.
 * When off, JsonViewer and CodeEditor use the legacy json-edit-react / CM5 implementations.
 */
export const FF_FIT_2007_VIRTUALIZED_JSON_EDITOR = "fflag_feat_fit_2007_virtualized_json_editor_short";

/**
 * Annotator/reviewer firewall — backend anonymizes PII, so frontend no longer needs
 * to suppress userpics or hide annotation info when this flag is on.
 */
export const FF_UTC_950_FIREWALL = "fflag_feat_utc_950_annotator_reviewer_firewall_short";

/**
 * LSE-only "Description (Internal)" project field — a manager-only notes field stored on
 * LseProject, editable in Project Settings and Create Project, and displayed on the Projects
 * page (cards/table) under the public description.
 */
export const FF_LSE_PROJECT_INTERNAL_DESCRIPTION = "fflag_feat_lse_project_internal_description_short";

/**
 * Vertical annotations sidebar with filtering and resizable column in labeling UI.
 */
export const FF_FIT_ANNOTATIONS_VERTICAL_LAYOUT = "fflag_feat_front_fit_annotations_vertical_layout_short";

/**
 * Host-side protection against duplicate ReactCode regions: accept postMessage
 * mutations only from the instance's own iframe (tag names repeat across
 * projects, so tag-only matching let a lingering second editor session write
 * other tasks' regions into its annotation) and echo regions back after each
 * mutation. Gated for per-org rollout (affected orgs first).
 */
export const FF_BROS_1486_REACTCODE_DUP_REGIONS = "fflag_fix_bros_1486_react_code_external_apps_duplicate_regions";

/**
 * View-Only users: free, bounded read-only billing seat type.
 * Rollout flag for the backend foundation (membership type,
 * `max_view_only_users` entitlement, paid-seat exclusion, reporting).
 */
export const FF_VIEW_ONLY_USERS = "fflag_feat_back_fit_2196_view_only_users_short";

/**
 * Contributor opt-in to projects: project setting that lets contributors join
 * eligible projects themselves (workforce/services organizations only).
 */
export const FF_CONTRIBUTOR_OPT_IN = "fflag_feat_utc_1064_contributor_opt_in";

/**
 * Configurable Annotator Evaluation metric (No-GT Evaluation): lets a project
 * choose the metric that drives Annotator Evaluation — ground truth agreement
 * (default, today's behavior), review acceptance score, or rejection rate.
 */
export const FF_ANNOTATOR_EVALUATION_METRIC = "fflag_feat_utc_1085_annotator_evaluation_metric";
