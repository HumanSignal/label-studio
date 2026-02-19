import { format } from "date-fns";
import { NavLink } from "react-router-dom";
import { IconCross } from "@humansignal/icons";
import { Userpic, Button } from "@humansignal/ui";
import styles from "./SelectedUser.module.scss";

const UserProjectsLinks = ({ projects }) => {
  return (
    <div className={`${styles["user-info"]} ${styles["user-info__links-list"]}`}>
      {projects.map((project) => (
        <NavLink
          className={`${styles["user-info"]} ${styles["user-info__project-link"]}`}
          key={`project-${project.id}`}
          to={`/projects/${project.id}`}
          data-external
        >
          {project.title}
        </NavLink>
      ))}
    </div>
  );
};

export const SelectedUser = ({ user, onClose }) => {
  const fullName = [user.first_name, user.last_name]
    .filter((n) => !!n)
    .join(" ")
    .trim();

  return (
    <div className={styles["user-info"]}>
      <Button
        look="string"
        onClick={onClose}
        className="absolute top-[20px] right-[24px]"
        aria-label="Close user details"
      >
        <IconCross />
      </Button>

      <div className={`${styles["user-info"]} ${styles["user-info__header"]}`}>
        <Userpic user={user} style={{ width: 64, height: 64, fontSize: 28 }} />
        <div className={styles["user-info"]}>
          {fullName && <div className={`${styles["user-info"]} ${styles["user-info__full-name"]}`}>{fullName}</div>}
          <p className={`${styles["user-info"]} ${styles["user-info__email"]}`}>{user.email}</p>
        </div>
      </div>

      {user.phone && (
        <div className={`${styles["user-info"]} ${styles["user-info__section"]}`}>
          <a href={`tel:${user.phone}`}>{user.phone}</a>
        </div>
      )}

      {!!user.created_projects.length && (
        <div className={`${styles["user-info"]} ${styles["user-info__section"]}`}>
          <div className={styles["user-info"]}>Created Projects</div>

          <UserProjectsLinks projects={user.created_projects} />
        </div>
      )}

      {!!user.contributed_to_projects.length && (
        <div className={`${styles["user-info"]} ${styles["user-info__section"]}`}>
          <div className={styles["user-info"]}>Contributed to</div>

          <UserProjectsLinks projects={user.contributed_to_projects} />
        </div>
      )}

      <p className={`${styles["user-info"]} ${styles["user-info__last-active"]}`}>
        Last activity on: {format(new Date(user.last_activity), "dd MMM yyyy, KK:mm a")}
      </p>
    </div>
  );
};
