/**
 * Stub for @ant-design/icons so tests use a single React instance (no dual-React).
 * Exports the same stub component for all icon names used in the editor.
 */
import React from "react";

function IconStub(props) {
  return React.createElement("span", { "data-testid": "icon-stub", ...props });
}

export default IconStub;
export const LeftCircleOutlined = IconStub;
export const RightCircleOutlined = IconStub;
export const LoadingOutlined = IconStub;
export const FullscreenExitOutlined = IconStub;
export const FullscreenOutlined = IconStub;
export const RedoOutlined = IconStub;
export const RollbackOutlined = IconStub;
export const SettingOutlined = IconStub;
export const UndoOutlined = IconStub;
export const CheckCircleOutlined = IconStub;
export const CheckOutlined = IconStub;
export const PauseCircleOutlined = IconStub;
export const PlayCircleOutlined = IconStub;
export const StarOutlined = IconStub;
export const StarFilled = IconStub;
export const ApartmentOutlined = IconStub;
export const AudioOutlined = IconStub;
export const LineChartOutlined = IconStub;
export const MessageOutlined = IconStub;
export const DeleteOutlined = IconStub;
export const EyeInvisibleOutlined = IconStub;
export const EyeOutlined = IconStub;
export const PlusOutlined = IconStub;
export const StopOutlined = IconStub;
export const WindowsOutlined = IconStub;
export const DownOutlined = IconStub;
export const UpOutlined = IconStub;
export const InfoCircleOutlined = IconStub;
export const CloseOutlined = IconStub;
export const MenuOutlined = IconStub;
