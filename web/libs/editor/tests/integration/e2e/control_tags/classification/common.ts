import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { FF_LSDV_4583 } from "../../../../../src/utils/feature-flags";

export const commonBeforeEach = () => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_LSDV_4583]: true,
  });
};
