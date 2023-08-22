import { Tip } from "./types";

export const TipsCollection: Record<string, Tip[]> = {
  projectCreation: [{
    title: "Did you know?",
    content: "It’s easier to find the projects when you organize them into workspaces using Label Studio Enterprise.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.humansignal.com/guide/manage_projects#Create-workspaces-to-organize-projects",
      params: {
        experiment: "project_creation_tip",
        treatment: "find_and_manage_projects",
      },
    },
  }, {
    title: "Unlock faster access provisioning",
    content: "Streamline assigning staff to multiple projects by assigning them to workspaces in Label Studio Enterprise.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.humansignal.com/guide/manage_projects#Add-or-remove-members-to-a-workspace",
      params: {
        experiment: "project_creation_tip",
        treatment: "faster_provisioning",
      },
    },
  }, {
    title: "Did you know?",
    content: "Users with the Manager role can supervise a set of projects by assigning them to workspaces in Label Studio Enterprise.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.humansignal.com/guide/manage_users#Roles-in-Label-Studio-Enterprise",
      params: {
        experiment: "project_creation_tip",
        treatment: "supervise_projects",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can control access to specific projects and workspaces for internal team members and external annotators using Label Studio Enterprise.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.humansignal.com/guide/manage_users#Roles-in-Label-Studio-Enterprise",
      params: {
        experiment: "project_creation_tip",
        treatment: "access_to_projects",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can use or modify dozens or templates to configure your labeling UI, or create a custom configuration from scratch using simple XML-like tag.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://labelstud.io/guide/setup",
      params: {
        experiment: "project_creation_tip",
        treatment: "templates",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can label tasks with collaborators by setting the minimum number of annotations to more than one. ",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://labelstud.io/guide/labeling#Label-with-collaborators",
      params: {
        experiment: "project_creation_tip",
        treatment: "label_with_collaborators",
      },
    },
  }],
  projectSettings: [{
    title: "Did you know?",
    content: "You can automatically label and sort tasks by prediction score to maximize labeling efficiency in Label Studio Enterprise.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.humansignal.com/guide/active_learning.html#Set-up-task-sampling-with-prediction-scores",
      params: {
        experiment: "project_settings_tip",
        treatment: "prediction_score"
      }
    },
  }, {
    title: "Did you know?",
    content: "You can increase the quality of your labeled data with reviewer workflows and task agreement scores using Label Studio Enterprise.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.humansignal.com/guide/quality",
      params: {
        experiment: "project_settings_tip",
        treatment: "quality_and_agreement"
      }
    },
  }, {
    title: "Did you know?",
    content: "You can minimize the number of tasks to be labeled by setting up an automated active learning loop in Label Studio Enterprise.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.humansignal.com/guide/active_learning",
      params: {
        experiment: "project_settings_tip",
        treatment: "active_learning"
      }
    },
  }, {
    title: "Did you know?",
    content: "You can save time managing infrastructure and upgrades, plus access more features for automation, quality, and team management, by using the Enterprise cloud service.",
    closable: true,
    link: {
      label: "Learn more",
      url: "",
      params: {
        experiment: "project_settings_tip",
        treatment: "infrastructure_and_upgrades"
      }
    }
  }, {
    title: "Did you know?",
    content: "You can connect ML models using the backend SDK to save time with pre-labeling or active learning.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://labelstud.io/guide/ml",
      params: {
        experiment: "project_settings_tip",
        treatment: "connect_ml_models"
      }
    },
  }, {
    title: "Faster image labeling",
    content: "You can add a rectangle or an ellipse to your image with just two clicks, or double click to create a polygon, rectangle, or ellipse.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://labelstud.io/guide/labeling#Faster-image-labeling",
      params: {
        experiment: "project_settings_tip",
        treatment: "two_clicks",
      },
    },
  }],
};
