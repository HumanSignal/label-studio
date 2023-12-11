interface NodeViewProps {
  name: string;
  icon: any;
  altIcon?: any;
  getContent?: (node: any) => JSX.Element | null;
  fullContent?: (node: any) => JSX.Element | null;
}

export const NodeView = ({
  name,
  icon,
  altIcon = null,
  getContent = () => null,
  fullContent = () => null,
}: NodeViewProps) => {
  if (altIcon instanceof Function) {
    [getContent, altIcon] = [altIcon, null];
  }

  return { name, icon, altIcon, getContent, fullContent };
};
