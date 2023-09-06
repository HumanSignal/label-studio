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
  //const defaultPageSize = parseInt(localStorage.getItem('pages:projects-list') ?? 10);
  const defaultPageSize = 10;
  const [modal, setModal] = React.useState(false);
  const openModal = setModal.bind(null, true);
  const closeModal = setModal.bind(null, false);
  const [searchQuery, setSearchQuery] = useState('');
  







  const fetchProjects = async () => {
    setNetworkState('loading');
    abortController.renew(); // Cancel any in flight requests


    const requestParams = {
      page: 1,
      page_size: 9999,
    };





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
      ...(isFF(FF_DEV_2575) ? {
        signal: abortController.controller.current.signal,
        errorFilter: (e) => e.error.includes('aborted'),
      } : null),
    });

    setTotalItems(data?.count ?? 1);
    setProjectsList(data.results ?? []);
    setNetworkState('loaded');

    if (isFF(FF_DEV_2575) && data?.results?.length) {
      const additionalData = await api.callApi("projects", {
        params: {
          ids: data?.results?.map(({ id }) => id).join(','),
          include: [
            'id',
            'description',
            'num_tasks_with_annotations',
            'task_number',
            'skipped_annotations_number',
            'total_annotations_number',
            'total_predictions_number',
            'ground_truth_number',
            'finished_task_number',
          ].join(','),
          page_size: data.count,
        },
        signal: abortController.controller.current.signal,
        errorFilter: (e) => e.error.includes('aborted'),
      });

      if (additionalData?.results?.length) {
        setProjectsList(prev =>
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

  // Filter projects based on the search query
  const filteredProjects = projectsList.filter((project) =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  React.useEffect(() => {
    fetchProjects();
  }, []);

  React.useEffect(() => {
    // there is a nice page with Create button when list is empty
    // so don't show the context button in that case
    setContextProps({ openModal, showButton: projectsList.length > 0, searchQuery, setSearchQuery });
  }, [projectsList.length, searchQuery, setSearchQuery]);

  const pageTitle = "Create a New Projects";
  const pageDescription = "Set up tasks and import photos, videos, text, and audio to annotate";
  const showCreateButton = projectsList.length > 0;
  // const pageSize = 11;
  // const totalPages = Math.ceil(projectsList.length / pageSize);
  // Inside the render method

  // const filteredProjects = projectsList.filter((project) =>
  //   project.title.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  // Debugging: Console log statements
  console.log('Search Query:', searchQuery);
  console.log('Filtered Projects:', filteredProjects);
  console.log('Projects List:', projectsList);
  




  return (
    <Block name="projects-page">
      <Oneof value={networkState}>
        <Elem name="loading" case="loading">
          <Spinner size={64} />
        </Elem>
        <Elem name="content" case="loaded">

          {/* Title */}
          {showCreateButton && (
            <Elem name="title-container">
              <Elem name="title-info">
                <h3>{pageTitle}</h3>
                <p>{pageDescription}</p>
              </Elem>

              <Elem name="create-project-button">
                <Button onClick={openModal} look="primary" size="compact">
                  + Create Project
                </Button>
              </Elem>

            </Elem>
          )}


          {/* Projects List Container */}
          <Elem name="projects-list-container">
            {filteredProjects.length ? (
              <ProjectsList
                projects={filteredProjects}
                currentPage={currentPage}
                totalItems={totalItems}
                loadNextPage={loadNextPage}
                pageSize={defaultPageSize}
              />
            ) : (
              <EmptyProjectsList openModal={openModal} />
            )}
          </Elem>
          {modal && <CreateProject onClose={closeModal} />}
        </Elem>
      </Oneof>
    </Block>
  );
};

ProjectsPage.context = ({ showButton, searchQuery, setSearchQuery }) => {
  if (!showButton) return null;
  return (
    <div className="context-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Search Box */}
      <input
        className='input-context'
        type="text"
        placeholder="Search..."
        style={{ width: '500px', borderRadius: '10px', marginRight: '100px', padding: '10px' }}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};


// ProjectsPage.context = ({ showButton }) => {
//   const [searchQuery, setSearchQuery] = useState('');

//   if (!showButton) return null;
//   return (
//     <div className="context-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
//       {/* Search Box */}
//       <input
//         className='input-context'
//         type="text"
//         placeholder="Search..."
//         style={{ width: '600px', borderRadius: '10px', marginright: '100px', padding: '10px' }}
//         value={searchQuery}
//         onChange={(e) => console.log(e.target.value)}
//       />
//     </div>

//   );
// };

ProjectsPage.path = "/projects";
ProjectsPage.exact = true;
ProjectsPage.routes = ({ store }) => [
  {
    // title: store.project?.title,
    // set the title to empty string to remove the route title from the page
    title: "",
    path: "/:id(\\d+)",
    exact: true,
    component: () => {
      const params = useRouterParams();


      return (
        <>
          <Redirect to={`/projects/${params.id}/data`} />
        </>
      );
    },
    pages: {
      DataManagerPage,
      SettingsPage,
    },
  },
];

