import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { Divider } from "../../../components/Divider/Divider";
import { EmptyState, SimpleCard } from "@humansignal/ui";
import { Typography } from "@humansignal/ui";
import { IconExternal, IconPredictions } from "@humansignal/icons";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { useAPI } from "../../../providers/ApiProvider";
import { ProjectContext } from "../../../providers/ProjectProvider";
import { Spinner } from "../../../components/Spinner/Spinner";
import { PredictionsList } from "./PredictionsList";
import { ImportPredictionsExample } from "./ImportPredictionsExample";

export const PredictionsSettings = () => {
  const api = useAPI();
  const { project } = useContext(ProjectContext);
  const { t } = useTranslation();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useUpdatePageTitle(createTitleFromSegments([project?.title, t("settings:predictionsSettingsPageTitle")]));

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    const versions = await api.callApi("projectModelVersions", {
      params: {
        pk: project.id,
        extended: true,
      },
    });

    if (versions) setVersions(versions.static);
    setLoading(false);
    setLoaded(true);
  }, [project, setVersions]);

  useEffect(() => {
    if (project.id) {
      fetchVersions();
    }
  }, [project]);

  return (
    <section className="max-w-[42rem]">
      <Typography variant="headline" size="medium" className="mb-tight">
        {t("settings:predictionsHeadline")}
      </Typography>
      <div>
        {loading && <Spinner size={32} />}

        {loaded && versions.length > 0 && (
          <>
            <Typography variant="title" size="medium">
              {t("settings:predictionsListTitle")}
            </Typography>
            <Typography size="small" className="text-neutral-content-subtler mt-base mb-wider">
              {t("settings:predictionsListDescription")}
            </Typography>
          </>
        )}

        {loaded && versions.length === 0 && (
          <SimpleCard title="" className="bg-primary-background border-primary-border-subtler p-base">
            <EmptyState
              size="medium"
              variant="primary"
              icon={<IconPredictions />}
              title={t("settings:noPredictionsTitle")}
              description={t("settings:noPredictionsDescription")}
              footer={
                !window.APP_SETTINGS?.whitelabel_is_active && (
                  <Typography variant="label" size="small" className="text-primary-link">
                    <a
                      href="https://labelstud.io/guide/predictions"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="predictions-help-link"
                      aria-label={t("settings:learnMorePredictionsAria")}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {t("settings:learnMore")}
                      <IconExternal width={16} height={16} />
                    </a>
                  </Typography>
                )
              }
            />
          </SimpleCard>
        )}

        <PredictionsList project={project} versions={versions} fetchVersions={fetchVersions} />

        <ImportPredictionsExample />

        <Divider height={32} />
      </div>
    </section>
  );
};

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
Object.defineProperty(PredictionsSettings, "title", {
  get: () => i18next.t("settings:navPredictions"),
});
PredictionsSettings.path = "/predictions";
