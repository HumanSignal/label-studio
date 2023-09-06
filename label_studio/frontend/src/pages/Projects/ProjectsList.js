import chr from 'chroma-js';
import { format } from 'date-fns';
import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { IconDone, IconTime, LsBulb, LsCheck, LsEllipsis, LsMinus } from '../../assets/icons';
import { Button, Dropdown, Menu, Pagination, Userpic } from '../../components';
import { Block, Elem } from '../../utils/bem';
import { absoluteURL } from '../../utils/helpers';

export const ProjectsList = ({ projects, currentPage, totalItems, totalPages, loadNextPage, pageSize }) => {
  return (
    <>
      <Elem name="projects-container">
        <Elem name="list">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Elem>
        <Elem name="pages">
          <Pagination
            name="projects-list"
            //label="Projects"
            page={currentPage}
            totalItems={totalItems}
            urlParamName="page"
            pageSize={pageSize}
            //pageSizeOptions={[10, 30, 50, 100]}
            onPageLoad={(page, pageSize) => loadNextPage(page, pageSize)}
            totalPages={totalPages}
            customRender={() => (
              <div className="project-container">
                <div className="project-list">
                  {projects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
                <div className="pagination-container">
                  <button
                    className="pagination-button"
                    onClick={() => loadNextPage(1)}
                    disabled={currentPage === 1}
                  > 
                    &lt;&lt;
                  </button>
                  <button
                    className="pagination-button"
                    onClick={() => loadNextPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>
                  <span className="pagination-text">
                    {currentPage} of {totalPages} page
                  </span>
                  <button
                    className="pagination-button"
                    onClick={() => loadNextPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    &gt; 
                  </button>
                  <button
                    className="pagination-button"
                    onClick={() => loadNextPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    &gt;&gt;
                  </button>
                </div>
              </div>
            )}

          />
        </Elem>
      </Elem>
    </>
  );
};

export const EmptyProjectsList = ({ openModal }) => {
  return (
    <Block name="empty-projects-page">
      <Elem name="heidi" tag="img" src={absoluteURL("/static/images/opossum_looking.png")} />
      <Elem name="header" tag="h1">Heidi doesn’t see any projects here</Elem>
      <p>Create one and start labeling your data</p>
      <Elem name="action" tag={Button} onClick={openModal} look="primary">Create New Project</Elem>
    </Block>
  );
};

const ProjectCard = ({ project }) => {
  const color = useMemo(() => {
    return project.color === '#FFFFFF' ? null : project.color;
  }, [project]);

  const projectColors = useMemo(() => {
    return color ? {
      '--header-color': color,
      '--background-color': chr(color).alpha(0.2).css(),
    } : {};
  }, [color]);

  return (
    <Elem tag={NavLink} name="link" to={`/projects/${project.id}/data`} data-external>
      <Block name="project-card" mod={{ colored: !!color }} style={projectColors}>
        <Elem name="header">
          <Elem name="title">
            <Elem name="title-text">
              {project.title ?? "New project"}
            </Elem>
            <Elem name="title-created-by">
              <Userpic src="#" user={project.created_by} showUsername />
            </Elem>
          </Elem>
          <Elem name="description">
            {project.description}
          </Elem>
        </Elem>
        <Elem name="info">
          <Elem name="summary">
            <Elem name="annotation">
              <Elem name="total">
                <IconDone/>{project.finished_task_number} of {project.task_number} tasks completed
              </Elem>
              <Elem name="detail">
                <Elem name="detail-item" mod={{ type: "completed" }}>
                  <Elem tag={LsCheck} name="icon" />
                  {project.total_annotations_number}
                </Elem>
                <Elem name="detail-item" mod={{ type: "rejected" }}>
                  <Elem tag={LsMinus} name="icon" />
                  {project.skipped_annotations_number}
                </Elem>
                <Elem name="detail-item" mod={{ type: "predictions" }}>
                  <Elem tag={LsBulb} name="icon" />
                  {project.total_predictions_number}
                </Elem>
                <Elem name="menu" onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}>
                  <Dropdown.Trigger content={(
                    <Menu>
                      <Menu.Item href={`/projects/${project.id}/settings`}>Settings</Menu.Item>
                      <Menu.Item href={`/projects/${project.id}/data?labeling=1`}>Label</Menu.Item>
                    </Menu>
                  )}>
                    <Button size="large" type="text" icon={<LsEllipsis />} />
                  </Dropdown.Trigger>
                </Elem>
              </Elem>

            </Elem>
            <Elem name="created-date">
              <IconTime/>{format(new Date(project.created_at), "dd/MM/yyyy 'at' HH:mm")}
            </Elem>
          </Elem>
        </Elem>
      </Block>
    </Elem>

  );
};
