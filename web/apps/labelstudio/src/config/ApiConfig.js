export const API_CONFIG = {
  gateway: `${window.APP_SETTINGS.hostname}/api`,
  endpoints: {
    // Users
    users: "/users",
    updateUser: "PATCH:/users/:pk",
    updateUserAvatar: "POST:/users/:pk/avatar",
    deleteUserAvatar: "DELETE:/users/:pk/avatar",
    me: "/current-user/whoami",
    hotkeys: "GET:/current-user/hotkeys/",
    updateHotkeys: "PATCH:/current-user/hotkeys/",

    // Organization
    memberships: "/organizations/:pk/memberships",
    userMemberships: "/organizations/:pk/memberships/:userPk",
    inviteLink: "/invite",
    resetInviteLink: "POST:/invite/reset-token",

    // Project
    projects: "/projects",
    project: "/projects/:pk",
    updateProject: "PATCH:/projects/:pk",
    createProject: "POST:/projects",
    deleteProject: "DELETE:/projects/:pk",
    projectResetCache: "POST:/projects/:pk/summary/reset",

    // Presigning
    presignUrlForTask: "/../tasks/:taskID/presign",
    presignUrlForProject: "/../projects/:projectId/presign",

    // Config and Import
    configTemplates: "/templates",
    validateConfig: "POST:/projects/:pk/validate",
    createSampleTask: "POST:/projects/:pk/sample-task",
    fileUploads: "/projects/:pk/file-uploads",
    deleteFileUploads: "DELETE:/projects/:pk/file-uploads",
    importFiles: "POST:/projects/:pk/import",
    reimportFiles: "POST:/projects/:pk/reimport",
    dataSummary: "/projects/:pk/summary",

    // DM
    deleteTabs: "DELETE:/dm/views/reset",

    // Storages
    listStorages: "/storages/:target?",
    storageTypes: "/storages/:target?/types",
    storageForms: "/storages/:target?/:type/form",
    createStorage: "POST:/storages/:target?/:type",
    deleteStorage: "DELETE:/storages/:target?/:type/:pk",
    updateStorage: "PATCH:/storages/:target?/:type/:pk",
    syncStorage: "POST:/storages/:target?/:type/:pk/sync",
    validateStorage: "POST:/storages/:target?/:type/validate",
    storageFiles: "POST:/storages/:target?/:type/files",

    // ML
    mlBackends: "GET:/ml",
    mlBackend: "GET:/ml/:pk",
    addMLBackend: "POST:/ml",
    updateMLBackend: "PATCH:/ml/:pk",
    deleteMLBackend: "DELETE:/ml/:pk",
    trainMLBackend: "POST:/ml/:pk/train",
    predictWithML: "POST:/ml/:pk/predict/test",
    projectModelVersions: "/projects/:pk/model-versions",
    deletePredictions: "DELETE:/projects/:pk/model-versions",
    modelVersions: "/ml/:pk/versions",
    mlInteractive: "POST:/ml/:pk/interactive-annotating",

    // Export
    export: "/projects/:pk/export",
    previousExports: "/projects/:pk/export/files",
    exportFormats: "/projects/:pk/export/formats",

    // Version
    version: "/version",

    // Webhook
    webhooks: "/webhooks",
    webhook: "/webhooks/:pk",
    updateWebhook: "PATCH:/webhooks/:pk",
    createWebhook: "POST:/webhooks",
    deleteWebhook: "DELETE:/webhooks/:pk",
    webhooksInfo: "/webhooks/info",

    // Product tours
    getProductTour: "GET:/current-user/product-tour",
    updateProductTour: "PATCH:/current-user/product-tour",

    // Tokens
    accessTokenList: "GET:/token",
    accessTokenGetRefreshToken: "POST:/token",
    accessTokenRevoke: "POST:/token/blacklist",

    accessTokenSettings: "GET:/jwt/settings",
    accessTokenUpdateSettings: "POST:/jwt/settings",

    // FSM
    fsmStateHistory: "GET:/fsm/entities/:entityType/:entityId/history",
  },
  alwaysExpectJSON: false,
};
