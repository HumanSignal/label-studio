import { render, screen } from "@testing-library/react";
import { GridBody } from "../GridView.jsx";
import { types } from "mobx-state-tree";

const fields = [
  {
    id: "tasks:data.image",
    title: "image",
    alias: "image",
    type: "Image",
    displayType: null,
    defaultHidden: false,
    parent: {
      id: "tasks:data",
      title: "data",
      alias: "data",
      type: "List",
      displayType: null,
      defaultHidden: false,
      parent: null,
      children: ["tasks:data.image", "tasks:data.text", "tasks:data.audio"],
      target: "tasks",
      orderable: true,
      help: null,
    },
    children: null,
    target: "tasks",
    orderable: true,
    help: null,
    hidden: false,
    original: {
      id: "tasks:data.image",
      title: "image",
      alias: "image",
      type: "Image",
      displayType: null,
      defaultHidden: false,
      parent: "tasks:data",
      children: null,
      target: "tasks",
      orderable: true,
      help: null,
    },
    currentType: "Image",
    width: null,
  },
];

describe("GridBody", () => {
  it("renders the image when the data source is an array", async () => {
    const ImageModel = types.model({
      data: types.model({
        image: types.array(types.string),
      }),
    });

    const rowArrayImage = ImageModel.create({
      data: {
        image: [
          "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg?v=1",
          "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg?v=2",
          "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg?v=3",
          "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg?v=4",
        ],
      },
    });

    render(<GridBody row={rowArrayImage} fields={fields} />);

    // Wait for the image to load
    const imageElement = await screen.findByRole("img");

    //Check if the image is loaded with the expected src
    expect(imageElement.src).toBe(rowArrayImage.data.image[0]);
  });

  it("renders the image when the data source is an string", async () => {
    const ImageModel = types.model({
      data: types.model({
        image: types.string,
      }),
    });

    const rowArrayImage = ImageModel.create({
      data: {
        image:
          "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
      },
    });

    render(<GridBody row={rowArrayImage} fields={fields} />);

    // Wait for the image to load
    const imageElement = await screen.findByRole("img");

    //Check if the image is loaded with the expected src
    expect(imageElement.src).toBe(rowArrayImage.data.image);
  });
});
