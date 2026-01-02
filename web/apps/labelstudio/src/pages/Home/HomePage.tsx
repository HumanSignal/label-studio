import type { Page } from "../types/Page";
import { SimpleCard, Spinner, Tooltip } from "@humansignal/ui";
import { IconFolderAdd, IconUserAdd, IconFolderOpen } from "@humansignal/icons";
import { HeidiTips } from "../../components/HeidiTips/HeidiTips";
import { useQuery } from "@tanstack/react-query";
import { useAPI } from "../../providers/ApiProvider";
import { useState } from "react";
import { CreateProject } from "../CreateProject/CreateProject";
import { InviteLink } from "../Organization/PeoplePage/InviteLink";
import { Heading, Sub } from "@humansignal/typography";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import { Button } from "../../components";

const PROJECTS_TO_SHOW = 10;

const actions = [
  {
    title: "Create Project",
    icon: IconFolderAdd,
    type: "createProject",
  },
  {
    title: "Invite People",
    icon: IconUserAdd,
    type: "invitePeople",
  },
] as const;

type Action = (typeof actions)[number]["type"];

export const HomePage: Page = () => {
  const api = useAPI();
  const history = useHistory();
  const [creationDialogOpen, setCreationDialogOpen] = useState(false);
  const [invitationOpen, setInvitationOpen] = useState(false);
  const { data, isFetching, isSuccess, isError } = useQuery({
    queryKey: ["projects", { page_size: 10 }],
    async queryFn() {
      return api.callApi<{ results: APIProject[]; count: number }>("projects", {
        params: { page_size: PROJECTS_TO_SHOW },
      });
    },
  });

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

  const handleActions = (action: Action) => {
    return () => {
      switch (action) {
        case "createProject":
          setCreationDialogOpen(true);
          break;
        case "invitePeople":
          setInvitationOpen(true);
          break;
      }
    };
  };

  return (
    <main className="p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_450px] gap-6">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <Heading size={1}>Welcome 👋</Heading>
            <Sub>Let's get you started.</Sub>
          </div>
          <div className="flex justify-start gap-4">
            {actions.map((action) => {
              const canCreateProject = usageLimits?.can_create_project !== false;
              const isDisabled = action.type === "createProject" && !canCreateProject;
              const tooltipText = isDisabled 
                ? `Project limit reached. Your ${usageLimits?.tier || 'Free'} plan allows ${usageLimits?.max_projects || 1} project(s).`
                : undefined;
              
              const button = (
                <Button
                  key={action.title}
                  rawClassName="flex-grow-0 text-16/24 gap-2 text-primary-content text-left min-w-[250px] [&_svg]:w-6 [&_svg]:h-6 pl-2"
                  onClick={handleActions(action.type)}
                  disabled={isDisabled}
                  style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  <action.icon className="text-primary-icon" />
                  {action.title}
                </Button>
              );

              if (isDisabled && tooltipText) {
                return (
                  <Tooltip key={action.title} title={tooltipText}>
                    <span style={{ display: 'inline-block' }}>
                      {button}
                    </span>
                  </Tooltip>
                );
              }

              return button;
            })}
          </div>

          <SimpleCard
            title={
              data && data?.count > 0 ? (
                <>
                  Recent Projects{" "}
                  <a href="/projects" className="text-lg font-normal hover:underline">
                    View All
                  </a>
                </>
              ) : null
            }
          >
            {isFetching ? (
              <div className="h-64 flex justify-center items-center">
                <Spinner />
              </div>
            ) : isError ? (
              <div className="h-64 flex justify-center items-center">can't load projects</div>
            ) : isSuccess && data.results.length === 0 ? (
              <div className="flex flex-col justify-center items-center border border-primary-border-subtle bg-primary-emphasis-subtle rounded-lg h-64">
                <div
                  className={
                    "rounded-full w-12 h-12 flex justify-center items-center bg-accent-grape-subtle text-primary-icon"
                  }
                >
                  <IconFolderOpen />
                </div>
                <Heading size={2}>Create your first project</Heading>
                <Sub>Import your data and set up the labeling interface to start annotating</Sub>
                {(() => {
                  const isDisabled = usageLimits?.can_create_project === false;
                  const tooltipText = isDisabled 
                    ? `Project limit reached. Your ${usageLimits?.tier || 'Free'} plan allows ${usageLimits?.max_projects || 1} project(s).`
                    : undefined;
                  
                  const button = (
                    <Button 
                      primary 
                      rawClassName="mt-4" 
                      onClick={() => setCreationDialogOpen(true)}
                      disabled={isDisabled}
                      style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      Create Project
                    </Button>
                  );

                  if (isDisabled && tooltipText) {
                    return (
                      <Tooltip title={tooltipText}>
                        <span style={{ display: 'inline-block' }}>
                          {button}
                        </span>
                      </Tooltip>
                    );
                  }

                  return button;
                })()}
              </div>
            ) : isSuccess && data.results.length > 0 ? (
              <div className="flex flex-col gap-1">
                {data.results.map((project) => {
                  return <ProjectSimpleCard key={project.id} project={project} />;
                })}
              </div>
            ) : null}
          </SimpleCard>
        </section>
        <section className="flex flex-col gap-6">
          <HeidiTips collection="projectSettings" />
          <SimpleCard title="Resources" description="Learn, explore and get help" data-testid="resources-card">
            <div className="py-2 px-1 flex justify-center items-center text-neutral-content">
              Coming soon...
            </div>
          </SimpleCard>
        </section>
      </div>
      {creationDialogOpen && <CreateProject onClose={() => setCreationDialogOpen(false)} />}
      <InviteLink opened={invitationOpen} onClosed={() => setInvitationOpen(false)} />
    </main>
  );
};

HomePage.title = "Home";
HomePage.path = "/";
HomePage.exact = true;

function ProjectSimpleCard({
  project,
}: {
  project: APIProject;
}) {
  const finished = project.finished_task_number ?? 0;
  const total = project.task_number ?? 0;
  const progress = (total > 0 ? finished / total : 0) * 100;
  const white = "#FFFFFF";
  const color = project.color && project.color !== white ? project.color : "#E1DED5";

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block even:bg-neutral-surface rounded-sm overflow-hidden"
      data-external
    >
      <div
        className="grid grid-cols-[minmax(0,1fr)_150px] p-2 py-3 items-center border-l-[3px]"
        style={{ borderLeftColor: color }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-neutral-content">{project.title}</span>
          <div className="text-neutral-content-subtler text-sm">
            {finished} of {total} Tasks ({total > 0 ? Math.round((finished / total) * 100) : 0}%)
          </div>
        </div>
        <div className="bg-neutral-surface rounded-full overflow-hidden w-full h-2 shadow-neutral-border-subtle shadow-border-1">
          <div className="bg-positive-surface-hover h-full" style={{ maxWidth: `${progress}%` }} />
        </div>
      </div>
    </Link>
  );
}
