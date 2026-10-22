import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ApiContext } from "../../../providers/ApiProvider";
import { ProjectContext } from "../../../providers/project-context";
import { EmptyProjectsList } from "../../Projects/ProjectsList";
import { MembersSettings } from "./MembersSettings";

const settingsSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../index.jsx"), "utf8");

const CONFIRM_TEXT = "取消授权后，该用户不能再访问此项目。已提交的标注会保留。";
const EMPTY_PROJECTS_TEXT = "暂无获授权的项目，请联系项目负责人";

const members = [
  {
    id: 1,
    display_name: "负责人",
    email: "owner@example.com",
    access_source: "organization_owner",
    enabled: true,
  },
  {
    id: 2,
    display_name: "创建者",
    email: "creator@example.com",
    access_source: "project_creator",
    enabled: true,
  },
  {
    id: 3,
    display_name: "标注员",
    email: "member@example.com",
    access_source: "member",
    enabled: true,
  },
];

const candidate = { id: 9, display_name: "新人", email: "new@example.com" };

function renderMembers() {
  const calls = [];
  const callApi = async (method, options) => {
    calls.push([method, options]);
    if (method === "projectMembers") {
      return { count: members.length, results: members };
    }
    if (method === "projectMemberCandidates") {
      return { count: 1, results: [candidate] };
    }
    return { ok: true };
  };

  render(
    <ApiContext.Provider value={{ callApi }}>
      <ProjectContext.Provider
        value={{
          project: { id: 5, title: "示例项目" },
          fetchProject: async () => {},
          updateProject: async () => {},
          invalidateCache: () => {},
        }}
      >
        <MembersSettings />
      </ProjectContext.Provider>
    </ApiContext.Provider>,
  );

  return { calls };
}

test("settings menu includes project members", () => {
  expect(MembersSettings.title).toBe("项目成员");
  expect(MembersSettings.path).toBe("/members");
  expect(settingsSource).toMatch(/menuItems=\{\[[\s\S]*MembersSettings/);
  expect(settingsSource).toMatch(/const pages = \{[\s\S]*MembersSettings/);
});

test("member page adds with an explicit submit and confirms before revoke", async () => {
  const { calls } = renderMembers();

  expect(await screen.findByRole("button", { name: "添加成员" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "取消授权" })).toHaveLength(1);
  expect(within(screen.getByTestId("project-member-1")).queryByRole("button", { name: "取消授权" })).toBeNull();
  expect(within(screen.getByTestId("project-member-2")).queryByRole("button", { name: "取消授权" })).toBeNull();
  expect(calls.map(([method]) => method)).not.toContain("grantProjectMember");

  fireEvent.click(screen.getByRole("button", { name: "新人" }));
  expect(calls.map(([method]) => method)).not.toContain("grantProjectMember");
  fireEvent.click(screen.getByRole("button", { name: "添加成员" }));

  await waitFor(() => {
    expect(calls.map(([method]) => method)).toContain("grantProjectMember");
  });
  const grant = calls.find(([method]) => method === "grantProjectMember");
  expect(grant[1].params).toEqual({ pk: 5, user_id: 9 });

  fireEvent.click(screen.getByRole("button", { name: "取消授权" }));
  expect(calls.map(([method]) => method)).not.toContain("revokeProjectMember");
  expect(await screen.findByText(CONFIRM_TEXT)).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("dialog-ok-button"));
  await waitFor(() => {
    expect(calls.map(([method]) => method)).toContain("revokeProjectMember");
  });
  const revoke = calls.find(([method]) => method === "revokeProjectMember");
  expect(revoke[1].params).toEqual({ pk: 5, user_id: 3 });
});

test("empty project list without create permission explains who to contact", () => {
  render(<EmptyProjectsList openModal={() => {}} canCreate={false} />);

  expect(screen.getByText(EMPTY_PROJECTS_TEXT)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create new project" })).toBeNull();
});

test("organization owner keeps the create project entry on an empty list", () => {
  render(<EmptyProjectsList openModal={() => {}} canCreate />);

  expect(screen.getByRole("button", { name: "Create new project" })).toBeInTheDocument();
  expect(screen.queryByText(EMPTY_PROJECTS_TEXT)).toBeNull();
});
