import Registry from '../../../core/Registry';
import { HtxParagraphs } from './HtxParagraphs';
import { ParagraphsModel } from './model';

Registry.addTag('paragraphs', ParagraphsModel, HtxParagraphs);
Registry.addObjectType(ParagraphsModel);

export * from './model';
export * from './HtxParagraphs';
