import { Card, CardContent, CardHeader, CardTitle } from "@humansignal/ui/lib/card-new/card";
import { PersonalInfo } from "./PersonalInfo";
import { getAccountSettingsProfileExtras } from "../extensions";

export const Profile = () => {
  // Enterprise features register extra profile cards (e.g. the workforce contributor profile) here.
  // Each registered component self-gates, so OSS renders them unconditionally.
  const profileExtras = getAccountSettingsProfileExtras();

  return (
    <>
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
    </>
  );
};
