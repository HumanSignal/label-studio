import { FaCaretDown, FaChevronDown } from "react-icons/fa";
import { Block } from "../../../utils/bem";
import { FF_LOPS_E_10, FF_SELF_SERVE, isFF } from "../../../utils/feature-flags";
import { ErrorBox } from "../../Common/ErrorBox";
import { FieldsButton } from "../../Common/FieldsButton";
import { FiltersPane } from "../../Common/FiltersPane";
import { Icon } from "../../Common/Icon/Icon";
import { Interface } from "../../Common/Interface";
import { ExportButton, ImportButton } from "../../Common/SDKButtons";
import { Tooltip } from "../../Common/Tooltip/Tooltip";
import { ActionsButton } from "./ActionsButton";
import { GridWidthButton } from "./GridWidthButton";
import { LabelButton } from "./LabelButton";
import { LoadingPossum } from "./LoadingPossum";
import { OrderButton } from "./OrderButton";
import { RefreshButton } from "./RefreshButton";
import { ViewToggle } from "./ViewToggle";

const style = {
  minWidth: '110px',
  justifyContent: 'space-between',
};

// Check if user is on trial
const isTrialExpired = window.APP_SETTINGS.billing.checks.is_license_expired;
// Check the subscription period end date
const subscriptionPeriodEnd = window.APP_SETTINGS.subscription.current_period_end;
// Check if user is self-serve
const isSelfServe = isFF(FF_SELF_SERVE) && window.APP_SETTINGS.billing.enterprise;
// Check if user is self-serve and has expired trial
const isSelfServeExpiredTrial = isSelfServe && isTrialExpired && !subscriptionPeriodEnd;
// Check if user is self-serve and has expired subscription
const isSelfServeExpiredSubscription = isSelfServe && subscriptionPeriodEnd && new Date(subscriptionPeriodEnd) < new Date();
// Check if user is self-serve and has expired trial or subscription
const isSelfServeExpired = isSelfServeExpiredTrial || isSelfServeExpiredSubscription;

const WithDisabledTooltip = ({ children, ...props }) => {
  if (!props.disabled) {
    return children;
  }

  return (
    <Tooltip
      title={props.title}
      style={{
        maxWidth:200,
        textAlign: "center",
      }}>
      <Block name="button-wrapper">
        {children}
      </Block>
    </Tooltip>
  );

};

export const instruments = {
  'view-toggle': ({ size }) => {
    return <ViewToggle size={size} style={style} />;
  },
  'columns': ({ size }) => {
    const iconProps = {};
    const isNewUI = isFF(FF_LOPS_E_10);

    if (isNewUI) {
      iconProps.size = 12;
      iconProps.style = {
        marginRight: 3,
      };
      iconProps.color = "#1F1F1F";
    }
    return (
      <FieldsButton
        wrapper={FieldsButton.Checkbox}
        trailingIcon={<Icon {...iconProps} icon={isNewUI ? FaChevronDown : FaCaretDown} />}
        title={"Columns"}
        size={size}
        style={style}
      />
    );
  },
  'filters': ({ size }) => {
    return <FiltersPane size={size} style={style} />;
  },
  'ordering': ({ size }) => {
    return <OrderButton size={size} style={style} />;
  },
  'grid-size': ({ size }) => {
    return <GridWidthButton size={size}/>;
  },
  'refresh': ({ size }) => {
    return <RefreshButton size={size}/>;
  },
  'loading-possum': () => {
    return <LoadingPossum/>;
  },
  'label-button': ({ size }) => {
    return <LabelButton size={size}/>;
  },
  'actions': ({ size }) => {
    return <ActionsButton size={size} style={style} />;
  },
  'error-box': () => {
    return <ErrorBox/>;
  },
  'import-button': ({ size }) => {
    return (
      <Interface name="import">
        <WithDisabledTooltip
          title="You must upgrade your plan to import data"
          disabled={isSelfServeExpired}>
          <ImportButton disabled={isSelfServeExpired} size={size}>Import</ImportButton>
        </WithDisabledTooltip>
      </Interface>
    );
  },
  'export-button': ({ size }) => {
    return (
      <Interface name="export">
        <ExportButton size={size}>Export</ExportButton>
      </Interface>
    );
  },
};
