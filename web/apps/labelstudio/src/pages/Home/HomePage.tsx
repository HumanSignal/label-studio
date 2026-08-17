import {
  ArrowSquareOutIcon,
  FolderOpenIcon,
  FolderSimplePlusIcon,
  IconHumanSignal,
  UserPlusIcon,
} from "@humansignal/icons";
import { Button, SimpleCard, Spinner, Tooltip, Typography } from "@humansignal/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useUpdatePageTitle } from "@humansignal/core";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { HeidiTips } from "../../components/HeidiTips/HeidiTips";
import { useAPI } from "../../providers/ApiProvider";
import { CreateProject } from "../CreateProject/CreateProject";
import { InviteLink } from "../Organization/PeoplePage/InviteLink";
import type { Page } from "../types/Page";
import {
  creationDialogOpen,
  invitationOpen,
  locationKeyAtom,
  PROJECTS_TO_SHOW,
  projectsDataAtom,
  sortedProjectsAtom,
  visitedIdsAtom,
} from "./atoms";

const resources = [
  {
    titleKey: "projects:resourceDocumentation",
    url: "https://labelstud.io/guide/",
  },
  {
    titleKey: "projects:resourceApiDocumentation",
    url: "https://api.labelstud.io/api-reference/introduction/getting-started",
  },
  {
    titleKey: "projects:resourceReleaseNotes",
    url: "https://labelstud.io/learn/categories/release-notes/",
  },
  {
    titleKey: "projects:resourceBlog",
    url: "https://labelstud.io/blog/",
  },
  {
    titleKey: "projects:resourceSlack",
    url: "https://slack.labelstud.io",
  },
];

const actions = [
  {
    titleKey: "projects:createProject",
    icon: FolderSimplePlusIcon,
    type: "createProject",
  },
  {
    titleKey: "projects:inviteMembers",
    icon: UserPlusIcon,
    type: "inviteMembers",
  },
] as const;

type Action = (typeof actions)[number]["type"];

