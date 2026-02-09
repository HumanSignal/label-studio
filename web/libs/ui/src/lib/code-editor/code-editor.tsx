import {
  UnControlled as CodeMirrorUnControlled,
  Controlled as CodeMirrorControlled,
  type IUnControlledCodeMirror,
  type IControlledCodeMirror,
} from "react-codemirror2";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/xml/xml";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/search/search";
import "codemirror/addon/search/searchcursor";
import "codemirror/addon/search/matchesonscrollbar";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/scroll/annotatescrollbar";
import "./config-hint";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/dialog/dialog.css";
import "codemirror/addon/search/matchesonscrollbar.css";
import styles from "./code-editor.module.scss";
import { cn } from "@humansignal/shad/utils";
import { forwardRef } from "react";

/* eslint-disable-next-line */
type CodeMirrorType = typeof CodeMirrorUnControlled | typeof CodeMirrorControlled;
export interface CodeEditorProps {
  border?: boolean; // Add border to the editor
  ref?: React.Ref<CodeMirrorType>;
  controlled?: boolean;
}

export const CodeEditor = forwardRef(
  (props: CodeEditorProps & (IControlledCodeMirror | IUnControlledCodeMirror), ref) => {
    const { border = false, controlled = false, ...restProps } = props;

    return (
      <div
        className={cn(styles.codeEditor, {
          [styles.border]: border,
        })}
      >
        {controlled ? (
          <CodeMirrorControlled
            ref={ref as React.RefObject<CodeMirrorControlled>}
            {...(restProps as IControlledCodeMirror)}
          />
        ) : (
          <CodeMirrorUnControlled
            ref={ref as React.RefObject<CodeMirrorUnControlled>}
            {...(restProps as IUnControlledCodeMirror)}
          />
        )}
      </div>
    );
  },
);

export default CodeEditor;
