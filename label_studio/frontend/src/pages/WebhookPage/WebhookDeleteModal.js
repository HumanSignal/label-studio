import React from 'react';

import { Button } from "../../components";
import { modal } from "../../components/Modal/Modal";
import { useModalControls } from "../../components/Modal/ModalPopup";
import { Space } from "../../components/Space/Space";
import { cn } from "../../utils/bem";
import { useTranslation } from "react-i18next";
import "../../translations/i18n";


export const WebhookDeleteModal = ({onDelete}) => {
  const { t } = useTranslation();

  return modal({
    title: t("delete"),
    body: () => {
      const rootClass = cn('webhook-delete-modal');
      return (<div className={rootClass}>
        <div className={rootClass.elem('modal-text')}>
          {t("areYouSureWant")}   
        </div>

      </div>);},
    footer: () => {
      const ctrl = useModalControls();
      const rootClass = cn('webhook-delete-modal');
      return <Space align="end">
        <Button 
          className={rootClass.elem('width-button')} 
          onClick={()=>{ctrl.hide();}}>
          {t("cancel")}
        </Button>
        <Button 
          look="destructive"
          className={rootClass.elem('width-button')}
          onClick={
            async ()=>{
              await onDelete();
              ctrl.hide();
            }
          }
        >{t("delete")}</Button>
      </Space>;
    },
    style: { width: 512 },
  });
};
