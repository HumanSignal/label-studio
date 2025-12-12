import { Button, Spinner, Typography } from "@humansignal/ui";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { useProject } from "../../../providers/ProjectProvider";
import { cn } from "../../../utils/bem";
import { confirm } from "../../../components/Modal/Modal";
import { StorageSet } from "./StorageSet";
import { useStorageCard } from "./hooks/useStorageCard";
import { StorageControlBar } from "./StorageControlBar";
import { StorageList } from "./StorageList";
import { ApiContext } from "../../../providers/ApiProvider";
import "./StorageSettings.scss";

export const StorageSettings = () => {
  const { project } = useProject();
  const rootClass = cn("storage-settings"); // TODO: Remove in the next BEM cleanup
  const history = useHistory();
  const location = useLocation();
  const api = useContext(ApiContext);
  const sourceStorageRef = useRef();
  const targetStorageRef = useRef();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "source", "target"
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useUpdatePageTitle(createTitleFromSegments([project?.title, "Connection Management"]));

  // Fetch storage data at parent level
  const sourceStorage = useStorageCard("", project?.id);
  const targetStorage = useStorageCard("export", project?.id);

  // Check if any storages exist
  const hasAnyStorages = sourceStorage.storages?.length > 0 || targetStorage.storages?.length > 0;
  const isLoading = sourceStorage.loading || targetStorage.loading;
  const isLoaded = sourceStorage.loaded && targetStorage.loaded;

  // Combine all storages with their target type
  const allStorages = useMemo(() => {
    const source = (sourceStorage.storages || []).map((s) => ({ ...s, target: "import" }));
    const target = (targetStorage.storages || []).map((s) => ({ ...s, target: "export" }));
    return [...source, ...target];
  }, [sourceStorage.storages, targetStorage.storages]);

  // Get storage types (combine from both)
  const storageTypes = useMemo(() => {
    const sourceTypes = sourceStorage.storageTypes || [];
    const targetTypes = targetStorage.storageTypes || [];
    const combined = [...sourceTypes];
    targetTypes.forEach((tt) => {
      if (!combined.find((st) => st.name === tt.name)) {
        combined.push(tt);
      }
    });
    return combined;
  }, [sourceStorage.storageTypes, targetStorage.storageTypes]);

  // Filter storages by search query and filter type
  const filteredStorages = useMemo(() => {
    let filtered = allStorages;

    // Filter by type
    if (filterType === "source") {
      filtered = filtered.filter((s) => s.target === "import");
    } else if (filterType === "target") {
      filtered = filtered.filter((s) => s.target === "export");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => {
        const storageTypeTitle = storageTypes.find((st) => st.name === s.type)?.title || "";
        return (
          s.title?.toLowerCase().includes(query) ||
          s.type?.toLowerCase().includes(query) ||
          storageTypeTitle.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [allStorages, filterType, searchQuery, storageTypes]);

  // Paginate filtered storages
  const paginatedStorages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredStorages.slice(start, end);
  }, [filteredStorages, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStorages.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  // Handle auto-open query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("open") === "source" && isLoaded) {
      // Auto-trigger "Add Source Storage" modal
      setTimeout(() => {
        sourceStorageRef.current?.openAddModal();
      }, 100); // Small delay to ensure component is mounted

      // Clean URL by removing the query parameter
      history.replace(location.pathname);
    }
  }, [location, history, isLoaded]);

  const handleDeleteStorage = async (storage) => {
    confirm({
      title: "Deleting storage",
      body: "This action cannot be undone. Are you sure?",
      buttonLook: "negative",
      onOk: async () => {
        const response = await api.callApi("deleteStorage", {
          params: {
            type: storage.type,
            pk: storage.id,
            target: storage.target === "export" ? "export" : "",
          },
        });

        if (response !== null) {
          if (storage.target === "export") {
            await targetStorage.fetchStorages();
          } else {
            await sourceStorage.fetchStorages();
          }
        }
      },
    });
  };

  return (
    <div className="max-w-[1200px]">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-wider">
        <div>
          <Typography variant="headline" size="large" className="mb-2">
            Connection Management
          </Typography>
          <Typography size="small" className="text-neutral-content-subtler">
            Manage your cloud connections and verify dataset sync status.
          </Typography>
        </div>
        <div className="flex gap-2">
          <Button
            look="outlined"
            variant="neutral"
            size="small"
            className={cn("border-primary-border")}
          >
            Overview
          </Button>
          <Button look="outlined" variant="neutral" size="small">
            Log
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <StorageControlBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
        onAddSource={() => sourceStorageRef.current?.openAddModal()}
        onAddTarget={() => targetStorageRef.current?.openAddModal()}
      />

      {/* Always render StorageSet components (hidden) so refs are populated */}
      <div className="hidden">
        <StorageSet
          ref={sourceStorageRef}
          title="Source Cloud Storage"
          buttonLabel="Add Source Storage"
          rootClass={rootClass}
          storageTypes={sourceStorage.storageTypes}
          storages={sourceStorage.storages}
          storagesLoaded={sourceStorage.storagesLoaded}
          loading={sourceStorage.loading}
          loaded={sourceStorage.loaded}
          fetchStorages={sourceStorage.fetchStorages}
        />
        <StorageSet
          ref={targetStorageRef}
          title="Target Cloud Storage"
          target="export"
          buttonLabel="Add Target Storage"
          rootClass={rootClass}
          storageTypes={targetStorage.storageTypes}
          storages={targetStorage.storages}
          storagesLoaded={targetStorage.storagesLoaded}
          loading={targetStorage.loading}
          loaded={targetStorage.loaded}
          fetchStorages={targetStorage.fetchStorages}
        />
      </div>

      {/* Loading State */}
      {isLoading && !isLoaded && (
        <div className="flex items-center justify-center h-[50rem]">
          <Spinner />
        </div>
      )}

      {/* Connection Cards Grid */}
      {isLoaded && !isLoading && (
        <StorageList
          storages={paginatedStorages}
          storageTypes={storageTypes}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredStorages.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onEditStorage={(s) => {
            const showModal = s.target === "export"
              ? targetStorageRef.current?.openEditModal
              : sourceStorageRef.current?.openEditModal;
            if (showModal) {
              showModal(s);
            }
          }}
          onDeleteStorage={handleDeleteStorage}
          onAddSource={() => sourceStorageRef.current?.openAddModal()}
          onAddTarget={() => targetStorageRef.current?.openAddModal()}
          rootClass={rootClass}
        />
      )}
    </div>
  );
};

StorageSettings.title = "Cloud Storage";
StorageSettings.path = "/storage";
