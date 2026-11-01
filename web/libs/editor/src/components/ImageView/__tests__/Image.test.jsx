import { fireEvent, render } from "@testing-library/react";
import { Image } from "../Image";

const createEntity = (id, overrides = {}) => ({
  id,
  src: "https://example.com/page.jpg",
  currentSrc: "blob:shared-page",
  downloaded: true,
  downloading: false,
  error: false,
  progress: 1,
  imageLoaded: false,
  setImageLoaded: jest.fn(),
  setError: jest.fn(),
  ...overrides,
});

const renderImage = (imageEntity) => (
  <Image
    imageEntity={imageEntity}
    imageTransform={{}}
    updateImageSize={jest.fn()}
    usedValue="$pages"
    size={{ width: 100, height: 100 }}
  />
);

describe("Image", () => {
  it("marks the entity loaded when its <img> fires load", () => {
    const page = createEntity("pdf#0");
    const { container } = render(renderImage(page));

    fireEvent.load(container.querySelector("img"));

    expect(page.setImageLoaded).toHaveBeenCalledWith(true);
  });

  // FIT-3163: multi-page Image with identical page URLs shares one cached blob URL,
  // so `src` never changes between pages. Without a fresh <img>, the browser never
  // fires `load` for the new page and it stays hidden (imageLoaded=false) forever.
  it("mounts a fresh <img> per page so load fires even when pages share the same src", () => {
    const page1 = createEntity("pdf#0", { imageLoaded: true });
    const page2 = createEntity("pdf#1");
    const { container, rerender } = render(renderImage(page1));
    const page1Img = container.querySelector("img");

    rerender(renderImage(page2));
    const page2Img = container.querySelector("img");

    expect(page2Img.getAttribute("src")).toBe(page1Img.getAttribute("src"));
    expect(page2Img).not.toBe(page1Img);

    fireEvent.load(page2Img);
    expect(page2.setImageLoaded).toHaveBeenCalledWith(true);
  });
});
