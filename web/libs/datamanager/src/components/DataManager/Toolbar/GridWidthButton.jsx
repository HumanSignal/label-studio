import { inject } from "mobx-react";
import { useCallback, useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { Button } from "../../Common/Button/Button";
import { Icon } from "../../Common/Icon/Icon";
import { Space } from "../../Common/Space/Space";

const injector = inject(({ store }) => {
  const view = store?.currentView;

  return {
    view,
    gridWidth: view?.gridWidth,
  };
});

export const GridWidthButton = injector(({ view, gridWidth, size }) => {
  const [width, setWidth] = useState(gridWidth);

  const setGridWidth = useCallback(
    (width) => {
      const newWidth = Math.max(3, Math.min(width, 10));

      setWidth(newWidth);
      view.setGridWidth(newWidth);
    },
    [view],
  );

  return view.type === "grid" ? (
    <Space style={{ fontSize: 12 }}>
      Columns: {width}
      <Button.Group>
        <Button
          size={size}
          icon={<Icon icon={FaMinus} size="12" color="#595959" />}
          onClick={() => setGridWidth(width - 1)}
          disabled={width === 3}
        />
        <Button
          size={size}
          icon={<Icon icon={FaPlus} size="12" color="#595959" />}
          onClick={() => setGridWidth(width + 1)}
          disabled={width === 10}
        />
      </Button.Group>
    </Space>
  ) : null;
});
