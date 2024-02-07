export const ModelsApiConfig = {
  "modelsList": {
    path: "/models/list",
    method: "get",
    async mock(request: any) {
      return {
        models: [
          {
            id: '0000001',
            name: "RatingsExpert",
            created: new Date(),
            created_by: 1,
          },{
            id: '0000002',
            name: "FoodExpert",
            created: new Date(),
            created_by: 1,
          },
        ],
      };
    },
  },
};
