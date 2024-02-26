import './core/feature-flags';
import './assets/styles/global.scss';
import "antd/dist/antd.css";
import { LabelStudio } from './LabelStudio';
console.log('LabelStudio', LabelStudio);

window.LabelStudio = LabelStudio;

export default LabelStudio;

export { LabelStudio };
