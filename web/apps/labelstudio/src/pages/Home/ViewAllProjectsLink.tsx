import { absoluteURL } from "../../utils/helpers";

export const ViewAllProjectsLink = () => (
  <a href={absoluteURL("/projects")} className="text-lg font-normal hover:underline">
    View All
  </a>
);
