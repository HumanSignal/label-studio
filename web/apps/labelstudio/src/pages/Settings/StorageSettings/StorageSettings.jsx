import { Typography } from "@humansignal/ui";
import { useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { useProject } from "../../../providers/ProjectProvider";
import { cn } from "../../../utils/bem";
import { StorageSet } from "./StorageSet";

export const StorageSettings = () => {
  const { project } = useProject();
  const rootClass = cn("storage-settings"); // TODO: Remove in the next BEM cleanup
  const history = useHistory();
  const location = useLocation();
  const sourceStorageRef = useRef();

  useUpdatePageTitle(createTitleFromSegments([project?.title, "Cloud Storage Settings"]));

  // Handle auto-open query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("open") === "source") {
      // Auto-trigger "Add Source Storage" modal
      setTimeout(() => {
        sourceStorageRef.current?.openAddModal();
      }, 100); // Small delay to ensure component is mounted

      // Clean URL by removing the query parameter
      history.replace(location.pathname);
    }
  }, [location, history]);

  return (
    <section className="max-w-[680px]">
      <Typography variant="headline" size="medium" className="mb-base">
        Cloud Storage
      </Typography>
      <Typography size="small" className="text-neutral-content-subtler mb-wider">
        Use cloud or database storage as the source for your labeling tasks or the target of your completed annotations.
      </Typography>

      <div className="grid grid-cols-2 gap-8">
        <StorageSet
          ref={sourceStorageRef}
          title="Source Cloud Storage"
          buttonLabel="Add Source Storage"
          rootClass={rootClass}
        />

        <StorageSet
          title="Target Cloud Storage"
          target="export"
          buttonLabel="Add Target Storage"
          rootClass={rootClass}
        />
      </div>
    </section>
  );
};

StorageSettings.title = "Cloud Storage";
StorageSettings.path = "/storage";
