import { Card, CardContent, CardHeader, CardTitle } from "@humansignal/ui/lib/card-new/card";
import { PersonalInfo } from "./PersonalInfo";
import { getAccountSettingsProfileExtras } from "../extensions";
import { ProfileDirtyProvider, useProfileFormsDirty } from "../ProfileDirtyContext";

/**
 * FIXME: This is a legacy import. We're not supposed to reach into the app from app-common;
 * `UnsavedChanges` (and its `LeaveBlocker`/`getUserConfirmation` wiring) currently lives in the app
 * layer and resolves in both LSO and LSE builds via the `apps/labelstudio` path alias.
 */
import { UnsavedChanges } from "apps/labelstudio/src/pages/CreateProject/Config/UnsavedChanges";

/**
 * Single page-level guard for the Profile section. The page stacks two independent forms
 * (PersonalInfo + the enterprise contributor profile), each reporting into ProfileDirtyProvider;
 * this reads the aggregate so one react-router blocker covers both. Warn-only: Stay / Leave.
 */
const ProfileUnsavedGuard = () => {
  const anyDirty = useProfileFormsDirty();

  return (
    <UnsavedChanges
      hasChanges={anyDirty}
      onDiscard={() => {}}
      modalBody="You have unsaved changes on this page. If you leave, your changes will be lost."
      modalDiscardText="Leave"
      modalCancelText="Stay"
    />
  );
};

export const Profile = () => {
  // Enterprise features register extra profile cards (e.g. the workforce contributor profile) here.
  // Each registered component self-gates, so OSS renders them unconditionally.
  const profileExtras = getAccountSettingsProfileExtras();

  return (
    <ProfileDirtyProvider>
      <Card className="!w-full">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalInfo />
        </CardContent>
      </Card>
      {profileExtras.map((ProfileExtra, index) => (
        <ProfileExtra key={index} />
      ))}
      <ProfileUnsavedGuard />
    </ProfileDirtyProvider>
  );
};
