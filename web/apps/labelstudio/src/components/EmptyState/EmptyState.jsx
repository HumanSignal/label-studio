import { cn } from "../../utils/bem";
import "./EmptyState.scss";

export const EmptyState = ({ icon, title, description, action, footer }) => {
  return (
    <div className={cn("empty-state-default").toClassName()}>
      {icon && <div className={cn("empty-state-default").elem("icon").toClassName()}>{icon}</div>}
      {title && <div className={cn("empty-state-default").elem("title").toClassName()}>{title}</div>}
      {description && <div className={cn("empty-state-default").elem("description").toClassName()}>{description}</div>}
      {action && <div className={cn("empty-state-default").elem("action").toClassName()}>{action}</div>}
      {footer && <div className={cn("empty-state-default").elem("footer").toClassName()}>{footer}</div>}
    </div>
  );
};
