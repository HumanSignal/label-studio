import { FaCaretDown, FaChevronDown } from "react-icons/fa";
import { FF_LOPS_E_10, isFF } from "../../../utils/feature-flags";
import { ErrorBox } from "../../Common/ErrorBox";
import { FieldsButton } from "../../Common/FieldsButton";
import { FiltersPane } from "../../Common/FiltersPane";
import { Icon } from "../../Common/Icon/Icon";
import { Interface } from "../../Common/Interface";
import { ExportButton, ImportButton } from "../../Common/SDKButtons";
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
        <ImportButton size={size}>Import</ImportButton>
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
