import { forwardRef } from "react";
import type { IControlledCodeMirror, IUnControlledCodeMirror } from "react-codemirror2";
import { ff } from "@humansignal/core";
import { Cm6CodeEditor } from "./cm6-code-editor";
import { LegacyCodeEditor, type CodeEditorProps } from "./legacy-code-editor";

export type { CodeEditorProps } from "./legacy-code-editor";

export const CodeEditor = forwardRef(
  (props: CodeEditorProps & (IControlledCodeMirror | IUnControlledCodeMirror), ref) => {
    if (ff.isActive(ff.FF_FIT_2007_VIRTUALIZED_JSON_EDITOR)) {
      return <Cm6CodeEditor ref={ref} {...props} />;
    }

    return <LegacyCodeEditor ref={ref} {...props} />;
  },
);

export default CodeEditor;
