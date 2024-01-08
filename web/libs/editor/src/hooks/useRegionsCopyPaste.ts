import { useEffect } from 'react';

export const useRegionsCopyPaste = (entity: any) => {
  useEffect(() => {
    const isFocusable = (el: Node | Window | HTMLElement | null) => {
      if (!el) return false;
      if ((el as Node).nodeType !== Node.ELEMENT_NODE) return false;

      const element = el as HTMLElement;
      const tabIndex = parseInt(element.getAttribute('tabindex') ?? '', 10);
      const isFocusable = element.matches('a, button, input, textarea, select, details, [tabindex], [contenteditable]');

      return isFocusable || tabIndex > -1;
    };

    const allowCopyPaste = () => {
      const selection = window.getSelection();
      const focusNode = selection?.focusNode;
      const nodeIsFocusable = isFocusable(focusNode as HTMLElement);
      const activeElementIsFocusable = isFocusable(document.activeElement);
      const selectionIsCollapsed = selection?.isCollapsed ?? true;

      return selectionIsCollapsed && !nodeIsFocusable && !activeElementIsFocusable;
    };

    const copyToClipboard = (ev: ClipboardEvent) => {
      const { clipboardData } = ev;
      const results = entity.serializedSelection;

      clipboardData?.setData('application/json', JSON.stringify(results));
      ev.preventDefault();
    };

    const pasteFromClipboard = (ev: ClipboardEvent) => {
      const { clipboardData } = ev;
      const data = clipboardData?.getData('application/json');

      try {
        const results = (data ? JSON.parse(data) : []).map((res: any) => {
          return { ...res, readonly: false };
        });

        entity.appendResults(results);
        ev.preventDefault();
      } catch (e) {
        console.error(e);
        return;
      }
    };

    const copyHandler = (ev: Event) => {
      if (!allowCopyPaste()) return;

      copyToClipboard(ev as ClipboardEvent);
    };

    const pasteHandler = (ev: Event) => {
      if (!allowCopyPaste()) return;

      pasteFromClipboard(ev as ClipboardEvent);
    };

    const cutHandler = (ev: Event) => {
      if (!allowCopyPaste()) return;

      copyToClipboard(ev as ClipboardEvent);
      entity.deleteSelectedRegions();
    };

    window.addEventListener('copy', copyHandler);
    window.addEventListener('paste', pasteHandler);
    window.addEventListener('cut', cutHandler);
    return () => {
      window.removeEventListener('copy', copyHandler);
      window.removeEventListener('paste', pasteHandler);
      window.removeEventListener('cut', cutHandler);
    };
  }, [entity.pk ?? entity.id]);
};
