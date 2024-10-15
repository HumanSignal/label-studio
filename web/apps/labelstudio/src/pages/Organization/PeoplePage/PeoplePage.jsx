import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LsPlus } from "../../../assets/icons";
import { Button } from "../../../components";
import { Description } from "../../../components/Description/Description";
import { Input } from "../../../components/Form";
import { HeidiTips } from "../../../components/HeidiTips/HeidiTips";
import { modal } from "../../../components/Modal/Modal";
import { Space } from "../../../components/Space/Space";
import { useAPI } from "../../../providers/ApiProvider";
import { useConfig } from "../../../providers/ConfigProvider";
import { Block, Elem } from "../../../utils/bem";
import { FF_LSDV_E_297, isFF } from "../../../utils/feature-flags";
import { copyText } from "../../../utils/helpers";
import "./PeopleInvitation.scss";
import { PeopleList } from "./PeopleList";
import "./PeoplePage.scss";
import { SelectedUser } from "./SelectedUser";

const InvitationModal = ({ link }) => {
  return (
    <Block name="invite">
      <Input value={link} style={{ width: "100%" }} readOnly />

      <Description style={{ marginTop: 16 }}>
        Invite people to join your Label Studio instance. People that you invite have full access to all of your
        projects.{" "}
        <a href="https://labelstud.io/guide/signup.html" target="_blank" rel="noreferrer">
          Learn more
        </a>
        .
      </Description>
    </Block>
  );
};

export const PeoplePage = () => {
  const api = useAPI();
  const inviteModal = useRef();
  const config = useConfig();
  const [selectedUser, setSelectedUser] = useState(null);

  const [link, setLink] = useState();

  const selectUser = useCallback(
    (user) => {
      setSelectedUser(user);

      localStorage.setItem("selectedUser", user?.id);
    },
    [setSelectedUser],
  );

  const setInviteLink = useCallback(
    (link) => {
      const hostname = config.hostname || location.origin;

      setLink(`${hostname}${link}`);
    },
    [config, setLink],
  );

  const updateLink = useCallback(() => {
    api.callApi("resetInviteLink").then(({ invite_url }) => {
      setInviteLink(invite_url);
    });
  }, [setInviteLink]);

  const inviteModalProps = useCallback(
    (link) => ({
      title: "Invite people",
      style: { width: 640, height: 472 },
      body: () => <InvitationModal link={link} />,
      footer: () => {
        const [copied, setCopied] = useState(false);

        const copyLink = useCallback(() => {
          setCopied(true);
          copyText(link);
          setTimeout(() => setCopied(false), 1500);
        }, []);

        return (
          <Space spread>
            <Space>
              <Button style={{ width: 170 }} onClick={() => updateLink()}>
                Reset Link
              </Button>
            </Space>
            <Space>
              <Button primary style={{ width: 170 }} onClick={copyLink}>
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </Space>
          </Space>
        );
      },
      bareFooter: true,
    }),
    [],
  );

  const showInvitationModal = useCallback(() => {
    inviteModal.current = modal(inviteModalProps(link));
  }, [inviteModalProps, link]);

  const defaultSelected = useMemo(() => {
    return localStorage.getItem("selectedUser");
  }, []);

  useEffect(() => {
    api.callApi("inviteLink").then(({ invite_url }) => {
      setInviteLink(invite_url);
    });
  }, []);

  useEffect(() => {
    inviteModal.current?.update(inviteModalProps(link));
  }, [link]);

  return (
    <Block name="people">
      <Elem name="controls">
        <Space spread>
          <Space />

          <Space>
            <Button icon={<LsPlus />} primary onClick={showInvitationModal}>
              Add People
            </Button>
          </Space>
        </Space>
      </Elem>
      <Elem name="content">
        <PeopleList
          selectedUser={selectedUser}
          defaultSelected={defaultSelected}
          onSelect={(user) => selectUser(user)}
        />

        {selectedUser ? (
          <SelectedUser user={selectedUser} onClose={() => selectUser(null)} />
        ) : (
          isFF(FF_LSDV_E_297) && <HeidiTips collection="organizationPage" />
        )}
      </Elem>
    </Block>
  );
};

PeoplePage.title = "People";
PeoplePage.path = "/";
