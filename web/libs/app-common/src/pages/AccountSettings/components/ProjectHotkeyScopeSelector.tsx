import { useAPI } from "@humansignal/core";
import { Message, Select, Typography } from "@humansignal/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

const ACCOUNT_VALUE = "account";
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

interface Project {
  id: number;
  title: string;
  workspace_title?: string | null;
}

interface ProjectsResponse {
  count?: number;
  results?: Project[];
}

export type ProjectHotkeyScopeSelection =
  | { kind: "account" }
  | { kind: "project"; projectId: number; projectTitle: string };

export type ProjectHotkeyScopeResolution =
  | { status: "account" }
  | { status: "loading"; projectId: number }
  | { status: "project"; projectId: number; projectTitle: string }
  | { status: "invalid"; projectId?: number };

interface PropsProjectHotkeyScopeSelector {
  onResolutionChange?: (resolution: ProjectHotkeyScopeResolution) => void;
  disabled?: boolean;
}

export const parseProjectHotkeyScopeFromSearch = (search: string): ProjectHotkeyScopeResolution => {
  const project = new URLSearchParams(search).get("project");
  if (project === null) return { status: "account" };
  if (!/^[1-9]\d*$/.test(project)) return { status: "invalid" };

  const projectId = Number(project);
  return Number.isSafeInteger(projectId) ? { status: "loading", projectId } : { status: "invalid" };
};

const isEnterpriseHotkeyPicker = (): boolean => window.APP_SETTINGS?.billing !== undefined;

const projectListFields = (): string => (isEnterpriseHotkeyPicker() ? "id,title,workspace_title" : "id,title");

