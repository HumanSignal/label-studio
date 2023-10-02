/// <reference path="./types/Global.d.ts" />

import './core/feature-flags';
import './assets/styles/global.scss';
// @ts-ignore
import { LabelStudio } from './LabelStudio';


// @ts-ignore
window.LabelStudio = LabelStudio;

export default LabelStudio;

export { LabelStudio };
