import { type FormEventHandler, useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { getDateFnsLocale } from "@humansignal/app-common/i18n/dateLocale";
import { useTranslation } from "react-i18next";
import { Badge, Button, InputFile, ToastType, Typography, useToast, Userpic } from "@humansignal/ui";
import { getApiInstance } from "@humansignal/core";
import { useAccountSettingsExtension } from "../extensions";
import { useReportProfileDirty } from "../ProfileDirtyContext";
import styles from "../AccountSettings.module.css";
import { useAuth } from "@humansignal/core/providers/AuthProvider";
import { atomWithMutation } from "jotai-tanstack-query";
import { useAtomValue } from "jotai";

/**
 * FIXME: This is legacy imports. We're not supposed to use such statements
 * each one of these eventually has to be migrated to core or ui
 */
import { Input } from "apps/labelstudio/src/components/Form/Elements";

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  google: "Google",
  github: "GitHub",
};

const isRequiredProfileValueMissing = (isRequired: boolean, value: string) => isRequired && value.trim().length === 0;

const RequiredFieldLabel = ({ label }: { label: string }) => {
  const { t } = useTranslation();

  return (
    <span className={styles.requiredLabel}>
      <span>{label}</span>
      <Badge variant="neutral" look="outline" shape="square" size="small">
        {t("account:commonRequired")}
      </Badge>
    </span>
  );
};

const RequiredFieldError = ({ id, label }: { id: string; label: string }) => {
  const { t } = useTranslation();

  return (
    <span id={id} className="text-negative-content" role="alert">
      {t("account:accountFieldRequired", { field: label })}
    </span>
  );
};

