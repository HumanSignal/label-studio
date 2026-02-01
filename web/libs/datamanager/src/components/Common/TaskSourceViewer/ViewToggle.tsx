import { Tabs, TabsList, TabsTrigger } from "@humansignal/ui";

export type ViewMode = "code" | "interactive";

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export const ViewToggle = ({ view, onViewChange, className }: ViewToggleProps) => {
  return (
    <Tabs value={view} onValueChange={onViewChange as (v: string) => void} variant="default">
      <TabsList className={className}>
        <TabsTrigger value="code">Code</TabsTrigger>
        <TabsTrigger value="interactive">Interactive</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
