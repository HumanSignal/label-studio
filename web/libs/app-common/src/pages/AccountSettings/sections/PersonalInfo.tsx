import { type FormEventHandler, useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Button, InputFile, ToastType, Typography, useToast, Userpic } from "@humansignal/ui";
import { getApiInstance } from "@humansignal/core";
import { useAccountSettingsExtension } from "../extensions";
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

const PROFILE_FIELD_LABELS: Record<string, string> = {
  first_name: "First Name",
  last_name: "Last Name",
  phone: "Phone",
};

const isRequiredProfileValueMissing = (isRequired: boolean, value: string) => isRequired && value.trim().length === 0;

const RequiredFieldLabel = ({ label, isMissing }: { label: string; isMissing: boolean }) => (
  <>
    {label}
    <span
      className={`${styles.requiredText} ${isMissing ? styles.requiredTextMissing : ""}`}
      data-required-missing={isMissing || undefined}
    >
      Required
    </span>
  </>
);

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
  const toast = useToast();
  const { user, refetch: refetchUser, isLoading: userInProgress, update: updateUser } = useAuth();
  const updateUserAvatar = useAtomValue(updateUserAvatarAtom);
  const [isInProgress, setIsInProgress] = useState(false);
  const [fname, setFname] = useState(user?.first_name ?? "");
  const [lname, setLname] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const { requiredProfileFields = [] } = useAccountSettingsExtension();
  const isFieldRequired = (key: string) => requiredProfileFields.includes(key);
  const isFirstNameMissing = isRequiredProfileValueMissing(isFieldRequired("first_name"), fname);
  const isLastNameMissing = isRequiredProfileValueMissing(isFieldRequired("last_name"), lname);
  const isPhoneMissing = isRequiredProfileValueMissing(isFieldRequired("phone"), phone);
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
        toast?.show({ message: response?.response?.detail ?? "Error updating avatar", type: ToastType.error });
      } else {
        refetchUser();
      }
      input.value = "";
    },
    [user?.id],
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
        const missingFieldLabels = missingFields.map((key) => PROFILE_FIELD_LABELS[key] ?? key);
        toast?.show({
          message: `${missingFieldLabels.join(", ")} ${missingFieldLabels.length === 1 ? "is" : "are"} required.`,
          type: ToastType.error,
        });
        return;
      }

      const response = await updateUser(json);

      refetchUser();
      if (!response?.$meta.ok) {
        toast?.show({ message: response?.response?.detail ?? "Error updating user", type: ToastType.error });
      }
    },
    [fname, lname, phone, user?.id, requiredProfileFields, updateUser, refetchUser, toast],
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
          <Userpic user={user} isInProgress={userInProgress} size={88} style={{ flex: "none" }} />
          <div className={styles.sectionContent}>
            <Typography variant="label" size="medium">
              Profile Photo
            </Typography>
            <InputFile
              name="avatar"
              onChange={fileChangeHandler}
              accept="image/png, image/jpeg, image/jpg"
              ref={avatarRef}
            />
          </div>
          {canDeleteAvatar && (
            <Button type="submit" variant="negative" look="outlined" size="medium" onClick={deleteUserAvatar}>
              Delete Photo
            </Button>
          )}
        </div>
        <form onSubmit={userFormSubmitHandler} className={styles.sectionContent}>
          <div className={styles.formGrid}>
            <Input
              label={
                isFieldRequired("first_name") ? (
                  <RequiredFieldLabel label="First Name" isMissing={isFirstNameMissing} />
                ) : (
                  "First Name"
                )
              }
              value={fname}
              onChange={(e: React.KeyboardEvent<HTMLInputElement>) => setFname(e.currentTarget.value)}
              name="first_name"
              aria-required={isFieldRequired("first_name")}
              aria-invalid={isFirstNameMissing || undefined}
            />
            <Input
              label={
                isFieldRequired("last_name") ? (
                  <RequiredFieldLabel label="Last Name" isMissing={isLastNameMissing} />
                ) : (
                  "Last Name"
                )
              }
              value={lname}
              onChange={(e: React.KeyboardEvent<HTMLInputElement>) => setLname(e.currentTarget.value)}
              name="last_name"
              aria-required={isFieldRequired("last_name")}
              aria-invalid={isLastNameMissing || undefined}
            />
            <Input label="E-mail" type="email" readOnly={true} value={user?.email ?? ""} />
            <Input
              label={
                isFieldRequired("phone") ? <RequiredFieldLabel label="Phone" isMissing={isPhoneMissing} /> : "Phone"
              }
              type="phone"
              onChange={(e: React.KeyboardEvent<HTMLInputElement>) => setPhone(e.currentTarget.value)}
              value={phone}
              name="phone"
              aria-required={isFieldRequired("phone")}
              aria-invalid={isPhoneMissing || undefined}
            />
            {user?.social_accounts?.map((account) => (
              <div className={`${styles.formGrid} ${styles.fullWidth}`} key={account.provider}>
                <Input label="Connected Account" readOnly={true} value={formatProvider(account.provider)} />
                <Input
                  label="Connected Since"
                  readOnly={true}
                  value={format(new Date(account.date_joined), "dd MMM yyyy")}
                />
              </div>
            ))}
          </div>
          <div className={styles.formActions}>
            <Button className="w-[120px]" waiting={isInProgress}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
