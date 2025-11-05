import { type FC, type RefObject, useCallback, useRef } from "react";
import { cn } from "../../utils/bem";
import { IconSend } from "@humansignal/icons";

import { TextArea } from "../../common/TextArea/TextArea";
import { observer } from "mobx-react";
import { Button } from "@humansignal/ui";

export type CommentFormProps = {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onBlur?: (e: FocusEvent) => void;
  inline?: boolean;
  rows?: number;
  maxRows?: number;
  classifications?: object | null;
};

export const CommentFormBase: FC<CommentFormProps> = observer(
  ({ value = "", inline = true, onChange, onSubmit, onBlur, rows = 1, maxRows = 4, classifications }) => {
    const formRef = useRef<HTMLFormElement>(null);
    const actionRef = useRef<{ update?: (text?: string) => void; el?: RefObject<HTMLTextAreaElement> }>({});

    const submitHandler = useCallback(
      async (e?: any) => {
        e?.preventDefault?.();

        if (!formRef.current) return;

        const comment = (new FormData(formRef.current).get("comment") as string)?.trim();

        if (!comment && !classifications) return;

        onSubmit?.(comment);
      },
      [onSubmit],
    );

    const onInput = useCallback(
      (comment: string) => {
        onChange?.(comment || "");
      },
      [onChange],
    );

    return (
      <form ref={formRef as any} className={cn("comment-form").mod({ inline }).toClassName()} onSubmit={submitHandler}>
        <TextArea
          actionRef={actionRef}
          name="comment"
          placeholder="Add a comment"
          value={value}
          rows={rows}
          maxRows={maxRows}
          onChange={onChange}
          onInput={onInput}
          onSubmit={(newValue) => {
            if (!inline) return;

            newValue = newValue.trim();
            if (!newValue) return;

            onSubmit?.(newValue);
          }}
          onBlur={(e) => onBlur?.(e)}
        />
        <div className={cn("comment-form").elem("primary-action").toClassName()}>
          <Button type="submit" aria-label="Submit comment" variant="neutral" look="string">
            <IconSend />
          </Button>
        </div>
      </form>
    );
  },
);
