export const TRANSLATIONS_EN = {
  common:{
    media_file_type: {
      Text: "Text",
      Audio: "Audio",
      Images: "Images",
      HTML: "HTML",
      TimeSeries : "Time Series",
      CommonFormats: "Common Formats",
    },
    tags: {
      title: {
        "Width of region borders" : "Width of region borders",
        "Allow image zoom (ctrl+wheel)" : "Allow image zoom (ctrl+wheel)",
        "Show controls to zoom in and out" : "Show controls to zoom in and out",
        "Show controls to rotate image" : "Show controls to rotate image",
        "Select text by words" : "Select text by words",
        "Add filter for long list of labels" : "Add filter for long list of labels",
        "Display labels" : "Display labels",
      },
      "Display labels": {
        bottom : "bottom",
        left : "left",
        right : "right",
        top : "top",
      },
    },
  },
  components: {
    menubar: {
      projects: "Projects",
      organization: "Organization",
      api: "API",
      docs: "Docs",
      pin_menu: "Pin menu",
      unpin_menu: "Unpin menu",
    },
  },
  pages: {
    projects: {
      title: "Projects",
      empty_projects_list:{
        msg_part1: "Heidi doesn’t see any projects here",
        msg_part2:  "Create one and start labeling your data",
        create_project: "Create Project"
      },
    },
    create_project: {
      title: "Create Project",
      steps: {
        name: "Project Name",
        import: "Data Import",
        config: "Labeling Setup",
      },
      project_name: { 
        name_title: "Project Name",
        description_title: "Description",
        description_placeholder: "Optional description of your project",
      },
      import_data: {
        dataset_url: "Dataset URL",
        add_url: "Add URL",
        or: "or",
        upload: "Upload ",
        more: "More ",
        files: "Files",
        upload_file_msg: "Drag & drop files here<br/>or click to browse",
        footer_msg_part1: "See the documentation to ",
        footer_msg_part2: "import preannotated data ",
        footer_msg_part3: " or to ",
        footer_msg_part4: "sync data from a database or cloud storage.",
      },
      config_label: {
        custom_template: "Custom template",
        footer_mst_part1: "See the documentation to ",
        footer_mst_part2: "contribute a template.",
        browse_templates: "Browse Templates",
        code: "Code",
        visual: "Visual",
        configure_data: "Configure data",
        require_more_data: "This template requires more data then you have for now",
        need_upload_data: "To select which field(s) to label you need to upload the data. Alternatively, you can provide it using Code mode.",
        add: "Add",
        add_choices: "Add choices",
        add_label_names: "Add label names",
        configure_settings: "Configure settings",
        ui_preview: "UI Preview",
      },
      draft: {
        name: "New Project",
      },
      delete_button: "Delete",
      save_button: "Save",
    }
  },
};