function formatProvider(provider: string): string {
  return PROVIDER_DISPLAY_NAMES[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

const updateUserAvatarAtom = atomWithMutation(() => ({
  mutationKey: ["update-user"],
  async mutationFn({
    userId,
    body,
    isDelete,
  }: { userId: number; body: FormData; isDelete?: never } | { userId: number; isDelete: true; body?: never }) {
    const api = getApiInstance();
    const method = isDelete ? "deleteUserAvatar" : "updateUserAvatar";
    const response = await api.invoke(
      method,
      {
        pk: userId,
      },
      {
        body,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        errorFilter: () => true,
      },
    );
    return response;
  },
}));

export const PersonalInfo = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { user, refetch: refetchUser, isLoading: userInProgress, update: updateUser } = useAuth();
  const updateUserAvatar = useAtomValue(updateUserAvatarAtom);
  const [isInProgress, setIsInProgress] = useState(false);
  const [fname, setFname] = useState(user?.first_name ?? "");
  const [lname, setLname] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  // Required-field errors only surface after the user attempts to Save with missing fields.
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  // Report unsaved changes to the page-level guard (avatar saves immediately, so it's excluded).
  const isDirty =
    fname !== (user?.first_name ?? "") || lname !== (user?.last_name ?? "") || phone !== (user?.phone ?? "");
  const discardChanges = useCallback(() => {
    setFname(user?.first_name ?? "");
    setLname(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
    setHasAttemptedSave(false);
  }, [user?.first_name, user?.last_name, user?.phone]);
  useReportProfileDirty(isDirty, discardChanges);
  const { requiredProfileFields = [] } = useAccountSettingsExtension();
  const isFieldRequired = (key: string) => requiredProfileFields.includes(key);
  const isFirstNameMissing = hasAttemptedSave && isRequiredProfileValueMissing(isFieldRequired("first_name"), fname);
  const isLastNameMissing = hasAttemptedSave && isRequiredProfileValueMissing(isFieldRequired("last_name"), lname);
  const isPhoneMissing = hasAttemptedSave && isRequiredProfileValueMissing(isFieldRequired("phone"), phone);
  const canDeleteAvatar = Boolean(user?.avatar);
  const avatarRef = useRef<HTMLInputElement>();
  const fileChangeHandler: FormEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      if (!user) return;

      const input = e.currentTarget as HTMLInputElement;
      const body = new FormData();
      body.append("avatar", input.files?.[0] ?? "");
      const response = await updateUserAvatar.mutateAsync({
        body,
        userId: user.id,
      });

      if (!response.$meta.ok) {
        toast?.show({
          message: response?.response?.detail ?? t("account:accountErrorUpdatingAvatar"),
          type: ToastType.error,
        });
      } else {
        refetchUser();
      }
      input.value = "";
    },
    [user?.id, t],
  );

  const deleteUserAvatar = async () => {
    if (!user) return;
    await updateUserAvatar.mutateAsync({ userId: user.id, isDelete: true });
    refetchUser();
  };

  const userFormSubmitHandler: FormEventHandler = useCallback(
    async (e) => {
      e.preventDefault();
      if (!user) return;
      const json = {
        first_name: fname,
        last_name: lname,
        phone,
      };

      const missingFields = requiredProfileFields.filter((key) => {
        const value = (json as Record<string, unknown>)[key];
        return typeof value !== "string" || value.trim().length === 0;
      });

      if (missingFields.length > 0) {
        setHasAttemptedSave(true);
        return;
      }

      const response = await updateUser(json);

      refetchUser();
      if (!response?.$meta.ok) {
        toast?.show({
          message: response?.response?.detail ?? t("account:accountErrorUpdatingUser"),
          type: ToastType.error,
        });
      }
    },
    [fname, lname, phone, user?.id, requiredProfileFields, updateUser, refetchUser, toast, t],
  );

  useEffect(() => {
    setIsInProgress(userInProgress);
  }, [userInProgress]);

  useEffect(() => {
    setFname(user?.first_name ?? "");
    setLname(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);

  return (
    <div className={styles.section} id="personal-info">
      <div className={styles.sectionContent}>
        <div className={styles.profilePhotoRow}>
          <Userpic user={user} isInProgress={userInProgress} size={88} className={styles.userPic} />
          <div className={`${styles.sectionContent} ${styles.profilePhotoControls}`}>
            <Typography className={styles.profilePhotoLabel} variant="label" size="medium">
              {t("account:accountProfilePhoto")}
            </Typography>
            <InputFile
              className={styles.profilePhotoUpload}
              name="avatar"
              onChange={fileChangeHandler}
              accept="image/png, image/jpeg, image/jpg"
              ref={avatarRef}
            />
          </div>
          {canDeleteAvatar && (
            <Button
              className={styles.profilePhotoDelete}
              type="submit"
              variant="negative"
              look="outlined"
              size="medium"
              onClick={deleteUserAvatar}
            >
              {t("account:accountDeletePhoto")}
            </Button>
          )}
        </div>
        <form onSubmit={userFormSubmitHandler} className={styles.sectionContent}>
          <div className={styles.formGrid}>
            <Input
              label={
                isFieldRequired("first_name") ? (
                  <RequiredFieldLabel label={t("account:accountFirstName")} />
                ) : (
                  t("account:accountFirstName")
                )
              }
              value={fname}
              onChange={(e: React.KeyboardEvent<HTMLInputElement>) => setFname(e.currentTarget.value)}
              name="first_name"
              aria-required={isFieldRequired("first_name")}
              aria-invalid={isFirstNameMissing || undefined}
              aria-describedby={isFirstNameMissing ? "first-name-error" : undefined}
              footer={
                isFirstNameMissing ? (
                  <RequiredFieldError id="first-name-error" label={t("account:accountFirstName")} />
                ) : undefined
              }
            />
            <Input
              label={
                isFieldRequired("last_name") ? (
                  <RequiredFieldLabel label={t("account:accountLastName")} />
                ) : (
                  t("account:accountLastName")
                )
              }
              value={lname}
              onChange={(e: React.KeyboardEvent<HTMLInputElement>) => setLname(e.currentTarget.value)}
              name="last_name"
              aria-required={isFieldRequired("last_name")}
              aria-invalid={isLastNameMissing || undefined}
              aria-describedby={isLastNameMissing ? "last-name-error" : undefined}
              footer={
                isLastNameMissing ? (
                  <RequiredFieldError id="last-name-error" label={t("account:accountLastName")} />
                ) : undefined
              }
            />
            <Input label={t("account:accountEmailLabel")} type="email" readOnly={true} value={user?.email ?? ""} />
            <Input
              label={
                isFieldRequired("phone") ? (
                  <RequiredFieldLabel label={t("account:accountPhoneLabel")} />
                ) : (
                  t("account:accountPhoneLabel")
                )
              }
              type="phone"
              onChange={(e: React.KeyboardEvent<HTMLInputElement>) => setPhone(e.currentTarget.value)}
              value={phone}
              name="phone"
              aria-required={isFieldRequired("phone")}
              aria-invalid={isPhoneMissing || undefined}
              aria-describedby={isPhoneMissing ? "phone-error" : undefined}
              footer={
                isPhoneMissing ? (
                  <RequiredFieldError id="phone-error" label={t("account:accountPhoneLabel")} />
                ) : undefined
              }
            />
            {user?.social_accounts?.map((account) => (
              <div className={`${styles.formGrid} ${styles.fullWidth}`} key={account.provider}>
                <Input
                  label={t("account:accountConnectedAccount")}
                  readOnly={true}
                  value={formatProvider(account.provider)}
                />
                <Input
                  label={t("account:accountConnectedSince")}
                  readOnly={true}
                  value={format(new Date(account.date_joined), "dd MMM yyyy", { locale: getDateFnsLocale() })}
                />
              </div>
            ))}
          </div>
          <div className={styles.formActions}>
            <Button className="w-[120px]" waiting={isInProgress}>
              {t("account:commonSave")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
