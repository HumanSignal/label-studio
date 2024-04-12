import Registry from '../../../core/Registry';
import { RichTextModel } from './model';
import { HtxRichText } from './view';

Registry.addTag('text', RichTextModel, HtxRichText({ isText: true }));
Registry.addTag('hypertext', RichTextModel, HtxRichText({ isText: false }));
Registry.addObjectType(RichTextModel);

export { RichTextModel, HtxRichText };
