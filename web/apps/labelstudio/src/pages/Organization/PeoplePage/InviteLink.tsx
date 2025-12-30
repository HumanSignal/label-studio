import { Button, Typography } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import { Space } from "@humansignal/ui/lib/space/space";
import { cn } from "apps/labelstudio/src/utils/bem";
import { Modal } from "apps/labelstudio/src/components/Modal/ModalPopup";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { useAtomValue } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../../../components/Form";

const linkAtom = atomWithQuery(() => ({
  queryKey: ["invite-link"],
  async queryFn() {
    // called only once when the component is rendered on page reload
    // will also be reset when called `refetch()` on the Reset button
    const result = await API.invoke("resetInviteLink");
    return location.origin + result.invite_url;
  },
}));

export function InviteLink({
  opened,
  onOpened,
  onClosed,
}: {
  opened: boolean;
  onOpened?: () => void;
  onClosed?: () => void;
}) {
  const modalRef = useRef<Modal>();
  const { t } = useTranslation();
  useEffect(() => {
    if (modalRef.current && opened) {
      modalRef.current?.show?.();
    } else if (modalRef.current && modalRef.current.visible) {
      modalRef.current?.hide?.();
    }
  }, [opened]);

  return (
    <Modal
      ref={modalRef}
      title={t("organization.invite.title", "Invite members")}
      opened={opened}
      bareFooter={true}
      body={<InvitationModal />}
      footer={<InvitationFooter />}
      style={{ width: 640, height: 472 }}
      onHide={onClosed}
      onShow={onOpened}
    />
  );
}

const InvitationModal = () => {
  const { t } = useTranslation();
  const { data: link } = useAtomValue(linkAtom);
  return (
    <div className={cn("invite").toClassName()}>
      <Input value={link} style={{ width: "100%" }} readOnly />
      <Typography size="small" className="text-neutral-content-subtler mt-base mb-wider">
        {t("organization.invite.desc", "Invite members to join your Label Studio instance. People that you invite have full access to all of your projects.")}{" "}
        <a
          href="https://labelstud.io/guide/signup.html"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
          onClick={() =>
            __lsa("docs.organization.add_people.learn_more", {
              href: "https://labelstud.io/guide/signup.html",
            })
          }
          aria-label={t("organization.invite.learnMoreAria", "Learn more (opens in a new tab)")}
        >
          {t("organization.invite.learnMore", "Learn more")}
        </a>
        .
      </Typography>
    </div>
  );
};

const InvitationFooter = () => {
  const { t } = useTranslation();
  const { copyText, copied } = useTextCopy();
  const { refetch, data: link } = useAtomValue(linkAtom);

  return (
    <Space spread>
      <Space>
        <Button
          variant="negative"
          look="outlined"
          style={{ width: 170 }}
          onClick={() => refetch()}
          aria-label={t("organization.invite.refreshAria", "Refresh invite link")}
        >
          {t("organization.invite.resetLink", "Reset Link")}
        </Button>
      </Space>
      <Space>
        <Button
          variant={copied ? "positive" : "primary"}
          className="w-[170px]"
          onClick={() => copyText(link!)}
          aria-label={t("organization.invite.copyAria", "Copy invite link")}
        >
          {copied ? t("organization.invite.copied", "Copied!") : t("organization.invite.copyLink", "Copy link")}
        </Button>
      </Space>
    </Space>
  );
};

function useTextCopy() {
  const [copied, setCopied] = useState(false);

  const copyText = useCallback((value: string) => {
    setCopied(true);
    navigator.clipboard.writeText(value ?? "");
    setTimeout(() => setCopied(false), 1500);
  }, []);

  return { copied, copyText };
}
