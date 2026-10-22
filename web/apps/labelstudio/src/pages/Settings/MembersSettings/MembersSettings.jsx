import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Pagination } from "@humansignal/ui";
import { confirm } from "@humansignal/ui/lib/modal";
import { IconUserAdd } from "@humansignal/icons";
import { createTitleFromSegments, useUpdatePageTitle } from "@humansignal/core";
import { useAPI } from "../../../providers/ApiProvider";
import { useProject } from "../../../providers/project-context";

const PAGE_SIZE = 20;
const REVOKE_CONFIRM = "取消授权后，该用户不能再访问此项目。已提交的标注会保留。";

const SOURCE_LABEL = {
  organization_owner: "组织负责人",
  project_creator: "项目创建者",
  member: "项目成员",
};

export const MembersSettings = () => {
  const api = useAPI();
  const { project } = useProject();
  const projectId = project?.id;
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  useUpdatePageTitle(createTitleFromSegments([project?.title, "项目成员"]));

  const loadMembers = useCallback(
    async (nextPage) => {
      if (!projectId) return;
      const data = await api.callApi("projectMembers", {
        params: { pk: projectId, page: nextPage, page_size: PAGE_SIZE },
      });
      setMembers(data?.results ?? []);
      setTotal(data?.count ?? 0);
    },
    [api, projectId],
  );

  const loadCandidates = useCallback(
    async (query) => {
      if (!projectId) return;
      const data = await api.callApi("projectMemberCandidates", {
        params: { pk: projectId, page: 1, page_size: PAGE_SIZE, search: query },
      });
      setCandidates(data?.results ?? []);
    },
    [api, projectId],
  );

  useEffect(() => {
    loadMembers(page);
  }, [loadMembers, page]);

  useEffect(() => {
    loadCandidates("");
  }, [loadCandidates]);

  const addMember = async () => {
    if (!selectedId || !projectId) return;
    const result = await api.callApi("grantProjectMember", {
      params: { pk: projectId, user_id: selectedId },
    });
    if (!result) return;
    setSelectedId(null);
    await loadMembers(page);
    await loadCandidates(search);
  };

  const askRevoke = (member) => {
    confirm({
      title: "取消授权",
      body: REVOKE_CONFIRM,
      okText: "确认",
      cancelText: "返回",
      buttonLook: "negative",
      onOk: async () => {
        const result = await api.callApi("revokeProjectMember", {
          params: { pk: projectId, user_id: member.id },
        });
        if (result) await loadMembers(page);
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-base p-base">
      <h1>项目成员</h1>
      <form
        className="flex flex-wrap items-end gap-tight"
        onSubmit={(event) => {
          event.preventDefault();
          loadCandidates(search);
        }}
      >
        <label className="flex flex-col gap-tight text-body-small">
          搜索组织用户
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-small border border-neutral-border px-tight py-tight"
          />
        </label>
        <Button type="submit" variant="neutral" look="outlined">
          搜索
        </Button>
      </form>
      {candidates.length === 0 ? (
        <EmptyState
          icon={<IconUserAdd />}
          title="没有可添加的用户"
          description="搜索组织内尚未加入此项目的用户。"
          size="small"
          variant="neutral"
        />
      ) : (
        <div className="flex flex-wrap gap-tight">
          {candidates.map((user) => (
            <Button
              key={user.id}
              type="button"
              variant="neutral"
              look="outlined"
              aria-pressed={selectedId === user.id}
              onClick={() => setSelectedId(user.id)}
            >
              {user.display_name}
            </Button>
          ))}
        </div>
      )}
      <div>
        <Button type="button" onClick={addMember} disabled={!selectedId}>
          添加成员
        </Button>
      </div>
      {members.length === 0 ? (
        <EmptyState
          icon={<IconUserAdd />}
          title="还没有项目成员"
          description="搜索组织用户后，点击添加成员。"
          size="medium"
          variant="primary"
        />
      ) : (
        <ul className="flex flex-col gap-tight">
          {members.map((member) => (
            <li
              key={member.id}
              data-testid={`project-member-${member.id}`}
              className="flex items-center justify-between gap-base rounded-small border border-neutral-border p-tight"
            >
              <div>
                <div className="text-body-medium">{member.display_name}</div>
                <div className="text-body-small text-neutral-content-subtler">{member.email}</div>
                <div className="text-body-small">{SOURCE_LABEL[member.access_source] ?? member.access_source}</div>
              </div>
              {member.access_source === "member" && member.enabled !== false ? (
                <Button type="button" variant="negative" look="outlined" onClick={() => askRevoke(member)}>
                  取消授权
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalItems={total}
        label="项目成员"
        showPageSize={false}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </div>
  );
};

MembersSettings.title = "项目成员";
MembersSettings.path = "/members";
