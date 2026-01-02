import React, { useState } from "react";
import { useParams as useRouterParams } from "react-router";
import { Redirect } from "react-router-dom";
import { Button } from "../../components";
import { Oneof } from "../../components/Oneof/Oneof";
import { Spinner } from "../../components/Spinner/Spinner";
import { ApiContext } from "../../providers/ApiProvider";
import { useContextProps } from "../../providers/RoutesProvider";
import { Block, Elem } from "../../utils/bem";
import { CreateProject } from "../CreateProject/CreateProject";
import { DataManagerPage } from "../DataManager/DataManager";
import { SettingsPage } from "../Settings";
import "./Projects.scss";
import { EmptyProjectsList, ProjectsList } from "./ProjectsList";
import { useAbortController } from "@humansignal/core";
import { useQuery } from "@tanstack/react-query";
import { Tooltip } from "@humansignal/ui";

const getCurrentPage = () => {
  const pageNumberFromURL = new URLSearchParams(location.search).get("page");

  return pageNumberFromURL ? Number.parseInt(pageNumberFromURL) : 1;
};

export const ProjectsPage = () => {
  const api = React.useContext(ApiContext);
  const abortController = useAbortController();
  const [projectsList, setProjectsList] = React.useState([]);
  const [networkState, setNetworkState] = React.useState(null);
  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const [totalItems, setTotalItems] = useState(1);
  const setContextProps = useContextProps();
  const defaultPageSize = Number.parseInt(localStorage.getItem("pages:projects-list") ?? 30);

  const [modal, setModal] = React.useState(false);

  const openModal = () => setModal(true);

  const closeModal = () => setModal(false);

  const fetchProjects = async (page = currentPage, pageSize = defaultPageSize) => {
    setNetworkState("loading");
    abortController.renew(); // Cancel any in flight requests

    const requestParams = { page, page_size: pageSize };

    requestParams.include = [
      "id",
      "title",
      "created_by",
      "created_at",
      "color",
      "is_published",
      "assignment_settings",
    ].join(",");

    const data = await api.callApi("projects", {
      params: requestParams,
      signal: abortController.controller.current.signal,
      errorFilter: (e) => e.error.includes("aborted"),
    });

    setTotalItems(data?.count ?? 1);
    setProjectsList(data.results ?? []);
    setNetworkState("loaded");

    if (data?.results?.length) {
      const additionalData = await api.callApi("projects", {
        params: {
          ids: data?.results?.map(({ id }) => id).join(","),
          include: [
            "id",
            "description",
            "num_tasks_with_annotations",
            "task_number",
            "skipped_annotations_number",
            "total_annotations_number",
            "total_predictions_number",
            "ground_truth_number",
            "finished_task_number",
          ].join(","),
          page_size: pageSize,
        },
        signal: abortController.controller.current.signal,
        errorFilter: (e) => e.error.includes("aborted"),
      });

      if (additionalData?.results?.length) {
        setProjectsList((prev) =>
          additionalData.results.map((project) => {
            const prevProject = prev.find(({ id }) => id === project.id);

            return {
              ...prevProject,
              ...project,
            };
          }),
        );
      }
    }
  };

  const loadNextPage = async (page, pageSize) => {
    setCurrentPage(page);
    await fetchProjects(page, pageSize);
  };

  React.useEffect(() => {
    fetchProjects();
  }, []);

  const { data: usageLimits } = useQuery({
    queryKey: ["usageLimits"],
    queryFn: async () => {
      try {
        return await api.callApi("usageLimits");
      } catch (error) {
        // If API fails, return null to allow button to work (graceful degradation)
        return null;
      }
    },
  });

  React.useEffect(() => {
    // there is a nice page with Create button when list is empty
    // so don't show the context button in that case
    const canCreateProject = usageLimits?.can_create_project !== false;
    setContextProps({ 
      openModal, 
      showButton: projectsList.length > 0,
      usageLimits,
      canCreateProject: canCreateProject,
    });
  }, [projectsList.length, usageLimits]);

  return (
    <Block name="projects-page">
      <Oneof value={networkState}>
        <Elem name="loading" case="loading">
          <Spinner size={64} />
        </Elem>
        <Elem name="content" case="loaded">
          {projectsList.length ? (
            <ProjectsList
              projects={projectsList}
              currentPage={currentPage}
              totalItems={totalItems}
              loadNextPage={loadNextPage}
              pageSize={defaultPageSize}
            />
          ) : (
            <EmptyProjectsList openModal={openModal} usageLimits={usageLimits} />
          )}
          {modal && <CreateProject onClose={closeModal} />}
        </Elem>
      </Oneof>
    </Block>
  );
};

ProjectsPage.title = "Projects";
ProjectsPage.path = "/projects";
ProjectsPage.exact = true;
ProjectsPage.routes = ({ store }) => [
  {
    title: () => store.project?.title,
    path: "/:id(\\d+)",
    exact: true,
    component: () => {
      const params = useRouterParams();

      return <Redirect to={`/projects/${params.id}/data`} />;
    },
    pages: {
      DataManagerPage,
      SettingsPage,
    },
  },
];
ProjectsPage.context = ({ openModal, showButton, usageLimits, canCreateProject }) => {
  if (!showButton) return null;
  
  const isDisabled = canCreateProject === false;
  const tooltipText = isDisabled 
    ? `Project limit reached. Your ${usageLimits?.tier || 'Free'} plan allows ${usageLimits?.max_projects || 1} project(s).`
    : 'Create Project';

  const button = (
    <Button 
      onClick={openModal} 
      look="primary" 
      size="compact"
      disabled={isDisabled}
      style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
    >
      Create
    </Button>
  );

  if (isDisabled) {
    return (
      <Tooltip title={tooltipText}>
        <span style={{ display: 'inline-block' }}>
          {button}
        </span>
      </Tooltip>
    );
  }

  return button;
};
