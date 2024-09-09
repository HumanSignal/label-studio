import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF/LabelStudio";
import { FF_DEV_3873 } from "../../../../editor/src/utils/feature-flags";

export const ToolBar = {
  _controlsSelector: ".lsf-controls",

  get root() {
    return LabelStudio.getFeatureFlag(FF_DEV_3873).then((isFFDEV3873) => {
      if (isFFDEV3873) {
        return cy.get(".lsf-bottombar");
      }

      return cy.get(".lsf-topbar");
    });
  },

  get controls() {
    return this.root.find(this._controlsSelector);
  },

  get controlButtons() {
    return this.controls.find("button");
  },

  get submitBtn() {
    return this.root.find('[aria-label="submit"]');
  },
};
