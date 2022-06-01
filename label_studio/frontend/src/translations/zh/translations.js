export const TRANSLATIONS_ZH = {
  common:{
    media_file_type: {
      Text: "文本",
      Audio: "音频",
      Images: "图片",
      HTML: "HTML",
      TimeSeries : "时间序列",
      CommonFormats: "常用格式",
    },
    tags: {
      title: {
        "Width of region borders" : "矩形框边框的宽度",
        "Allow image zoom (ctrl+wheel)" : "允许图像缩放（Ctrl+滚轮）",
        "Show controls to zoom in and out" : "显示控件以放大和缩小",
        "Show controls to rotate image" : "显示控件以旋转图像",
        "Select text by words" : "按单词选择文本",
        "Add filter for long list of labels" : "为长标签列表添加过滤器",
        "Display labels" : "标签显示位置",
      },
      "Display labels" : {
        bottom : "底部",
        left : "左侧",
        right : "右侧",
        top : "顶部",
      },
    },
  },
  components: {
    menubar: {
      projects: "项目",
      organization: "组织",
      api: "API",
      docs: "文档",
      pin_menu: "锁定菜单",
      unpin_menu: "解锁菜单",
    },
  },
  pages: {
    projects: {
      title: "项目列表",
      empty_projects_list:{
        msg_part1: "Heidi 没有发现任何项目",
        msg_part2:  "创建一个项目以便开始标注你的数据",
        create_project: "创建项目"
      }
    },
    create_project: {
      title: "创建项目",
      steps: {
        name: "项目名称",
        import: "数据导入",
        config: "标签初始化",
      },
      project_name: { 
        name_title: "项目名称",
        description_title: "项目描述",
        description_placeholder: "对你的项目的描述（可选）",
      },
      import_data: {
        dataset_url: "数据集 URL",
        add_url: "添加 URL",
        or: "或",
        upload: "上传",
        more: "更多",
        files: "文件",
        upload_file_msg: "将文件拖放到此处<br/>或单击以浏览",
        footer_msg_part1: "请参阅文档以",
        footer_msg_part2: "导入预先标注的数据",
        footer_msg_part3: "或",
        footer_msg_part4: "从数据库或云存储同步数据。",
      },
      config_label: {
        custom_template: "自定义模板",
        footer_mst_part1: "参阅文档以",
        footer_mst_part2: "向社区贡献模板。",
        browse_templates: "返回选择模板",
        code: "代码",
        visual: "可视化",
        configure_data: "配置数据",
        require_more_data: "此模板需要比您现在拥有的更多数据",
        need_upload_data: "要选择要标记的字段，您需要上传数据。 或者，您可以使用代码模式提供它。",
        add: "添加",
        add_choices: "添加选项",
        add_label_names: "添加标签",
        configure_settings: "配置设置",
        ui_preview: "用户界面预览",
      },
      draft: {
        name: "新项目",
      },
      delete_button: "删除",
      save_button: "保存",
    },
  },
};
