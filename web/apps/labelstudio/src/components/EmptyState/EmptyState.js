import { FC, ReactElement } from "react";
import { BemWithSpecifiContext } from '../../utils/bem';
import "./EmptyState.styl";

const { Block, Elem } = BemWithSpecifiContext();


const EmptyState = ({ icon, title, description, action, footer }) => {
  return (
      <Block name="empty-state-default" tag="div">	  
	  { icon && <Elem name="icon">{ icon }</Elem> }
	  { title && <Elem name="title">{ title }</Elem> }
	  { description && <Elem name="description">{ description }</Elem> }
	  { action && <Elem name="action">{ action }</Elem> }
	  { footer && <Elem name="footer">{ footer }</Elem> }
    </Block>
  );
};

export { EmptyState };
