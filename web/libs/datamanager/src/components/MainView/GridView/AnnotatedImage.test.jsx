import { describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { AnnotatedImage } from "./AnnotatedImage";

const config =
  '<View><Image name="image" value="$image"/><PolygonLabels name="outline" toName="image"><Label value="shell" background="#ff0000"/></PolygonLabels></View>';
const task = { id: 1, total_annotations: 1 };
const result = {
  id: "region",
  type: "polygonlabels",
  from_name: "outline",
  to_name: "image",
  original_width: 200,
  original_height: 100,
  value: {
    points: [
      [10, 20],
      [50, 20],
      [50, 80],
    ],
    polygonlabels: ["shell"],
  },
};
const response = { annotations: [{ id: 7, result: [result] }] };

describe("annotated grid image", () => {
  it("renders aligned polygon geometry and hides it without requesting annotations", async () => {
    const loadTask = mock(async () => response);
    const { container, rerender } = render(
      <AnnotatedImage task={task} image="/image.jpg" field="image" config={config} enabled loadTask={loadTask} />,
    );
    await waitFor(() => expect(container.querySelector("polygon")).not.toBeNull());
    expect(container.querySelector("polygon").getAttribute("points")).toBe("20,20 100,20 100,80");
    expect(container.querySelector("polygon").getAttribute("stroke")).toBe("#ff0000");
    expect(screen.getByText(/#7/)).toBeInTheDocument();
    rerender(
      <AnnotatedImage
        task={task}
        image="/image.jpg"
        field="image"
        config={config}
        enabled={false}
        loadTask={loadTask}
      />,
    );
    expect(container.querySelector("polygon")).toBeNull();
    expect(loadTask).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['fillOpacity="0" opacity="0.6"', "0"],
    ['opacity="0"', "0"],
    ['fillopacity="0.35" opacity="0.6"', "0.35"],
    ["", "0.2"],
  ])("respects configured shape fill opacity: %s", async (attributes, expected) => {
    const { container } = render(
      <AnnotatedImage
        task={task}
        image="/image.jpg"
        field="image"
        config={config.replace("<PolygonLabels ", `<PolygonLabels ${attributes} `)}
        enabled
        loadTask={async () => response}
      />,
    );
    await waitFor(() => expect(container.querySelector("polygon")).not.toBeNull());
    expect(container.querySelector("polygon").getAttribute("fill-opacity")).toBe(expected);
    expect(container.querySelector("polygon").getAttribute("stroke")).toBe("#ff0000");
  });

  it("uses the same cover/contain mode for the image and annotation overlay", async () => {
    const loadTask = async () => response;
    const props = { task, image: "/image.jpg", field: "image", config, enabled: true, loadTask };
    const { container, rerender } = render(<AnnotatedImage {...props} fitImagesToWidth />);
    await waitFor(() => expect(container.querySelector("polygon")).not.toBeNull());
    expect(container.querySelector("img").style.objectFit).toBe("cover");
    expect(container.querySelector("svg").getAttribute("preserveAspectRatio")).toBe("xMidYMid slice");
    rerender(<AnnotatedImage {...props} fitImagesToWidth={false} />);
    expect(container.querySelector("img").style.objectFit).toBe("contain");
    expect(container.querySelector("svg").getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });

  it("does not apply a late response to a different task", async () => {
    let finish;
    const loadTask = mock(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { container, rerender } = render(
      <AnnotatedImage task={task} image="/one.jpg" field="image" config={config} enabled loadTask={loadTask} />,
    );
    await waitFor(() => expect(finish).toBeDefined());
    rerender(
      <AnnotatedImage
        task={{ id: 2, total_annotations: 0 }}
        image="/two.jpg"
        field="image"
        config={config}
        enabled
        loadTask={loadTask}
      />,
    );
    finish(response);
    await waitFor(() => expect(screen.getByText("No submitted annotations")).toBeInTheDocument());
    expect(container.querySelector("polygon")).toBeNull();
  });

  it("refetches the saved result when returning to the grid", async () => {
    let responseNow = response;
    const loadTask = async () => responseNow;
    const props = { task, image: "/image.jpg", field: "image", config, enabled: true, loadTask };
    const first = render(<AnnotatedImage {...props} />);
    await waitFor(() => expect(first.container.querySelector("polygon")).not.toBeNull());
    first.unmount();
    responseNow = { annotations: [{ id: 7, result: [] }] };
    const second = render(<AnnotatedImage {...props} />);
    await waitFor(() => expect(screen.getByText("Annotation #7")).toBeInTheDocument());
    expect(second.container.querySelector("polygon")).toBeNull();
  });

  it("flags rotated or unsupported regions rather than silently hiding them", async () => {
    render(
      <AnnotatedImage
        task={task}
        image="/image.jpg"
        field="image"
        config={config}
        enabled
        loadTask={async () => ({ annotations: [{ id: 7, result: [{ ...result, image_rotation: 90 }] }] })}
      />,
    );
    await waitFor(() => expect(screen.getByText("Partial preview · open task")).toBeInTheDocument());
  });

  it("reports fetch failures rather than presenting them as unannotated images", async () => {
    render(
      <AnnotatedImage
        task={task}
        image="/image.jpg"
        field="image"
        config={config}
        enabled
        loadTask={async () => ({ error: "Forbidden" })}
      />,
    );
    await waitFor(() => expect(screen.getByText("Preview unavailable · open task")).toBeInTheDocument());
  });
});
