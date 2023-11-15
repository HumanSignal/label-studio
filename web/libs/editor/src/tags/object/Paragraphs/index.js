import Registry from '../../../core/Registry';
import { ParagraphsModel } from './model';
import { HtxParagraphs } from './HtxParagraphs';

Registry.addTag('paragraphs', ParagraphsModel, HtxParagraphs);
Registry.addObjectType(ParagraphsModel);

export * from './model';
export * from './HtxParagraphs';
