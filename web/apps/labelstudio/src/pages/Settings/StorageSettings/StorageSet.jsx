import { StorageProviderForm } from "@humansignal/app-common/blocks/StorageProviderForm";
import { ff } from "@humansignal/core";
import { ConfirmDialog, Button, ModalWindow } from "@humansignal/ui";
import { useAtomValue } from "jotai";
import { useState, forwardRef, useCallback, useContext, useImperativeHandle } from "react";
import { Columns } from "../../../components";
import { Spinner } from "../../../components/Spinner/Spinner";
import { ApiContext } from "../../../providers/ApiProvider";
import { projectAtom } from "../../../providers/ProjectProvider";
import { providers } from "./providers";
import { StorageCard } from "./StorageCard";
import { StorageForm } from "./StorageForm";

export const StorageSet = forwardRef(
  (
    {
      title,
      target,
      rootClass,
      buttonLabel,
      // Props from parent for lifted state
      storageTypes,
      storages,
      storagesLoaded,
      loading,
      loaded,
      fetchStorages,
    },
    ref,
  ) => {
    const [pendingConfirm, setPendingConfirm] = useState(null);
    const api = useContext(ApiContext);
    const project = useAtomValue(projectAtom);

    const useNewStorageScreen = ff.isActive(ff.FF_NEW_STORAGES);

    const [storageDialog, setStorageDialog] = useState(null);
    const closeStorageDialog = () => setStorageDialog(null);

    const showStorageFormModal = useCallback(
      (storage) => {
        const action = storage ? "Edit" : "Connect";
        const actionTarget = target === "export" ? "Target" : "Source";
        const title = `${action} ${actionTarget} Storage`;

        setStorageDialog({ storage, title });
      },
      [project, fetchStorages, target, rootClass],
    );

    const onEditStorage = useCallback(
      async (storage) => {
        showStorageFormModal(storage);
      },
      [showStorageFormModal],
    );

    // Expose showStorageFormModal to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        openAddModal: () => showStorageFormModal(),
      }),
      [showStorageFormModal],
    );

    const onDeleteStorage = useCallback(
      async (storage) => {
        setPendingConfirm({
          title: "Deleting storage",
          children: "This action cannot be undone. Are you sure?",
          buttonLook: "negative",
          onOk: async () => {
            const response = await api.callApi("deleteStorage", {
              params: {
                type: storage.type,
                pk: storage.id,
                target,
              },
            });

            if (response !== null) fetchStorages();
          },
        });
      },
      [fetchStorages],
    );

    return (
      <Columns.Column title={title}>
        <div className={rootClass.elem("controls").toClassName()}>
          <Button
            onClick={() => showStorageFormModal()}
            disabled={loading}
            look="outlined"
            data-testid={`add-${target === "export" ? "target" : "source"}-storage-button`}
            aria-label={`Add ${target === "export" ? "Target" : "Source"} Storage`}
          >
            {buttonLabel}
          </Button>
        </div>

        {loading && !loaded ? (
          <div className={rootClass.elem("empty").toClassName()}>
            <Spinner size={32} />
          </div>
        ) : storagesLoaded && storages.length === 0 ? null : (
          storages?.map?.((storage) => (
            <StorageCard
              key={storage.id}
              storage={storage}
              target={target}
              rootClass={rootClass}
              storageTypes={storageTypes}
              onEditStorage={onEditStorage}
              onDeleteStorage={onDeleteStorage}
            />
          ))
        )}
        {useNewStorageScreen ? (
          storageDialog && (
            <StorageProviderForm
              dataTestId="storage-form-modal"
              title={storageDialog.title}
              target={target}
              storage={storageDialog.storage}
              project={project.id}
              rootClass={rootClass}
              storageTypes={storageTypes}
              providers={providers}
              onClose={closeStorageDialog}
              onSubmit={async () => {
                closeStorageDialog();
                fetchStorages();
              }}
            />
          )
        ) : (
          <ModalWindow
            open={storageDialog !== null}
            onOpenChange={(open) => !open && closeStorageDialog()}
            title={storageDialog?.title}
            size="large"
            closeOnScrimClick={false}
            dataTestId="storage-form-modal"
          >
            {storageDialog && (
              <StorageForm
                target={target}
                storage={storageDialog.storage}
                project={project.id}
                rootClass={rootClass}
                storageTypes={storageTypes}
                onSubmit={async () => {
                  await fetchStorages();
                  closeStorageDialog();
                }}
              />
            )}
          </ModalWindow>
        )}
        <ConfirmDialog
          {...pendingConfirm}
          open={pendingConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setPendingConfirm(null);
          }}
        />
      </Columns.Column>
    );
  },
);
