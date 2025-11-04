import { Redirect, Route } from "react-router-dom";
import { useAuth } from "@humansignal/core/providers/AuthProvider";
import { useParams } from "../../providers/RoutesProvider";

/**
 * AdminRoute - A route wrapper that only allows admin users to access the route.
 * Non-admin users are silently redirected to an appropriate fallback page.
 *
 * @param {Object} props - Route props
 * @param {string} props.redirectTo - Optional custom redirect path for non-admins
 * @param {Function} props.component - Component to render for admins
 * @param {Function} props.render - Render function for admins
 * @param {ReactNode} props.children - Children to render for admins
 * @returns {ReactElement} Route component with admin protection
 */
export const AdminRoute = ({ redirectTo, component: Component, render, children, ...rest }) => {
  const { user } = useAuth();
  const params = useParams();

  const isAdmin = user?.role === "admin";

  // Determine fallback redirect path
  const getFallbackPath = () => {
    if (redirectTo) return redirectTo;

    // If we're in a project context, redirect to the project's data page
    if (params?.id) {
      return `/projects/${params.id}/data`;
    }

    // Otherwise, redirect to projects list
    return "/projects";
  };

  return (
    <Route
      {...rest}
      render={(props) => {
        if (!isAdmin) {
          return <Redirect to={getFallbackPath()} />;
        }

        if (Component) {
          return <Component {...props} />;
        }

        if (render) {
          return render(props);
        }

        return children;
      }}
    />
  );
};
