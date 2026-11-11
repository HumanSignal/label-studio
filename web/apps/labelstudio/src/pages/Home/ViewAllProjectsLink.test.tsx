import { render, screen } from "@testing-library/react";
import { ViewAllProjectsLink } from "./ViewAllProjectsLink";

describe("ViewAllProjectsLink", () => {
  const originalAppSettings = window.APP_SETTINGS;

  afterEach(() => {
    window.APP_SETTINGS = originalAppSettings;
    (globalThis as any).APP_SETTINGS = originalAppSettings;
  });

  it("links to projects when Label Studio is hosted at the root", () => {
    window.APP_SETTINGS = { ...originalAppSettings, hostname: "http://localhost" };
    (globalThis as any).APP_SETTINGS = window.APP_SETTINGS;

    render(<ViewAllProjectsLink />);

    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute("href", "http://localhost/projects");
  });

  it("includes the base path when Label Studio is hosted below the root", () => {
    window.APP_SETTINGS = { ...originalAppSettings, hostname: "http://localhost/label-studio" };
    (globalThis as any).APP_SETTINGS = window.APP_SETTINGS;

    render(<ViewAllProjectsLink />);

    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute(
      "href",
      "http://localhost/label-studio/projects",
    );
  });
});
