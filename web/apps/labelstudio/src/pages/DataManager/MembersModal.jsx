import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@humansignal/ui";
import { useAPI } from "../../providers/ApiProvider";
import { useProject } from "../../providers/ProjectProvider";
import { Modal } from "../../components/Modal/ModalPopup";
import { cn } from "../../utils/bem";
import "./MembersModal.scss";

export const ProjectMembersModal = ({ onClose }) => {
  const api = useAPI();
  const { project } = useProject();
  const [members, setMembers] = useState([]);
  const [potentialMembers, setPotentialMembers] = useState([]);
  const [selectedPotentialMembers, setSelectedPotentialMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!project?.id) return;
    const data = await api.callApi("projectMembers", {
      params: { pk: project.id },
    });
    setMembers(data);
  }, [project, api]);

  const fetchPotentialMembers = useCallback(async () => {
    if (!project?.id) return;
    const data = await api.callApi("projectPotentialMembers", {
      params: { pk: project.id },
    });
    setPotentialMembers(data);
  }, [project, api]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (showAddMember) {
      fetchPotentialMembers();
    }
  }, [showAddMember, fetchPotentialMembers]);

  const handleSave = async () => {
    if (selectedPotentialMembers.length === 0) return;
    await api.callApi("addProjectMembers", {
      params: { pk: project.id },
      body: { ids: selectedPotentialMembers },
    });
    setShowAddMember(false);
    setSelectedPotentialMembers([]);
    fetchMembers();
  };

  const toggleSelection = (id) => {
    if (selectedPotentialMembers.includes(id)) {
      setSelectedPotentialMembers(selectedPotentialMembers.filter((mid) => mid !== id));
    } else {
      setSelectedPotentialMembers([...selectedPotentialMembers, id]);
    }
  };

  return (
    <Modal
      onHide={onClose}
      title={showAddMember ? "Add Members" : "Project Members"}
      style={{ width: 400 }}
      visible
      animate
    >
      <div className={cn("members-modal")}>
        {!showAddMember ? (
          <>
            <div className={cn("members-modal").elem("header")}>
              <Button onClick={() => setShowAddMember(true)} look="primary" size="small">
                Add
              </Button>
            </div>
            <div className={cn("members-modal").elem("content")}>
              {members.length > 0 ? (
                members.map((member) => (
                  <div key={member.user.id} className={cn("members-modal").elem("item")}>
                    {member.user.email} ({member.user.first_name} {member.user.last_name})
                  </div>
                ))
              ) : (
                <div style={{ padding: 16, textAlign: "center", color: "#666" }}>No members found</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={cn("members-modal").elem("content")}>
              {potentialMembers.length > 0 ? (
                potentialMembers.map((user) => (
                  <div key={user.id} className={cn("members-modal").elem("item")}>
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={selectedPotentialMembers.includes(user.id)}
                      onChange={() => toggleSelection(user.id)}
                    />
                    <label htmlFor={`user-${user.id}`}>
                      {user.email} ({user.first_name} {user.last_name})
                    </label>
                  </div>
                ))
              ) : (
                <div style={{ padding: 16, textAlign: "center", color: "#666" }}>
                  No potential members found to add.
                </div>
              )}
            </div>
            <div className={cn("members-modal").elem("footer")}>
              <Button onClick={() => setShowAddMember(false)} size="small">
                Cancel
              </Button>
              <Button onClick={handleSave} look="primary" size="small" disabled={selectedPotentialMembers.length === 0}>
                Save
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
