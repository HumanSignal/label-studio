import React, { useState } from 'react';
import { useParams as useRouterParams } from 'react-router';
import { Redirect } from 'react-router-dom';
import { Button } from '../../components';
import { Oneof } from '../../components/Oneof/Oneof';
import { Spinner } from '../../components/Spinner/Spinner';
import { ApiContext } from '../../providers/ApiProvider';
import { useContextProps } from '../../providers/RoutesProvider';
import { useAbortController } from "../../hooks/useAbortController";
import { Block, Elem } from '../../utils/bem';
import { FF_DEV_2575, isFF } from '../../utils/feature-flags';
import { CreateProject } from '../CreateProject/CreateProject';
import { DataManagerPage } from '../DataManager/DataManager';
import { SettingsPage } from '../Settings';
import './Projects.styl';
import { EmptyProjectsList, ProjectsList } from './ProjectsList';
import Swal from 'sweetalert2';
import axios from "axios";
import getWebhookUrl from '../../webhooks';

const getCurrentPage = () => {
  const pageNumberFromURL = new URLSearchParams(location.search).get("page");

  return pageNumberFromURL ? parseInt(pageNumberFromURL) : 1;
};

export const ProjectsPage = () => {
  const api = React.useContext(ApiContext);
  const abortController = useAbortController();
  const [projectsList, setProjectsList] = React.useState([]);
  const [networkState, setNetworkState] = React.useState(null);
  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const [totalItems, setTotalItems] = useState(1);
  const setContextProps = useContextProps();
  const defaultPageSize = parseInt(localStorage.getItem('pages:projects-list') ?? 30);
  const [availableProjects, setAvailableProjects] = useState({});
  const [modal, setModal] = React.useState(false);
  const openModal = setModal.bind(null, true);
  const closeModal = setModal.bind(null, false);
  const webhook_url = getWebhookUrl();

  const fetchProjects = async (page  = currentPage, pageSize = defaultPageSize) => {
    setNetworkState('loading');
    abortController.renew(); // Cancel any in flight requests

    const requestParams = { page, page_size: pageSize };

    if (isFF(FF_DEV_2575)) {
      requestParams.include = [
        'id',
        'title',
        'created_by',
        'created_at', 
        'color', 
        'is_published', 
        'assignment_settings', 
      ].join(',');
    }

    const data = await api.callApi("projects", {
      params: requestParams,
      ...!(isFF(FF_DEV_2575) ? {
        signal: abortController.controller.current.signal,
        errorFilter: (e) => e.error.includes('aborted'), 
      } : null),
    });

    setTotalItems(data?.count ?? 1);
    setProjectsList(data.results ?? []);
    setNetworkState('loaded');

    if (isFF(FF_DEV_2575) && data?.results?.length) {
      const additionalData = await api.callApi("projects", {
        params: { ids: data?.results?.map(({ id }) => id).join(',') },
        signal: abortController.controller.current.signal,
        errorFilter: (e) => e.error.includes('aborted'), 
      });
      if (additionalData?.results?.length) {
        setProjectsList(additionalData.results);
      }

    }
  };
  async function CloneExistingProject() {
    console.log("Cloning existing project");
    await axios
    .get(webhook_url + '/get_available_projects')
      .then((response) => {
        console.log(response);
        const available_projects = response.data;
        console.log(available_projects);
        const modified_projects = {};
        Object.keys(available_projects).forEach((key) => {
          modified_projects[parseInt(key)] = available_projects[key];
        });
        setAvailableProjects(modified_projects);
        const { value: project } = Swal.fire({
          title: 'Select a Project to Clone',
          input: 'select',
          inputOptions: available_projects,
          inputPlaceholder: 'Select a project',
          showCancelButton: true,
          inputValidator: (value) => {
            return new Promise(async (resolve) => {
              console.log(value);
              await axios.post(webhook_url + "/clone_existing_project?id=" + value).then((cloneResponse) => {
                const cloned = cloneResponse.data.clone;
                if (cloned) {
                  window.location.reload();
                }
                else {
                  Swal.fire("Error", "An error occurred while trying to clone the project", "error");
                }
              })
              resolve();
            })
          }
        })   
    if (project) {
      Swal.fire(`Cloning Project ${project}`)
    }
    })
    

  }
  const loadNextPage = async (page, pageSize) => {
    setCurrentPage(page);
    await fetchProjects(page, pageSize);
  };

  React.useEffect(() => {
    fetchProjects();
  }, []);

  React.useEffect(() => {
    // there is a nice page with Create button when list is empty
    // so don't show the context button in that case
    setContextProps({ openModal, showButton: projectsList.length > 0, CloneExistingProject});
  }, [projectsList.length]);

  return (
    <Block name="projects-page">
      <Oneof value={networkState}>
        <Elem name="loading" case="loading">
          <Spinner size={64}/>
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
            <EmptyProjectsList openModal={openModal} />
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

      return <Redirect to={`/projects/${params.id}/data`}/>;
    },
    pages: {
      DataManagerPage,
      SettingsPage,
    },
  },
];
ProjectsPage.context = ({ openModal, showButton, CloneExistingProject }) => {
  if (!showButton) return null;
  return (
    <Block>
    <Button onClick={CloneExistingProject} size="compact" style={{marginRight: 5}}>Clone Existing Project</Button>
    <Button onClick={openModal} look="primary" size="compact">Create</Button></Block>
)
};
