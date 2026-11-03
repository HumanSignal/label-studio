import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/query-core";
import { AuthProvider } from "@humansignal/core/providers/AuthProvider";
import { Provider, createStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { MemoryRouter } from "react-router";
import { ApiContext } from "../../providers/ApiProvider";
import { ProjectContext } from "../../providers/project-context";
import { afterEach, expect, mock, test } from "bun:test";
import { useProject } from "../../providers/project-context";

// Avoid bootstrapping the application store; retain the real project context.
mock.module("../../providers/ProjectProvider", () => ({ useProject }));
const { WebhookPage } = await import("./WebhookPage");

const clients = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

function renderPage({ path, project, permissions, webhooks }) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY, retry: false } },
  });
  clients.push(client);
  client.setQueryData(["current-user"], { id: 1, permissions });
  const store = createStore();
  store.set(queryClientAtom, client);
  const Component = WebhookPage.component;
  return render(
    <Provider store={store}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <ApiContext.Provider value={{ callApi: async (method) => (method === "webhooks" ? webhooks : {}) }}>
            <ProjectContext.Provider value={{ project }}>
              <Component />
            </ProjectContext.Provider>
          </ApiContext.Provider>
        </MemoryRouter>
      </AuthProvider>
    </Provider>,
  );
}

const webhook = { id: 10, url: "https://example.com/hook", created_at: "2026-01-01T00:00:00Z", is_active: true };

for (const [name, path, project, permissions, allowed] of [
  ["project creator", "/projects/5/settings/webhooks", { id: 5, access: { can_manage: true } }, [], true],
  ["project member", "/projects/5/settings/webhooks", { id: 5, access: { can_manage: false } }, [], false],
  ["unknown project rights", "/projects/5/settings/webhooks", { id: 5 }, [], false],
  ["organization owner", "/organization/webhooks", {}, ["organizations.change"], true],
  [
    "project creator on organization page",
    "/organization/webhooks",
    { id: 5, access: { can_manage: true } },
    [],
    false,
  ],
]) {
  for (const populated of [false, true]) {
    test(`${name}: ${populated ? "existing" : "empty"} webhook controls follow scope`, async () => {
      renderPage({ path, project, permissions, webhooks: populated ? [webhook] : [] });
      await screen.findByText(populated ? webhook.url : "Add your first webhook");
      expect(screen.queryByRole("button", { name: "Add Webhook" }) !== null).toBe(allowed);
      if (populated) {
        expect(screen.queryByRole("button", { name: "Edit" }) !== null).toBe(allowed);
        expect(screen.queryByRole("button", { name: "Delete" }) !== null).toBe(allowed);
        expect(screen.getByRole("checkbox").disabled).toBe(!allowed);
      }
    });
  }
}
