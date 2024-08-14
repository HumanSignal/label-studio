import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StaticContent } from "../../app/StaticContent/StaticContent";
import {
  IconBook,
  IconFolder,
  IconModel,
  IconPersonInCircle,
  IconPin,
  IconTerminal,
  LsDoor,
  LsGitHub,
  LsSettings,
  LsSlack,
} from "../../assets/icons";
import { useConfig } from "../../providers/ConfigProvider";
import { useContextComponent, useFixedLocation } from "../../providers/RoutesProvider";
import { cn } from "../../utils/bem";
import { absoluteURL, isDefined } from "../../utils/helpers";
import { Breadcrumbs } from "../Breadcrumbs/Breadcrumbs";
import { Dropdown } from "../Dropdown/Dropdown";
import { Hamburger } from "../Hamburger/Hamburger";
import { Menu } from "../Menu/Menu";
import { Userpic } from "../Userpic/Userpic";
import { VersionNotifier, VersionProvider } from "../VersionNotifier/VersionNotifier";
import "./Menubar.scss";
import "./MenuContent.scss";
import "./MenuSidebar.scss";
import { ModelsPage } from "../../pages/Organization/Models/ModelsPage";
import { FF_DIA_835, isFF } from "../../utils/feature-flags";

export const MenubarContext = createContext();

const LeftContextMenu = ({ className }) => (
  <StaticContent id="context-menu-left" className={className}>
    {(template) => <Breadcrumbs fromTemplate={template} />}
  </StaticContent>
);

const RightContextMenu = ({ className, ...props }) => {
  const { ContextComponent, contextProps } = useContextComponent();

  return ContextComponent ? (
    <div className={className}>
      <ContextComponent {...props} {...(contextProps ?? {})} />
    </div>
  ) : (
    <StaticContent id="context-menu-right" className={className} />
  );
};

export const Menubar = ({ enabled, defaultOpened, defaultPinned, children, onSidebarToggle, onSidebarPin }) => {
  const menuDropdownRef = useRef();
  const useMenuRef = useRef();
  const location = useFixedLocation();

  const config = useConfig();
  const [sidebarOpened, setSidebarOpened] = useState(defaultOpened ?? false);
  const [sidebarPinned, setSidebarPinned] = useState(defaultPinned ?? false);
  const [PageContext, setPageContext] = useState({
    Component: null,
    props: {},
  });

  const menubarClass = cn("menu-header");
  const menubarContext = menubarClass.elem("context");
  const sidebarClass = cn("sidebar");
  const contentClass = cn("content-wrapper");
  const contextItem = menubarClass.elem("context-item");
  const showNewsletterDot = !isDefined(config.user.allow_newsletters);

  const sidebarPin = useCallback(
    (e) => {
      e.preventDefault();

      const newState = !sidebarPinned;

      setSidebarPinned(newState);
      onSidebarPin?.(newState);
    },
    [sidebarPinned],
  );

  const sidebarToggle = useCallback(
    (visible) => {
      const newState = visible;

      setSidebarOpened(newState);
      onSidebarToggle?.(newState);
    },
    [sidebarOpened],
  );

  const providerValue = useMemo(
    () => ({
      PageContext,

      setContext(ctx) {
        setTimeout(() => {
          setPageContext({
            ...PageContext,
            Component: ctx,
          });
        });
      },

      setProps(props) {
        setTimeout(() => {
          setPageContext({
            ...PageContext,
            props,
          });
        });
      },

      contextIsSet(ctx) {
        return PageContext.Component === ctx;
      },
    }),
    [PageContext],
  );

  useEffect(() => {
    if (!sidebarPinned) {
      menuDropdownRef?.current?.close();
    }
    useMenuRef?.current?.close();
  }, [location]);

  return (
    <div className={contentClass}>
      {enabled && (
        <div className={menubarClass}>
          <Dropdown.Trigger dropdown={menuDropdownRef} closeOnClickOutside={!sidebarPinned}>
            <div className={`${menubarClass.elem("trigger")} main-menu-trigger`}>
              <img src={absoluteURL("/static/icons/logo.svg")} alt="Label Studio Logo" height="22" />
              <Hamburger opened={sidebarOpened} />
            </div>
          </Dropdown.Trigger>

          <div className={menubarContext}>
            <LeftContextMenu className={contextItem.mod({ left: true })} />

            <RightContextMenu className={contextItem.mod({ right: true })} />
          </div>

          <Dropdown.Trigger
            ref={useMenuRef}
            align="right"
            content={
              <Menu>
                <Menu.Item icon={<LsSettings />} label="Account &amp; Settings" href="/user/account" data-external />
                {/* <Menu.Item label="Dark Mode"/> */}
                <Menu.Item icon={<LsDoor />} label="Log Out" href={absoluteURL("/logout")} data-external />
                {showNewsletterDot && (
                  <>
                    <Menu.Divider />
                    <Menu.Item className={cn("newsletter-menu-item")} href="/user/account" data-external>
                      <span>Please check new notification settings in the Account & Settings page</span>
                      <span className={cn("newsletter-menu-badge")} />
                    </Menu.Item>
                  </>
                )}
              </Menu>
            }
          >
            <div title={config.user.email} className={menubarClass.elem("user")}>
              <Userpic user={config.user} />
              {showNewsletterDot && <div className={menubarClass.elem("userpic-badge")} />}
            </div>
          </Dropdown.Trigger>
        </div>
      )}

      <VersionProvider>
        <div className={contentClass.elem("body")}>
          {enabled && (
            <Dropdown
              ref={menuDropdownRef}
              onToggle={sidebarToggle}
              onVisibilityChanged={() => window.dispatchEvent(new Event("resize"))}
              visible={sidebarOpened}
              className={[sidebarClass, sidebarClass.mod({ floating: !sidebarPinned })].join(" ")}
              style={{ width: 240 }}
            >
              <Menu>
                <Menu.Item label="Projects" to="/projects" icon={<IconFolder />} data-external exact />
                <Menu.Item label="Organization" to="/organization" icon={<IconPersonInCircle />} data-external exact />
                {isFF(FF_DIA_835) && <Menu.Item label="Models" to={ModelsPage.path} icon={<IconModel />} exact />}

                <Menu.Spacer />

                <VersionNotifier showNewVersion />

                <Menu.Item
                  label="API"
                  href="https://api.labelstud.io/api-reference/introduction/getting-started"
                  icon={<IconTerminal />}
                  target="_blank"
                />
                <Menu.Item label="Docs" href="https://labelstud.io/guide" icon={<IconBook />} target="_blank" />
                <Menu.Item
                  label="GitHub"
                  href="https://github.com/HumanSignal/label-studio"
                  icon={<LsGitHub />}
                  target="_blank"
                  rel="noreferrer"
                />
                <Menu.Item
                  label="Slack Community"
                  href="https://slack.labelstud.io/?source=product-menu"
                  icon={<LsSlack />}
                  target="_blank"
                  rel="noreferrer"
                />

                <VersionNotifier showCurrentVersion />

                <Menu.Divider />

                <Menu.Item
                  icon={<IconPin />}
                  className={sidebarClass.elem("pin")}
                  onClick={sidebarPin}
                  active={sidebarPinned}
                >
                  {sidebarPinned ? "Unpin menu" : "Pin menu"}
                </Menu.Item>
              </Menu>
            </Dropdown>
          )}

          <MenubarContext.Provider value={providerValue}>
            <div className={contentClass.elem("content").mod({ withSidebar: sidebarPinned && sidebarOpened })}>
              {children}
            </div>
          </MenubarContext.Provider>
        </div>
      </VersionProvider>
    </div>
  );
};
