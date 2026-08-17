import { format } from "date-fns";
import { getDateFnsLocale } from "@humansignal/app-common/i18n/dateLocale";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import styles from "./MembershipInfo.module.css";
import { useQuery } from "@tanstack/react-query";
import { getApiInstance } from "@humansignal/core";
import { useMemo } from "react";
import type { WrappedResponse } from "@humansignal/core/lib/api-proxy/types";
import { useAuth } from "@humansignal/core/providers/AuthProvider";

function formatDate(date?: string) {
  return format(new Date(date ?? ""), "dd MMM yyyy, KK:mm a", { locale: getDateFnsLocale() });
}

export const MembershipInfo = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dateJoined = useMemo(() => {
    if (!user?.date_joined) return null;
    return formatDate(user?.date_joined);
  }, [user?.date_joined]);

  const membership = useQuery({
    queryKey: [user?.active_organization, user?.id, "user-membership"],
    async queryFn() {
      if (!user) return {};
      const api = getApiInstance();
      const response = (await api.invoke("userMemberships", {
        pk: user.active_organization,
        userPk: user.id,
      })) as WrappedResponse<{
        user: number;
        organization: number;
        contributed_projects_count: number;
        annotations_count: number;
        created_at: string;
        role: string;
      }>;

      const annotationCount = response?.annotations_count;
      const contributions = response?.contributed_projects_count;
      let role = i18next.t("account:accountRoleOwner");

      switch (response.role) {
        case "OW":
          role = i18next.t("account:accountRoleOwner");
          break;
        case "DI":
          role = i18next.t("account:accountRoleDeactivated");
          break;
        case "AD":
          role = i18next.t("account:accountRoleAdministrator");
          break;
        case "MA":
          role = i18next.t("account:accountRoleManager");
          break;
        case "AN":
          role = i18next.t("account:accountRoleAnnotator");
          break;
        case "RE":
          role = i18next.t("account:accountRoleReviewer");
          break;
        case "NO":
          role = i18next.t("account:accountRolePending");
          break;
      }

      return {
        annotationCount,
        contributions,
        role,
      };
    },
  });

  const organization = useQuery({
    queryKey: ["organization", user?.active_organization],
    async queryFn() {
      if (!user) return null;
      if (!window?.APP_SETTINGS?.billing) return null;
      const api = getApiInstance();
      const organization = (await api.invoke("organization", {
        pk: user.active_organization,
      })) as WrappedResponse<{
        id: number;
        external_id: string;
        title: string;
        token: string;
        default_role: string;
        created_at: string;
      }>;

      if (!organization.$meta.ok) {
        return null;
      }

      return {
        ...organization,
        createdAt: formatDate(organization.created_at),
      } as const;
    },
  });

  return (
    <div className={styles.membershipInfo} id="membership-info">
      <div className="flex gap-2 w-full justify-between">
        <div>{t("account:accountUserIdLabel")}</div>
        <div>{user?.id}</div>
      </div>

      <div className="flex gap-2 w-full justify-between">
        <div>{t("account:accountRegistrationDate")}</div>
        <div>{dateJoined}</div>
      </div>

      <div className="flex gap-2 w-full justify-between">
        <div>{t("account:accountAnnotationsSubmitted")}</div>
        <div>{membership.data?.annotationCount}</div>
      </div>

      <div className="flex gap-2 w-full justify-between">
        <div>{t("account:accountProjectsContributedTo")}</div>
        <div>{membership.data?.contributions}</div>
      </div>

      <div className={styles.divider} />

      {user?.active_organization_meta && (
        <div className="flex gap-2 w-full justify-between">
          <div>{t("account:accountOrganizationLabel")}</div>
          <div>{user.active_organization_meta.title}</div>
        </div>
      )}

      {membership.data?.role && (
        <div className="flex gap-2 w-full justify-between">
          <div>{t("account:accountMyRole")}</div>
          <div>{membership.data.role}</div>
        </div>
      )}

      <div className="flex gap-2 w-full justify-between">
        <div>{t("account:accountOrganizationId")}</div>
        <div>{user?.active_organization}</div>
      </div>

      {user?.active_organization_meta && (
        <div className="flex gap-2 w-full justify-between">
          <div>{t("account:accountOwner")}</div>
          <div>{user.active_organization_meta.email}</div>
        </div>
      )}

      {organization.data?.createdAt && (
        <div className="flex gap-2 w-full justify-between">
          <div>{t("account:accountCreated")}</div>
          <div>{organization.data?.createdAt}</div>
        </div>
      )}
    </div>
  );
};
