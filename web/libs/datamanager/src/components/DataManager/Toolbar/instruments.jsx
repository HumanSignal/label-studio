import { IconChevronDown } from "@humansignal/icons";
import { Block } from "../../../utils/bem";
import { FF_SELF_SERVE, isFF } from "../../../utils/feature-flags";
import { ErrorBox } from "../../Common/ErrorBox";
import { FieldsButton } from "../../Common/FieldsButton";
import { FiltersPane } from "../../Common/FiltersPane";
import { Icon } from "../../Common/Icon/Icon";
import { Interface } from "../../Common/Interface";
import { ExportButton, ImportButton } from "../../Common/SDKButtons";
import { Tooltip } from "@humansignal/ui";
import { ActionsButton } from "./ActionsButton";
import { GridWidthButton } from "./GridWidthButton";
import { LabelButton } from "./LabelButton";
import { LoadingPossum } from "./LoadingPossum";
import { OrderButton } from "./OrderButton";
import { RefreshButton } from "./RefreshButton";
import { ViewToggle } from "./ViewToggle";

const style = {
  minWidth: "80px",
  justifyContent: "space-between",
};

/**
 * Checks for Starter Cloud trial expiration.
 * If expired it renders disabled Import button with a tooltip.
 * Also shows task limit information (Import X/Y) and disables if limit exceeded.
 */
const ImportButtonWithChecks = ({ size }) => {
  const usageLimits = window.APP_SETTINGS.billing?.usageLimits;
  const projectTaskNumber = window.APP_SETTINGS.billing?.projectTaskNumber;
  const maxTasks = usageLimits?.max_tasks;
  const currentTasks = usageLimits?.current_tasks;
  const canImportTasks = usageLimits?.can_import_tasks;

  // Build button text with task count if limits are available
  const getButtonText = () => {
    if (maxTasks !== null && maxTasks !== undefined && projectTaskNumber !== undefined) {
      return `Import ${projectTaskNumber}/${maxTasks}`;
    }
    return "Import";
  };

  const buttonText = getButtonText();
  const isOpenSource = !window.APP_SETTINGS.billing;
  // Check if user is self-serve; Enterprise flag === false is the main condition
  const isSelfServe = isFF(FF_SELF_SERVE) && window.APP_SETTINGS.billing?.enterprise === false;

  // Check task limit (organization level)
  const isTaskLimitExceeded = maxTasks !== null && maxTasks !== undefined && canImportTasks === false;

  // Check if user is on trial
  const isTrialExpired = window.APP_SETTINGS.billing.checks?.is_license_expired;
  // Check the subscription period end date
  const subscriptionPeriodEnd = window.APP_SETTINGS.subscription?.current_period_end;
  // Check if user is self-serve and has expired trial
  const isSelfServeExpiredTrial = isSelfServe && isTrialExpired && !subscriptionPeriodEnd;
  // Check if user is self-serve and has expired subscription
  const isSelfServeExpiredSubscription =
    isSelfServe && subscriptionPeriodEnd && new Date(subscriptionPeriodEnd) < new Date();
  // Check if user is self-serve and has expired trial or subscription
  const isSelfServeExpired = isSelfServeExpiredTrial || isSelfServeExpiredSubscription;

  const isDisabled = isTaskLimitExceeded || isSelfServeExpired;

  // If open source or not self-serve, show simple button (may still show task count)
  if (isOpenSource || !isSelfServe) {
    if (isTaskLimitExceeded) {
      return (
        <Tooltip
          title={`Task limit reached. Your plan allows ${maxTasks} task(s), and you currently have ${currentTasks}.`}
          style={{
            maxWidth: 200,
            textAlign: "center",
          }}
        >
          <Block name="button-wrapper">
            <ImportButton disabled size={size}>
              {buttonText}
            </ImportButton>
          </Block>
        </Tooltip>
      );
    }
    return <ImportButton size={size}>{buttonText}</ImportButton>;
  }

  // For self-serve users, check both trial expiration and task limits
  if (isDisabled) {
    let tooltipTitle = "You must upgrade your plan to import data";
    if (isTaskLimitExceeded && !isSelfServeExpired) {
      tooltipTitle = `Task limit reached. Your plan allows ${maxTasks} task(s), and you currently have ${currentTasks}.`;
    }

    return (
      <Tooltip
        title={tooltipTitle}
        style={{
          maxWidth: 200,
          textAlign: "center",
        }}
      >
        <Block name="button-wrapper">
          <ImportButton disabled size={size}>
            {buttonText}
          </ImportButton>
        </Block>
      </Tooltip>
    );
  }

  return <ImportButton size={size}>{buttonText}</ImportButton>;
};

export const instruments = {
  "view-toggle": ({ size }) => {
    return <ViewToggle size={size} style={style} />;
  },
  columns: ({ size }) => {
    const iconProps = {
      style: {
        marginRight: 4,
      },
      icon: IconChevronDown,
    };
    return (
      <FieldsButton
        wrapper={FieldsButton.Checkbox}
        trailingIcon={<Icon {...iconProps} />}
        title={"Columns"}
        size={size}
        style={style}
        openUpwardForShortViewport={false}
      />
    );
  },
  filters: ({ size }) => {
    return <FiltersPane size={size} style={style} />;
  },
  ordering: ({ size }) => {
    return <OrderButton size={size} style={style} />;
  },
  "grid-size": ({ size }) => {
    return <GridWidthButton size={size} />;
  },
  refresh: ({ size }) => {
    return <RefreshButton size={size} />;
  },
  "loading-possum": () => {
    return <LoadingPossum />;
  },
  "label-button": ({ size }) => {
    return <LabelButton size={size} />;
  },
  actions: ({ size }) => {
    return <ActionsButton size={size} style={style} />;
  },
  "error-box": () => {
    return <ErrorBox />;
  },
  "import-button": ({ size }) => {
    return (
      <Interface name="import">
        <ImportButtonWithChecks size={size} />
      </Interface>
    );
  },
  "export-button": ({ size }) => {
    return (
      <Interface name="export">
        <ExportButton size={size}>Export</ExportButton>
      </Interface>
    );
  },
};
