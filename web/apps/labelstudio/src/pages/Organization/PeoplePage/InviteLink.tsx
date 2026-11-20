import { Button, ModalWindow, Typography } from "@humansignal/ui";
import { Space } from "@humansignal/ui";
import { cn } from "apps/labelstudio/src/utils/bem";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { useAtomValue } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { useCallback, useEffect, useState } from "react";
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
  useEffect(() => {
    if (opened) onOpened?.();
  }, [opened]);

  return (
    <ModalWindow
      open={opened}
      onOpenChange={(open) => !open && onClosed?.()}
      title="Invite members"
      size="medium"
      footer={opened && <InvitationFooter />}
      dataTestId="invite-link-modal"
    >
      {opened && <InvitationModal />}
    </ModalWindow>
  );
}

const InvitationModal = () => {
  const { data: link } = useAtomValue(linkAtom);
  return (
    <div className={cn("invite").toClassName()}>
      <Input value={link} style={{ width: "100%" }} readOnly />
      <Typography size="small" className="text-neutral-content-subtler mt-base mb-wider">
        Invite members to join your Label Studio instance. People that you invite have full access to all of your
        projects.{" "}
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
        >
          Learn more
        </a>
        .
      </Typography>
    </div>
  );
};

const InvitationFooter = () => {
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
          aria-label="Refresh invite link"
        >
          Reset Link
        </Button>
      </Space>
      <Space>
        <Button
          variant={copied ? "positive" : "primary"}
          className="w-[170px]"
          onClick={() => copyText(link!)}
          aria-label="Copy invite link"
        >
          {copied ? "Copied!" : "Copy link"}
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
