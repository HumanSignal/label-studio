import { RichTextModel } from './model';
import { HtxRichText } from './view';
import Registry from '../../../core/Registry';

Registry.addTag('text', RichTextModel, HtxRichText({ isText: true }));
Registry.addTag('hypertext', RichTextModel, HtxRichText({ isText: false }));
Registry.addObjectType(RichTextModel);

export { RichTextModel, HtxRichText };
