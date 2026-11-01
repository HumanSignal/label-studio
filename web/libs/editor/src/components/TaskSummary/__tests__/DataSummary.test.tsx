import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { DataSummary } from "../DataSummary";

describe("DataSummary", () => {
  it("renders every page of a multi-page image", () => {
    const pages = ["https://example.com/page-1.png", "https://example.com/page-2.png"];

    render(<DataSummary data_types={{ page: { type: "image", value: pages } }} />);

    const images = screen.getAllByRole("img");
    expect(images.map((img) => img.getAttribute("src"))).toEqual(pages);
  });

  it("renders a single image", () => {
    render(<DataSummary data_types={{ image: { type: "image", value: "https://example.com/image.png" } }} />);

    expect(screen.getByRole("img").getAttribute("src")).toBe("https://example.com/image.png");
  });
});
