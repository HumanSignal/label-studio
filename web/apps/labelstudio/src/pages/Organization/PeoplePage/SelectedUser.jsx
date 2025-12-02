import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { IconCross } from "@humansignal/icons";
import { Userpic, Button, useToast } from "@humansignal/ui";
import { useAuth } from "@humansignal/core/providers/AuthProvider";
import { useAPI } from "../../../providers/ApiProvider";
import { Block, Elem } from "../../../utils/bem";
import "./SelectedUser.scss";

const UserProjectsLinks = ({ projects }) => {
  return (
    <Elem name="links-list">
      {projects.map((project) => (
        <Elem
          tag={NavLink}
          name="project-link"
          key={`project-${project.id}`}
          to={`/projects/${project.id}`}
          data-external
        >
          {project.title}
        </Elem>
      ))}
    </Elem>
  );
};

export const SelectedUser = ({ user, onClose, onRoleChanged }) => {
  const api = useAPI();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const fullName = [user.first_name, user.last_name]
    .filter((n) => !!n)
    .join(" ")
    .trim();

  const roleMetadata = useMemo(() => {
    const nextRole = user.role === "admin" ? "annotator" : "admin";
    const label = user.role === "admin" ? "Admin" : "Annotator";
    const actionLabel = user.role === "admin" ? "Set as Annotator" : "Make Admin";

    return { nextRole, label, actionLabel };
  }, [user.role]);

  const canChangeRole = currentUser?.role === "admin";
  const isSelf = currentUser?.id === user.id;

  const handleRoleChange = useCallback(async () => {
    if (!canChangeRole || isUpdatingRole) return;

    setIsUpdatingRole(true);
    try {
      const updatedUser = await api.callApi("updateUser", {
        params: { pk: user.id },
        body: { role: roleMetadata.nextRole },
      });

      toast.show({
        message: roleMetadata.nextRole === "admin" ? "User promoted to admin" : "User set to annotator",
      });
      onRoleChanged?.(updatedUser);
    } catch (err) {
      const errorDetail = err?.response?.detail || err?.detail || err?.message || "Failed to update role";
      toast.show({ message: errorDetail, error: true });
    } finally {
      setIsUpdatingRole(false);
    }
  }, [api, canChangeRole, isUpdatingRole, onRoleChanged, roleMetadata.nextRole, toast, user.id]);

  return (
    <Block name="user-info">
      <Button
        look="string"
        onClick={onClose}
        className="absolute top-[20px] right-[24px]"
        aria-label="Close user details"
      >
        <IconCross />
      </Button>

      <Elem name="header">
        <Userpic user={user} style={{ width: 64, height: 64, fontSize: 28 }} />
        <Elem name="info-wrapper">
          {fullName && <Elem name="full-name">{fullName}</Elem>}
          <Elem tag="p" name="email">
            {user.email}
          </Elem>
        </Elem>
      </Elem>

      <Elem name="section">
        <Elem name="section-title">Role</Elem>
        <Elem name="role-pill" mod={{ type: user.role }}>
          {roleMetadata.label}
        </Elem>

        {canChangeRole && (
          <div className="user-info__role-actions">
            <Button
              look={user.role === "admin" ? "outlined" : "primary"}
              disabled={isUpdatingRole}
              onClick={handleRoleChange}
            >
              {roleMetadata.actionLabel}
            </Button>
          </div>
        )}

        {isSelf && (
          <Elem tag="p" name="role-warning">
            Changing your own role may remove access to organization settings.
          </Elem>
        )}
      </Elem>

      {user.phone && (
        <Elem name="section">
          <a href={`tel:${user.phone}`}>{user.phone}</a>
        </Elem>
      )}

      {!!user.created_projects.length && (
        <Elem name="section">
          <Elem name="section-title">Created Projects</Elem>

          <UserProjectsLinks projects={user.created_projects} />
        </Elem>
      )}

      {!!user.contributed_to_projects.length && (
        <Elem name="section">
          <Elem name="section-title">Contributed to</Elem>

          <UserProjectsLinks projects={user.contributed_to_projects} />
        </Elem>
      )}

      <Elem tag="p" name="last-active">
        Last activity on: {format(new Date(user.last_activity), "dd MMM yyyy, KK:mm a")}
      </Elem>
    </Block>
  );
};
