export const imageToolsConfig = `<View>
    <Image name="image" value="$image" />
    <Rectangle name="rect" toName="image" />
    <Ellipse name="ellipse" toName="image" />
    <Polygon name="polygon" toName="image" />
    <KeyPoint name="keypoint" toName="image" />
    <Brush name="brush" toName="image" />
</View>`;

/** Image config with rotate control enabled. */
export const imageToolsConfigWithRotate = `<View>
    <Image name="image" value="$image" rotatecontrol="true" />
    <Rectangle name="rect" toName="image" />
    <Ellipse name="ellipse" toName="image" />
    <Polygon name="polygon" toName="image" />
    <KeyPoint name="keypoint" toName="image" />
    <Brush name="brush" toName="image" />
</View>`;

import { IMAGE_URL_SAMPLE } from "../shared-assets";

export const imageData = {
  image: IMAGE_URL_SAMPLE,
};
