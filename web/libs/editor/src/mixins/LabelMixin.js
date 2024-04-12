import { types } from 'mobx-state-tree';

/**
 * @todo we didn't need all these methods, so mixin is empty for now.
 * Relevant parts of SelectedMixin can be moved here
 * to finally split Labels and Choices; so the file left in place.
 */
const LabelMixin = types.model('LabelMixin');

export default LabelMixin;
