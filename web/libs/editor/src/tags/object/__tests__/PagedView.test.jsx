import { getStoredPageSize, setStoredPageSize, getQueryPage, updateQueryPage } from "../PagedView";

const PAGE_PARAM = "view_page";

describe("PagedView helpers", () => {
  let locationSearch;
  let locationPathname;
  let replaceStateSpy;

  beforeEach(() => {
    locationSearch = "";
    locationPathname = "/app";
    replaceStateSpy = jest.fn();
    Object.defineProperty(window, "location", {
      get() {
        return { search: locationSearch, pathname: locationPathname };
      },
      configurable: true,
    });
    window.history.replaceState = replaceStateSpy;
    localStorage.clear();
  });

  describe("getStoredPageSize", () => {
    it("returns parsed number from localStorage when set", () => {
      localStorage.setItem("pages:repeater", "25");
      expect(getStoredPageSize("repeater")).toBe(25);
    });
    it("returns defaultValue when key missing and defaultValue provided", () => {
      expect(getStoredPageSize("repeater", 10)).toBe(10);
    });
    it("returns undefined when key missing and no defaultValue", () => {
      expect(getStoredPageSize("repeater")).toBeUndefined();
    });
  });

  describe("setStoredPageSize", () => {
    it("stores page size as string", () => {
      setStoredPageSize("repeater", 50);
      expect(localStorage.getItem("pages:repeater")).toBe("50");
    });
  });

  describe("getQueryPage", () => {
    it("returns 1 when no view_page param", () => {
      locationSearch = "";
      expect(getQueryPage()).toBe(1);
    });
    it("returns parsed page when view_page present", () => {
      locationSearch = `?${PAGE_PARAM}=3`;
      expect(getQueryPage()).toBe(3);
    });
  });

  describe("updateQueryPage", () => {
    it("sets view_page when page !== 1", () => {
      locationSearch = "";
      updateQueryPage(2);
      expect(replaceStateSpy).toHaveBeenCalled();
      const url = replaceStateSpy.mock.calls[0][2];
      expect(url).toContain(`${PAGE_PARAM}=2`);
    });
    it("removes view_page when page is 1", () => {
      locationSearch = `?${PAGE_PARAM}=2`;
      updateQueryPage(1);
      expect(replaceStateSpy).toHaveBeenCalled();
      const url = replaceStateSpy.mock.calls[0][2];
      expect(url).not.toContain(PAGE_PARAM);
    });
  });
});
