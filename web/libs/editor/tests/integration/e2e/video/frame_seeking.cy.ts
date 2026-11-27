import { LabelStudio, VideoView } from "@humansignal/frontend-test/helpers/LSF/index";
import { simpleVideoConfig } from "../../data/video_segmentation/regions";

const simpleVideoData = { video: "/public/files/fps_24_frames_24_video.webm" };

describe("Video Frame Seeking", () => {
  it("Should be able to seek to a specific frame and see the correct frame without duplicating or skipping frames", () => {
    LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult([]).init();

    LabelStudio.waitForObjectsReady();

    VideoView.captureVideoCanvas("video_canvas");

    VideoView.clickAtFrame(2);

    VideoView.videoCanvasShouldChange("video_canvas", 0);

    VideoView.captureVideoCanvas("video_canvas");

    VideoView.clickAtFrame(3);

    VideoView.videoCanvasShouldChange("video_canvas", 0);

    VideoView.captureVideoCanvas("video_canvas");

    VideoView.clickAtFrame(4);

    VideoView.videoCanvasShouldChange("video_canvas", 0);
  });
});
