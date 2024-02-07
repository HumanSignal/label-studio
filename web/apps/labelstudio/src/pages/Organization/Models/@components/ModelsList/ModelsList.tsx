import { Block, Elem } from "apps/labelstudio/src/utils/bem";
import "./ModelsList.scss";
import { FC, useEffect, useState } from "react";
import { DataTable } from "../DataTable/DataTable";
import { Model } from "../../types/Model";
import { createColumnHelper } from "@tanstack/react-table";
import { IconModel, IconMoreVertical } from "apps/labelstudio/src/assets/icons";
import { Menu, Userpic } from "apps/labelstudio/src/components";
import { MenuItem } from "apps/labelstudio/src/components/Menu/MenuItem";
import { useAPI } from "apps/labelstudio/src/providers/ApiProvider";
import { useCurrentUser } from "apps/labelstudio/src/providers/CurrentUser";
import { DropdownTrigger } from "apps/labelstudio/src/components/Dropdown/DropdownTrigger";
import { format } from "date-fns";

export type ModelListProps = {
  data: Model[]
}

export const ModelsList: FC<ModelListProps> = (props) => {
  const api = useAPI();
  const [users, setUsers] = useState<any[]>([]);
  const user = useCurrentUser();

  const colHelper = createColumnHelper();
  const extraColumns = [
    colHelper.display({
      id: "filler",
      cell: () => <Elem name="filler"/>,
      maxSize: 0,
      size: 0,
    }),
    // Will be brought back under DIA-903
    // colHelper.display({
    //   id: "menu",
    //   cell: (props) => <ModelMenu model={props.row.getValue("id")}/>,
    //   size: 28,
    //   minSize: 28,
    // }),
  ];

  useEffect(() => {
    if (user.user && users.length === 0) {
      api.callApi<{results: any[]}>("memberships", {
        params: { pk: user.user.active_organization },
      }).then((response) => {
        if (response.$meta.status !== 200) return;
        const members = response.results?.map(({ user }) => user);

        setUsers(members);
      });
    }
  }, [api, user, users.length]);

  return (
    <Block name="models-list">
      <DataTable
        data={props.data}
        extraColumns={extraColumns}
        headers={{
          id: "Id",
          name: "Name",
          created: "Created",
          created_by: "Created By",
        }}
        sizes={{
          id: {
            minSize: 135,
          },
          name: {
            minSize: 170,
          },
          created: {
            minSize: 170,
          },
          created_by: {
            minSize: 125,
          },
        }}
        cells={{
          name(cell) {
            const modelId = cell.row.getValue("id");

            return (
              <Elem name="model-name" onClick={() => alert(`Opening model ${modelId}`)}>
                {cell.getValue() as string}
              </Elem>
            );
          },
          created_by(cell) {
            const user = users.find(u => u.id === Number(cell.getValue()));

            return <Userpic user={user}/>;
          },
          created(cell) {
            const date = new Date(cell.getValue() as number);
            const fmt = format(date, 'yyyy-MM-dd h:mm a');

            return fmt;
          },
        }}
      />
    </Block>
  );
};

const ModelMenu = ({
  model,
}: {
  model: number
}) => {
  return (
    <DropdownTrigger content={(
      <Menu>
        <MenuItem onClick={() => alert(`Deleting model ${model}`)}>Delete</MenuItem>
      </Menu>
    )}>
      <IconMoreVertical/>
    </DropdownTrigger>
  );
};
