import Running24 from "!!url-loader!./Running-24.gif";
import Running24x2 from "!!url-loader!./Running-24@2x.gif";
import Running48 from "!!url-loader!./Running-48.gif";
import Running48x2 from "!!url-loader!./Running-48@2x.gif";
import Running64 from "!!url-loader!./Running-64.gif";
import Running64x2 from "!!url-loader!./Running-64@2x.gif";
import Running from "!!url-loader!./Running.gif";

const sizes = {
  full: {
    x1: Running,
    x2: Running,
  },
  24: {
    x1: Running24,
    x2: Running24x2,
  },
  48: {
    x1: Running48,
    x2: Running48x2,
  },
  64: {
    x1: Running64,
    x2: Running64x2,
  },
};

export default sizes;
