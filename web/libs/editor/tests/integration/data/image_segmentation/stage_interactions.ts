export const imageToolsConfig = `<View>
    <Image name="image" value="$image" />
    <Rectangle name="rect" toName="image" />
    <Ellipse name="ellipse" toName="image" />
    <Polygon name="polygon" toName="image" />
    <KeyPoint name="keypoint" toName="image" />
    <Brush name="brush" toName="image" />
</View>`;

/** Image config with rotate control enabled (for Rotate.jsx coverage). */
export const imageToolsConfigWithRotate = `<View>
    <Image name="image" value="$image" rotatecontrol="true" />
    <Rectangle name="rect" toName="image" />
    <Ellipse name="ellipse" toName="image" />
    <Polygon name="polygon" toName="image" />
    <KeyPoint name="keypoint" toName="image" />
    <Brush name="brush" toName="image" />
</View>`;

export const imageData = {
  image:
    "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
};