export const HomePage: Page = () => {
  const api = useAPI();
  const location = useLocation();
  const { t } = useTranslation();
  const [modalIsOpen, setModalIsOpen] = useAtom(creationDialogOpen);
  const [invitationIsOpen, setInvitationIsOpen] = useAtom(invitationOpen);
  const setLocationKey = useSetAtom(locationKeyAtom);
  const setProjectsData = useSetAtom(projectsDataAtom);
  const sortedProjects = useAtomValue(sortedProjectsAtom);
  const visitedIds = useAtomValue(visitedIdsAtom);

  useUpdatePageTitle(t("menubar:home"));

  // Fetch regular projects
  const { data, isFetching, isSuccess, isError } = useQuery({
    queryKey: ["projects", { page_size: PROJECTS_TO_SHOW }],
    async queryFn() {
      return api.callApi<{ results: APIProject[]; count: number }>("projects", {
        params: { page_size: PROJECTS_TO_SHOW },
      });
    },
  });

  // Fetch visited projects specifically by their IDs
  const { data: visitedProjectsData } = useQuery({
    queryKey: ["visited-projects", { ids: visitedIds }],
    async queryFn() {
      if (visitedIds.length === 0) return { results: [], count: 0 };

      return api.callApi<{ results: APIProject[]; count: number }>("projects", {
        params: {
          ids: visitedIds.join(","),
          page_size: visitedIds.length,
        },
      });
    },
    enabled: visitedIds.length > 0,
  });

  // Update location key atom when navigating to/returning to this page
  // This triggers visitedIdsAtom to re-read from localStorage
  // We use a timestamp to ensure the atom always updates, forcing a re-read
  useEffect(() => {
    setLocationKey(Date.now().toString());
  }, [location.pathname, setLocationKey]);

  // Merge visited and regular projects, removing duplicates
  useEffect(() => {
    const visitedProjects = visitedProjectsData?.results ?? [];
    const regularProjects = data?.results ?? [];

    // Merge and deduplicate
    const allProjects = [...visitedProjects, ...regularProjects];
    const uniqueProjects = Array.from(new Map(allProjects.map((p) => [p.id, p])).values());

    if (uniqueProjects.length > 0) {
      setProjectsData(uniqueProjects);
    }
  }, [data?.results, visitedProjectsData?.results, setProjectsData]);

  const handleActions = (action: Action) => {
    return () => {
      switch (action) {
        case "createProject":
          setModalIsOpen(true);
          break;
        case "inviteMembers":
          setInvitationIsOpen(true);
          break;
      }
    };
  };

  return (
    <main className="p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_450px] gap-6">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <Typography variant="headline" size="small">
              {t("projects:welcomeTitle")}
            </Typography>
            <Typography size="small" className="text-neutral-content-subtler">
              {t("projects:welcomeSubtitle")}
            </Typography>
          </div>
          <div className="flex justify-start gap-4">
            {actions.map((action) => {
              return (
                <Button
                  key={action.type}
                  look="outlined"
                  align="center"
                  className="flex-grow-0 text-16/24 gap-2 text-primary-content text-left min-w-[250px] [&_svg]:w-6 [&_svg]:h-6 pl-2"
                  onClick={handleActions(action.type)}
                  leading={<action.icon />}
                >
                  {t(action.titleKey)}
                </Button>
              );
            })}
          </div>

          <SimpleCard
            title={
              data && data?.count > 0 ? (
                <>
                  {t("projects:recentProjects")}{" "}
                  <a href="/projects" className="text-lg font-normal hover:underline">
                    {t("projects:viewAll")}
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
              <div className="h-64 flex justify-center items-center">{t("projects:cantLoadProjects")}</div>
            ) : isSuccess && data && sortedProjects.length === 0 ? (
              <div className="flex flex-col justify-center items-center border border-primary-border-subtle bg-primary-emphasis-subtle rounded-lg h-64">
                <div
                  className={
                    "rounded-full w-12 h-12 flex justify-center items-center bg-accent-grape-subtle text-primary-icon"
                  }
                >
                  <FolderOpenIcon />
                </div>
                <Typography variant="headline" size="small">
                  {t("projects:createFirstProject")}
                </Typography>
                <Typography size="small" className="text-neutral-content-subtler">
                  {t("projects:firstProjectHint")}
                </Typography>
                <Button
                  className="mt-4"
                  onClick={() => setModalIsOpen(true)}
                  aria-label={t("projects:createNewProject")}
                >
                  {t("projects:createProject")}
                </Button>
              </div>
            ) : isSuccess && data && sortedProjects.length > 0 ? (
              <div className="flex flex-col gap-1">
                {sortedProjects.map((project) => {
                  return <ProjectSimpleCard key={project.id} project={project} />;
                })}
              </div>
            ) : null}
          </SimpleCard>
        </section>
        <section className="flex flex-col gap-6">
          <HeidiTips collection="projectSettings" />
          <SimpleCard
            title={t("projects:resourcesTitle")}
            description={t("projects:resourcesDescription")}
            data-testid="resources-card"
          >
            <ul>
              {resources.map((link) => {
                return (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      className="py-2 px-1 flex justify-between items-center text-neutral-content"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t(link.titleKey)}
                      <ArrowSquareOutIcon className="text-primary-icon" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </SimpleCard>
          <div className="flex gap-2 items-center">
            <IconHumanSignal />
            <span className="text-neutral-content-subtle">{t("projects:versionCommunity")}</span>
          </div>
        </section>
      </div>
      {modalIsOpen && <CreateProject onClose={() => setModalIsOpen(false)} />}
      <InviteLink opened={invitationIsOpen} onClosed={() => setInvitationIsOpen(false)} />
    </main>
  );
};

Object.defineProperty(HomePage, "title", {
  get: () => i18next.t("menubar:home"),
});
HomePage.path = "/";
HomePage.exact = true;

function ProjectSimpleCard({ project }: { project: APIProject }) {
  const { t } = useTranslation();
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
          <Tooltip title={project.title}>
            <span className="text-neutral-content truncate">{project.title}</span>
          </Tooltip>
          <div className="text-neutral-content-subtler text-sm">
            {t("projects:homeProgress", {
              finished,
              total,
              percent: total > 0 ? Math.round((finished / total) * 100) : 0,
            })}
          </div>
        </div>
        <div className="bg-neutral-surface rounded-full overflow-hidden w-full h-2 shadow-neutral-border-subtle shadow-border-1">
          <div className="bg-positive-surface-hover h-full" style={{ maxWidth: `${progress}%` }} />
        </div>
      </div>
    </Link>
  );
}