export const ProjectHotkeyScopeSelector = ({
  onResolutionChange,
  disabled = false,
}: PropsProjectHotkeyScopeSelector) => {
  const { t } = useTranslation();
  const api = useAPI();
  const history = useHistory();
  const location = useLocation();
  const parsedProject = useMemo(() => parseProjectHotkeyScopeFromSearch(location.search), [location.search]);
  const hasProjectQuery = parsedProject.status !== "account";
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [projectCount, setProjectCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(hasProjectQuery);
  const [hasAccessError, setHasAccessError] = useState(parsedProject.status === "invalid");
  const searchRequest = useRef(0);
  const resolutionRequest = useRef(0);
  const listFields = projectListFields();

  const updateUrl = useCallback(
    (selection: ProjectHotkeyScopeSelection) => {
      const params = new URLSearchParams(location.search);
      if (selection.kind === "project") {
        params.set("project", String(selection.projectId));
      } else {
        params.delete("project");
      }
      const nextSearch = params.toString();
      history.push({
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      });
    },
    [history, location.pathname, location.search],
  );

  useEffect(() => {
    if (parsedProject.status === "account") {
      setSelectedProject(null);
      setHasAccessError(false);
      setIsResolving(false);
      onResolutionChange?.({ status: "account" });
      return;
    }
    if (parsedProject.status === "invalid") {
      setSelectedProject(null);
      setHasAccessError(true);
      setIsResolving(false);
      onResolutionChange?.({ status: "invalid", projectId: parsedProject.projectId });
      return;
    }

    const projectId = parsedProject.projectId;
    const requestId = ++resolutionRequest.current;
    const controller = new AbortController();
    setSelectedProject(null);
    setHasAccessError(false);
    setIsResolving(true);
    onResolutionChange?.({ status: "loading", projectId });

    void api
      .callApi<ProjectsResponse>("projects", {
        params: {
          ids: String(projectId),
          fields: listFields,
          page: 1,
          page_size: 1,
        },
        signal: controller.signal,
        suppressError: true,
      })
      .then((response) => {
        if (requestId !== resolutionRequest.current) return;
        const project = response?.results?.find(({ id }) => id === projectId);
        setSelectedProject(project ?? null);
        setHasAccessError(!project);
        setIsResolving(false);
        onResolutionChange?.(
          project
            ? { status: "project", projectId: project.id, projectTitle: project.title }
            : { status: "invalid", projectId },
        );
      })
      .catch((error: unknown) => {
        if (requestId !== resolutionRequest.current || controller.signal.aborted) return;
        console.warn("Failed to resolve project hotkey scope:", error);
        setSelectedProject(null);
        setHasAccessError(true);
        setIsResolving(false);
        onResolutionChange?.({ status: "invalid", projectId });
      });

    return () => {
      controller.abort();
      resolutionRequest.current += 1;
    };
  }, [api, listFields, onResolutionChange, parsedProject]);

  useEffect(() => {
    const requestId = ++searchRequest.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      void api
        .callApi<ProjectsResponse>("projects", {
          params: {
            fields: listFields,
            search,
            page,
            page_size: PAGE_SIZE,
          },
          signal: controller.signal,
          suppressError: true,
        })
        .then((response) => {
          if (requestId !== searchRequest.current) return;
          const results = response?.results ?? [];
          setProjects((current) => (page === 1 ? results : [...current, ...results]));
          setProjectCount(response?.count ?? results.length);
        })
        .catch((error: unknown) => {
          if (requestId !== searchRequest.current || controller.signal.aborted) return;
          console.warn("Failed to search accessible projects:", error);
          if (page === 1) setProjects([]);
          setProjectCount(0);
        })
        .finally(() => {
          if (requestId === searchRequest.current) setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, listFields, page, search]);

  const projectOptions = useMemo(() => {
    const uniqueProjects = new Map<number, Project>();
    if (selectedProject) uniqueProjects.set(selectedProject.id, selectedProject);
    for (const project of projects) uniqueProjects.set(project.id, project);
    return [...uniqueProjects.values()].map((project) => ({
      value: `project:${project.id}`,
      label: project.title,
      description: project.workspace_title ?? undefined,
    }));
  }, [projects, selectedProject]);

  const options = useMemo(
    () => [{ value: ACCOUNT_VALUE, label: t("account:accountAccountDefaultsOption") }, ...projectOptions],
    [projectOptions, t],
  );
  const selectedValue =
    parsedProject.status === "account" ? ACCOUNT_VALUE : selectedProject ? `project:${selectedProject.id}` : undefined;

  return (
    <div className="flex flex-col gap-tight">
      <Select
        name="hotkey-scope"
        label={t("account:accountHotkeysForLabel")}
        placeholder={hasAccessError ? t("account:accountProjectUnavailable") : t("account:accountSelectHotkeyScope")}
        options={options}
        value={selectedValue}
        searchable
        searchPlaceholder={t("account:accountSearchProjects")}
        searchFilter={() => true}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        isLoading={isSearching || isResolving}
        isVirtualList
        loadMore={() => {
          if (!isSearching && projects.length < projectCount) setPage((current) => current + 1);
        }}
        page={page}
        pageSize={PAGE_SIZE}
        itemCount={projectCount + 1}
        disabled={disabled}
        dataTestid="project-hotkey-scope-selector"
        onChange={(value) => {
          if (value === ACCOUNT_VALUE) {
            updateUrl({ kind: "account" });
            return;
          }
          const projectId = Number(String(value).replace("project:", ""));
          const project = [selectedProject, ...projects].find((item) => item?.id === projectId);
          if (project) {
            updateUrl({ kind: "project", projectId: project.id, projectTitle: project.title });
          }
        }}
        footer={
          !isSearching && projects.length === 0 ? (
            <Typography variant="body" size="small" className="text-neutral-content-subtle">
              {t("account:accountNoAccessibleProjects")}
            </Typography>
          ) : undefined
        }
      />
      {hasAccessError && (
        <Message variant="negative" title={t("account:accountProjectUnavailable")}>
          {t("account:accountProjectUnavailableBody")}
        </Message>
      )}
    </div>
  );
};
