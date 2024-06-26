import { format } from "date-fns";
import { NavLink } from "react-router-dom";
import { LsCross } from "../../../assets/icons";
import { Button, Userpic } from "../../../components";
import { Block, Elem } from "../../../utils/bem";
import "./SelectedUser.styl";

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

export const SelectedUser = ({ user, onClose }) => {
  const fullName = [user.first_name, user.last_name]
    .filter((n) => !!n)
    .join(" ")
    .trim();

  return (
    <Block name="user-info">
      <Elem name="close" tag={Button} type="link" onClick={onClose}>
        <LsCross />
      </Elem>

      <Elem name="header">
        <Userpic user={user} style={{ width: 64, height: 64, fontSize: 28 }} />
        <Elem name="info-wrapper">
          {fullName && <Elem name="full-name">{fullName}</Elem>}
          <Elem tag="p" name="email">
            {user.email}
          </Elem>
        </Elem>
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
