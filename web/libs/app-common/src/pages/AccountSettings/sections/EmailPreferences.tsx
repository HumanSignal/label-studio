import { useCallback, useMemo, useRef, useState } from "react";
import { Checkbox, Spinner } from "@humansignal/ui";
import { useAuth } from "@humansignal/core/providers/AuthProvider";
import { ff, useAPI } from "@humansignal/core";

/**
 * FIXME: This is legacy imports. We're not supposed to use such statements
 * each one of these eventually has to be migrated to core/ui
 */
import { useConfig } from "apps/labelstudio/src/providers/ConfigProvider";

type NotificationCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  onToggle: (e: React.ChangeEvent<HTMLInputElement>, id: string, setLoading: (isLoading: boolean) => void) => void;
};

const NotificationCheckbox = ({ id, label, checked, onToggle }: NotificationCheckboxProps) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} disabled={isLoading} onChange={(e) => onToggle(e, id, setIsLoading)}>
        {label}
      </Checkbox>
      {isLoading && <Spinner className="h-full" />}
    </div>
  );
};

export const EmailPreferences = () => {
  const isEnterpriseEmailNotificationsEnabled =
    ff.isActive(ff.FF_ENTERPRISE_EMAIL_NOTIFICATIONS) && window.APP_SETTINGS?.billing?.enterprise;
  const config = useConfig();
  const { user, refetch } = useAuth();
  const api = useAPI();
  const [isAllowNewsLetter, setIsAllowNewsLetter] = useState(config.user.allow_newsletters);
  const [emailNotificationSettings, setEmailNotificationSettings] = useState(
    user?.lse_fields?.email_notification_settings ?? {},
  );
  const emailNotificationSettingsRef = useRef(emailNotificationSettings);

  const toggleHandler = useCallback(
    async (e: any, name: string, setIsLoading: (isLoading: boolean) => void, callApiBody: any) => {
      if (name === "allow_newsletters") {
        setIsAllowNewsLetter(e.target.checked);
      }
      setIsLoading(true);
      const response = await api.callApi("updateUser", {
        params: {
          pk: user?.id,
        },
        body: callApiBody,
      });
      // @ts-ignore
      if (response?.lse_fields?.email_notification_settings) {
        // @ts-ignore
        setEmailNotificationSettings(response.lse_fields.email_notification_settings);
        // @ts-ignore
        emailNotificationSettingsRef.current = response.lse_fields.email_notification_settings;
        refetch();
      }
      setIsLoading(false);
    },
    [user],
  );

  const message = useMemo(() => {
    return window.APP_SETTINGS?.whitelabel_is_active
      ? "Subscribe for news and tips"
      : "Subscribe to HumanSignal news and tips from Heidi";
  }, []);

  return (
    <div id="email-preferences" className="flex flex-col gap-4">
      <NotificationCheckbox
        id="allow_newsletters"
        label={message}
        checked={isAllowNewsLetter}
        onToggle={(e, id, setIsLoading) =>
          toggleHandler(e, id, setIsLoading, {
            allow_newsletters: e.target.checked ? 1 : 0,
          })
        }
      />

      {isEnterpriseEmailNotificationsEnabled && (
        <>
          {Object.entries(emailNotificationSettings).map(([id, { value, label }]: [string, any]) => {
            const notificationToggleHandler = (
              e: React.ChangeEvent<HTMLInputElement>,
              id: string,
              setIsLoading: (isLoading: boolean) => void,
            ) => {
              const newEmailNotificationSettings: Record<string, any> = {};
              Object.entries(emailNotificationSettingsRef.current).forEach(([key, { value }]: [string, any]) => {
                if (key === id) {
                  newEmailNotificationSettings[key] = e.target.checked;
                } else {
                  newEmailNotificationSettings[key] = value;
                }
              });
              toggleHandler(e, id, setIsLoading, {
                email_notification_settings: newEmailNotificationSettings,
              });
            };
            return (
              <NotificationCheckbox
                key={id}
                id={id}
                label={label}
                checked={value}
                onToggle={notificationToggleHandler}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
