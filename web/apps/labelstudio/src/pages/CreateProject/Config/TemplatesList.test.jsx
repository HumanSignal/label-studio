import { beforeEach, expect, it } from "bun:test";
import { I18nProvider } from "@humansignal/app-common";
import { render, screen, waitFor } from "@testing-library/react";
import {
  TEMPLATE_GROUP_TITLES,
  TEMPLATE_TITLES,
  translateTemplateGroup,
  translateTemplateTitle,
} from "./templateTitles";

mockModule("../../../providers/ApiProvider", () => ({
  useAPI: () => ({
    callApi: async () => ({
      templates: [
        { title: "Image Classification", group: "Computer Vision" },
        { title: "Some Brand New Template", group: "Unknown Future Group" },
      ],
      groups: ["Computer Vision", "Unknown Future Group"],
    }),
  }),
}));

const { TemplatesList } = await import("./TemplatesList");

beforeEach(() => {
  localStorage.clear();
});

const renderList = (browserLanguages) =>
  render(
    <I18nProvider browserLanguages={browserLanguages}>
      <TemplatesList
        selectedGroup={null}
        selectedRecipe={null}
        onSelectGroup={() => {}}
        onSelectRecipe={() => {}}
        onCustomTemplate={() => {}}
      />
    </I18nProvider>,
  );

it("every mapped key exists in both locales", async () => {
  const en = (await import("@humansignal/app-common/i18n/locales/en/projects.json")).default;
  const zh = (await import("@humansignal/app-common/i18n/locales/zh-CN/projects.json")).default;

  for (const map of [TEMPLATE_GROUP_TITLES, TEMPLATE_TITLES]) {
    for (const key of Object.values(map)) {
      expect(en[key.replace("projects:", "")], key).toBeString();
      expect(zh[key.replace("projects:", "")], key).toBeString();
    }
  }
});

it("translates known names and passes unknown ones through", () => {
  renderList(["zh-CN"]);
  expect(translateTemplateGroup("Computer Vision")).toBe("计算机视觉");
  expect(translateTemplateTitle("Image Classification")).toBe("图像分类");
  expect(translateTemplateGroup("Unknown Future Group")).toBe("Unknown Future Group");
  expect(translateTemplateTitle("Some Brand New Template")).toBe("Some Brand New Template");
});

it("renders the gallery in Chinese", async () => {
  renderList(["zh-CN"]);
  await waitFor(() => expect(screen.getByText("计算机视觉")).toBeInTheDocument());
  expect(screen.getByText("图像分类")).toBeInTheDocument();
  expect(screen.getByText("自定义模板")).toBeInTheDocument();
  expect(screen.getByText("Unknown Future Group")).toBeInTheDocument();
});
