import { FF_DEV_1170 } from "@humansignal/frontend-test/feature-flags";
import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF/LabelStudio";
import { FF_DEV_3873 } from "../../../../editor/src/utils/feature-flags";

export const ToolBar = {
  get root() {
    return LabelStudio.getFeatureFlag(FF_DEV_3873).then((isFFDEV3873) => {
      if (isFFDEV3873) {
        return cy.get(".lsf-bottombar");
      }

      return cy.get(".lsf-topbar");
    });
  },

  get submitBtn() {
    return this.root.find('[aria-label="submit"]');
  },
};
