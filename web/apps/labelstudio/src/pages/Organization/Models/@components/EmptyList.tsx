import { Button } from "apps/labelstudio/src/components";
import { Block, Elem } from "apps/labelstudio/src/utils/bem";
import type { FC } from "react";
import "./EmptyList.scss";
import { HeidiAi } from "apps/labelstudio/src/assets/images";

export const EmptyList: FC = () => {
  return (
    <Block name="empty-models-list">
      <Elem name="content">
        <Elem name="heidy">
          <HeidiAi />
        </Elem>
        <Elem name="title">Create a Model</Elem>
        <Elem name="caption">Build a high quality model to auto-label your data using LLMs</Elem>
        <Button look="primary">Create a Model</Button>
      </Elem>
    </Block>
  );
};
