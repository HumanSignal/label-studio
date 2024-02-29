import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import ToolMixin from '../mixins/Tool';
import { AnnotationMixin } from '../mixins/AnnotationMixin';
import {IconCheck, IconCross} from '../assets/icons';


const _AcceptAutoAnnotationTool = types.model('AcceptAutoAnnotationTool', {
  shortcut: 'Y',
  group: 'segmentation',
}).views(() => {
  return {
    get viewTooltip() {
      return 'Accept Annotation';
    },
    get iconComponent() {
      return IconCheck;
    }
  };
})
  .actions(self => {

    return {
      accept() {
        console.log('clicked accept')
        console.log(self)
      }
    }

  })

const _RejectAutoAnnotationTool = types.model('RejectAutoAnnotationTool', {
  shortcut: 'Y',
  group: 'segmentation',
}).views(() => {
  return {
    get viewTooltip() {
      return 'Reject Annotation';
    },
    get iconComponent() {
      return IconCross;
    }
  };
})
  .actions(self => {
    return {
      reject() {
        console.log('clicked reject')
        console.log(self)
      }
    }
  })


const AcceptAutoAnnotation = types.compose('AcceptAutoAnnotationTool', ToolMixin, BaseTool, AnnotationMixin, _AcceptAutoAnnotationTool);
const RejectAutoAnnotation = types.compose('RejectAutoAnnotationTool', ToolMixin, BaseTool, _RejectAutoAnnotationTool)

export { AcceptAutoAnnotation, RejectAutoAnnotation };
