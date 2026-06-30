import { Hotkeys, Labels, LabelStudio, Sidebar, VideoView } from "@humansignal/frontend-test/helpers/LSF/index";
import { videoVectorConfig, videoVectorData } from "../../data/video_segmentation/vector";

const suiteConfig = {
  retries: {
    runMode: 3,
    openMode: 0,
  },
};

const pointCount = () =>
  LabelStudio.serialize().then((results) => {
    const vertices = results?.[0]?.value?.sequence?.[0]?.vertices ?? [];
    return vertices.length;
  });

// BROS-1396: after finishing a video vector drawing, the region must remain
// selected (like the image Vector tool) so that Shift+Click can insert new
// points. Previously the video tool's `complete()` force-unselected the region,
// which disabled the Shift+Click ghost-point insertion handled by KonvaVector
// (it only allows point editing on a selected region).
describe("Video vector - Shift+Click point insertion", suiteConfig, () => {
  it("adds a point with Shift+Click after finishing the drawing", () => {
    LabelStudio.params().config(videoVectorConfig).data(videoVectorData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();

    // Match the typical SaaS setup where finishing a draw selects the region.
    cy.window().then((win) => {
      if (!win.Htx.settings.selectAfterCreate) win.Htx.settings.toggleSelectAfterCreate();
    });

    Labels.select("Road");

    // Draw a 4-point open vector.
    VideoView.clickAtRelative(0.2, 0.2);
    VideoView.clickAtRelative(0.6, 0.2);
    VideoView.clickAtRelative(0.6, 0.6);
    VideoView.clickAtRelative(0.2, 0.6);

    Sidebar.hasRegions(1);
    pointCount().should("eq", 4);

    // Finish the drawing (Esc). The region must stay selected afterwards.
    Hotkeys.unselectAllRegions();
    Sidebar.hasSelectedRegions(1);

    // Shift+Click on the midpoint of the right-edge segment (x≈61%, y≈40%)
    // should insert a new vertex on that segment.
    VideoView.clickAtRelative(0.6, 0.4, { shiftKey: true });

    pointCount().should("eq", 5);
  });

  it("unselects a resumed skeleton vector with one Esc after adding a branch", () => {
    LabelStudio.params().config(videoVectorConfig).data(videoVectorData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();

    cy.window().then((win) => {
      if (!win.Htx.settings.selectAfterCreate) win.Htx.settings.toggleSelectAfterCreate();
    });

    Labels.select("Road");

    // Draw and finish the initial open skeleton vector so it is selected.
    VideoView.clickAtRelative(0.2, 0.2);
    VideoView.clickAtRelative(0.6, 0.2);
    VideoView.clickAtRelative(0.6, 0.6);
    VideoView.clickAtRelative(0.2, 0.6);
    pointCount().should("eq", 4);
    Hotkeys.unselectAllRegions();
    Sidebar.hasSelectedRegions(1);

    // Resume from an existing skeleton point, then add one branch segment.
    VideoView.clickAtRelative(0.2, 0.2);
    VideoView.clickAtRelative(0.4, 0.4);
    pointCount().should("eq", 5);
    Sidebar.hasSelectedRegions(1);

    // Regression: this used to only complete the VideoVector drawing state,
    // leaving the selected region active until a second Esc press.
    Hotkeys.unselectAllRegions();
    Sidebar.hasSelectedRegions(0);
  });
});
