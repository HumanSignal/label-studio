import { IconTrash, IconUserAdd } from "@humansignal/icons";
import { Button, Typography } from "@humansignal/ui";
import { useCallback, useContext, useState, useEffect } from "react";
import { ApiContext } from "../../providers/ApiProvider";
import { ProjectContext } from "../../providers/ProjectProvider";
import { Block, Elem } from "../../utils/bem";
import { useCurrentUserAtom } from "@humansignal/core";
import "./members-settings.scss";

export const MembersSettings = () => {
  const api = useContext(ApiContext);
  const { project } = useContext(ProjectContext);
  const currentUserAtom = useCurrentUserAtom();
  const currentUser = currentUserAtom?.user;
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isAdmin = currentUser?.role === "admin";

  // Fetch project members
  const fetchMembers = useCallback(async () => {
    if (!project?.id || !api) return;

    try {
      setLoading(true);
      const response = await api.callApi("projectMembers", {
        params: { pk: project.id },
      });
      setMembers(response || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching members:", err);
      setError("Failed to load project members");
    } finally {
      setLoading(false);
    }
  }, [api, project?.id]);

  // Fetch all users in the organization
  const fetchAvailableUsers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const response = await api.callApi("users");
      const allUsers = response.results || response || [];

      // Filter out users who are already members
      const memberIds = new Set(members.map(m => m.user_id));
      const available = allUsers.filter(user => !memberIds.has(user.id));

      setAvailableUsers(available);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [api, isAdmin, members]);

  useEffect(() => {
    if (project?.id && api) {
      fetchMembers();
    }
  }, [project?.id, api]);

  useEffect(() => {
    if (isAdmin && members.length >= 0 && api) {
      fetchAvailableUsers();
    }
  }, [isAdmin, members.length, api]);

  // Early return if required dependencies are not available (after all hooks)
  if (!api || !project?.id) {
    return (
      <Block name="members-settings">
        <Elem name="wrapper">
          <h1>Project Members</h1>
          <Typography size="small" className="text-neutral-content-subtler mb-4">
            Loading project information...
          </Typography>
        </Elem>
      </Block>
    );
  }

  const handleAddMember = async () => {
    if (!selectedUserId || !isAdmin || !api || !project?.id) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const userId = parseInt(selectedUserId, 10);

      if (isNaN(userId)) {
        setError("Invalid user selection");
        setLoading(false);
        return;
      }

      await api.callApi("addProjectMember", {
        params: { pk: project.id },
        body: {
          user_id: userId,
        },
      });

      setSuccess("User added to project successfully");
      setSelectedUserId("");
      await fetchMembers();
    } catch (err) {
      console.error("Error adding member:", err);
      const errorMessage = err?.response?.data?.error ||
                          err?.response?.data?.detail ||
                          err?.message ||
                          "Failed to add user to project. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!isAdmin || !api || !project?.id) return;

    if (!window.confirm("Are you sure you want to remove this user from the project?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await api.callApi("removeProjectMember", {
        params: { pk: project.id, userId: userId },
      });

      setSuccess("User removed from project successfully");
      await fetchMembers();
    } catch (err) {
      console.error("Error removing member:", err);
      const errorMessage = err?.response?.data?.error ||
                          err?.response?.data?.detail ||
                          err?.message ||
                          "Failed to remove user from project. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const isAdminRole = role === "admin";
    return (
      <span
        className={`role-badge ${isAdminRole ? "role-badge--admin" : "role-badge--annotator"}`}
      >
        {isAdminRole ? "Admin" : "Annotator"}
      </span>
    );
  };

  return (
    <Block name="members-settings">
      <Elem name="wrapper">
        <h1>Project Members</h1>
        <Typography size="small" className="text-neutral-content-subtler mb-4">
          Manage users who have access to this project. Only annotators assigned to this project can see and work on its tasks.
        </Typography>

        {error && (
          <div className="error-message mb-4" style={{ padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message mb-4" style={{ padding: '12px', backgroundColor: '#efe', border: '1px solid #cfc', borderRadius: '4px', color: '#060' }}>
            {success}
          </div>
        )}

        {isAdmin && (
          <Block name="add-member">
            <Elem name="title">Add Member</Elem>
            <Elem name="form">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loading || availableUsers.length === 0}
                className="member-select"
              >
                <option value="">Select a user to add...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.first_name} {user.last_name}) - {user.role}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId || loading}
                size="small"
                aria-label="Add member"
                leading={<IconUserAdd />}
              >
                Add to Project
              </Button>
            </Elem>
            {availableUsers.length === 0 && members.length > 0 && (
              <Typography size="small" className="text-neutral-content-subtler mt-2">
                All users in the organization are already members of this project.
              </Typography>
            )}
          </Block>
        )}

        <Block name="members-list">
          <Elem name="title">Current Members ({members.length})</Elem>
          {loading && members.length === 0 ? (
            <Elem name="loading">Loading members...</Elem>
          ) : members.length === 0 ? (
            <Elem name="empty">
              <Typography>No members assigned to this project yet.</Typography>
              {isAdmin && (
                <Typography size="small" className="text-neutral-content-subtler mt-2">
                  Add users above to give them access to this project.
                </Typography>
              )}
            </Elem>
          ) : (
            <Elem name="table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Added</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.user_id}>
                      <td>{member.email}</td>
                      <td>
                        {member.first_name || member.last_name
                          ? `${member.first_name} ${member.last_name}`.trim()
                          : member.username}
                      </td>
                      <td>{getRoleBadge(member.role)}</td>
                      <td>
                        <span className={`status-badge ${member.enabled ? "status-badge--enabled" : "status-badge--disabled"}`}>
                          {member.enabled ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>{new Date(member.created_at).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td>
                          <Button
                            onClick={() => handleRemoveMember(member.user_id)}
                            size="smaller"
                            look="destructive"
                            disabled={loading}
                            aria-label="Remove member"
                            icon={<IconTrash />}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Elem>
          )}
        </Block>
      </Elem>
    </Block>
  );
};

MembersSettings.title = "Members";
MembersSettings.path = "/members";
