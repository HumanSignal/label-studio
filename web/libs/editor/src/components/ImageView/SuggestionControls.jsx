import { useCallback, useEffect, useState } from "react";
import { Circle, Group, Image, Rect } from "react-konva";
import { IconCheck, IconCross } from "@humansignal/icons";
import Konva from "konva";
import chroma from "chroma-js";
import { observer } from "mobx-react";
import { isDefined } from "../../utils/utilities";

const getItemPosition = (item) => {
  const { shapeRef: shape, bboxCoordsCanvas: bbox } = item;
  let width;
  let height;
  let x;
  let y;

  if (isDefined(bbox)) {
    [width, height, x, y] = [bbox.right - bbox.left, bbox.bottom - bbox.top, bbox.left, bbox.top];
  } else if (isDefined(shape)) {
    [width, height] = [shape?.width() ?? 0, shape?.height() ?? 0];
    [x, y] = [item.x + width / 2 - 32, item.x + width / 2 - 32];
  } else {
    return null;
  }

  return {
    x: x + width / 2 - 32,
    y: y + height + 10,
  };
};

export const SuggestionControls = observer(({ item }) => {
  const position = getItemPosition(item);
  const [hovered, setHovered] = useState(false);
  const scale = 1 / item.parent.zoomScale;

  if (position) {
    const size = {
      width: 64,
      height: 32,
    };

    const content = (
      <Group
        {...size}
        x={position.x}
        y={position.y}
        scaleX={scale}
        scaleY={scale}
        opacity={item.highlighted || hovered ? 1 : 0.5}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Rect x={0} y={0} width={64} height={32} fill="#000" cornerRadius={16} />
        <ControlButton
          onClick={() => item.annotation.rejectSuggestion(item.id)}
          fill="#DD0000"
          iconColor="#fff"
          icon={IconCross}
        />
        <ControlButton
          x={32}
          onClick={() => item.annotation.acceptSuggestion(item.id)}
          fill="#98C84E"
          iconColor="#fff"
          icon={IconCheck}
        />
      </Group>
    );

    return content;
  }
  return null;
});

const ControlButton = ({ x = 0, fill, iconColor, onClick, icon }) => {
  const [img, setImg] = useState(new window.Image());
  const imageSize = 16;
  const imageOffset = 32 / 2 - imageSize / 2;
  const color = chroma(iconColor ?? "#fff");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const iconImage = new window.Image();

    iconImage.onload = () => {
      setImg(iconImage);
    };
    iconImage.width = 12;
    iconImage.height = 12;
    iconImage.src = icon;
  }, [icon]);

  const applyFilter = useCallback(
    /**
     * @param {import("konva/types/shapes/Image").Image} imgInstance Instance of a Konva Image object
     */
    (imgInstance) => {
      if (imgInstance) {
        const [red, green, blue, alpha] = color.rgba();

        imgInstance.cache();
        imgInstance.setAttrs({
          red,
          green,
          blue,
          alpha,
        });
      }
    },
    [],
  );

  return (
    <Group
      x={x}
      width={32}
      height={32}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Circle x={16} y={16} radius={14} opacity={hovered ? 1 : 0.2} fill={hovered ? fill : "#fff"} />
      <Image
        ref={(node) => applyFilter(node)}
        x={imageOffset}
        y={imageOffset}
        width={imageSize}
        height={imageSize}
        image={img}
        filters={[Konva.Filters.RGB]}
      />
    </Group>
  );
};
