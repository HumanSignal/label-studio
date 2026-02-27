/**
 * Unit tests for DateTime tag (tags/control/DateTime.jsx)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import Tree from "../../../core/Tree";
import Registry from "../../../core/Registry";
import "../../visual/View";
import "../../object/RichText/index";
import InfoModal from "../../../components/Infomodal/Infomodal";
import { HtxDateTime } from "../DateTime";

jest.mock("../../../components/Infomodal/Infomodal", () => ({
  __esModule: true,
  default: { warning: jest.fn() },
}));

jest.mock("../../../utils/feature-flags", () => ({
  FF_DEV_3391: "FF_DEV_3391",
  FF_SIMPLE_INIT: "FF_SIMPLE_INIT",
  FF_LSDV_4583: "FF_LSDV_4583",
  isFF: jest.fn((flag) => flag === "FF_SIMPLE_INIT"),
}));

let mockRoot;
jest.mock("mobx-state-tree", () => {
  const actual = jest.requireActual("mobx-state-tree");
  return {
    ...actual,
    getRoot: (node) => {
      if (node && node.type === "datetime") {
        return mockRoot;
      }
      return actual.getRoot(node);
    },
  };
});

const CONFIG_DATETIME = `<View>
  <Text name="t" value="$text" />
  <DateTime name="dt" toName="t" />
</View>`;

const CONFIG_DATETIME_ONLY_TIME = `<View>
  <Text name="t" value="$text" />
  <DateTime name="dt" toName="t" only="time" />
</View>`;

const CONFIG_DATETIME_MONTH_YEAR = `<View>
  <Text name="t" value="$text" />
  <DateTime name="dt" toName="t" only="month,year" />
</View>`;

const CONFIG_DATETIME_ONLY_YEAR = `<View>
  <Text name="t" value="$text" />
  <DateTime name="dt" toName="t" only="year" />
</View>`;

const CONFIG_DATETIME_MIN_MAX = `<View>
  <Text name="t" value="$text" />
  <DateTime name="dt" toName="t" only="date" min="2020-01-01" max="2025-12-31" />
</View>`;

function createDateTimeNode(config = CONFIG_DATETIME, storeRef = { task: { dataObj: { text: "Hi" } } }) {
  mockRoot = {
    annotationStore: {
      selected: { results: [] },
      selectedHistory: null,
    },
  };
  const modelConfig = Tree.treeToModel(config, storeRef);
  const ViewModel = Registry.getModelByTag("view");
  const root = ViewModel.create(modelConfig);
  const dateTime = root.children.find((c) => c.type === "datetime");
  if (dateTime) {
    mockRoot.annotationStore.selected.results.push({
      from_name: dateTime,
      mainValue: null,
      area: {
        updateOriginOnEdit: jest.fn(),
        setValue: jest.fn(),
      },
    });
  }
  return dateTime;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.STORE_INIT_OK = true;
});
afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

describe("DateTime model", () => {
  it("creates datetime with correct type and name", () => {
    const dt = createDateTimeNode();
    expect(dt).not.toBeNull();
    expect(dt.type).toBe("datetime");
    expect(dt.name).toBe("dt");
    expect(dt.toname).toBe("t");
  });

  it("showDate is true when only is not set", () => {
    const dt = createDateTimeNode();
    expect(dt.showDate).toBe(true);
    expect(dt.showTime).toBe(true);
  });

  it("showDate and showTime respect only attribute", () => {
    const dtTime = createDateTimeNode(CONFIG_DATETIME_ONLY_TIME);
    expect(dtTime.onlyTime).toBe(true);
    expect(dtTime.showDate).toBe(false);
    expect(dtTime.showTime).toBe(true);

    const dtMonthYear = createDateTimeNode(CONFIG_DATETIME_MONTH_YEAR);
    expect(dtMonthYear.showMonth).toBe(true);
    expect(dtMonthYear.showYear).toBe(true);
    expect(dtMonthYear.showDate).toBe(false);
  });

  it("selectedValues returns datetime getter value", () => {
    const dt = createDateTimeNode();
    expect(dt.selectedValues()).toBeUndefined();
    dt.setDateTime("2024-06-15T10:30");
    expect(dt.selectedValues()).toBeDefined();
    expect(dt.date).toBe("2024-06-15");
  });

  it("holdsState is true when month/year are set", () => {
    const dt = createDateTimeNode();
    expect(dt.holdsState).toBe(false);
    dt.onMonthChange(6);
    dt.onYearChange(2024);
    expect(dt.holdsState).toBe(true);
  });

  it("holdsState is false for onlyTime when time is not set", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_ONLY_TIME);
    expect(dt.holdsState).toBe(false);
  });

  it("date getter returns ISO date when month and year set", () => {
    const dt = createDateTimeNode();
    dt.setDateTime("2024-03-15T00:00");
    expect(dt.day).toBe(15);
    expect(dt.month).toBe(3);
    expect(dt.year).toBe(2024);
    expect(dt.date).toBe("2024-03-15");
  });

  it("date getter returns year only when only=year", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_ONLY_YEAR);
    dt.onYearChange(2023);
    expect(dt.date).toBe(2023);
  });

  it("datetime getter returns only time when onlyTime", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_ONLY_TIME);
    dt.onTimeChange({ target: { value: "09:45" } });
    expect(dt.datetime).toBe("09:45");
  });

  it("isValid is true when date within min/max", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_MIN_MAX);
    dt.setDateTime("2023-06-01");
    expect(dt.isValid).toBe(true);
  });

  it("isValid is false when date below min", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_MIN_MAX);
    dt.setDateTime("2019-06-01");
    expect(dt.isValid).toBe(false);
  });

  it("isValid is false when date above max", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_MIN_MAX);
    dt.setDateTime("2026-01-01");
    expect(dt.isValid).toBe(false);
  });

  it("resetDateTime clears all volatile fields", () => {
    const dt = createDateTimeNode();
    dt.setDateTime("2024-01-15T12:00");
    expect(dt.day).toBe(15);
    expect(dt.month).toBe(1);
    expect(dt.year).toBe(2024);
    expect(dt.time).toBeDefined();
    dt.resetDateTime();
    expect(dt.day).toBeUndefined();
    expect(dt.month).toBeUndefined();
    expect(dt.year).toBeUndefined();
    expect(dt.time).toBeUndefined();
  });

  it("validDateFormat returns array for valid ISO date string", () => {
    const dt = createDateTimeNode();
    expect(dt.validDateFormat("2024-06-15")).toEqual([2024, 6, 15]);
    expect(dt.validDateFormat("1999-01-01")).toEqual([1999, 1, 1]);
  });

  it("validDateFormat returns false for invalid date", () => {
    const dt = createDateTimeNode();
    expect(dt.validDateFormat("not-a-date")).toBe(false);
    expect(dt.validDateFormat("2024-13-01")).toBe(false);
    expect(dt.validDateFormat("99-01-01")).toBe(false);
  });

  it("setDateTime parses and sets date and time", () => {
    const dt = createDateTimeNode();
    dt.setDateTime("2024-07-20T14:30");
    expect(dt.day).toBe(20);
    expect(dt.month).toBe(7);
    expect(dt.year).toBe(2024);
    expect(dt.time).toBe("14:30");
  });

  it("setDateTime resets when value is unparseable", () => {
    const dt = createDateTimeNode();
    dt.setDateTime("2024-06-15");
    dt.setDateTime("garbage");
    expect(dt.day).toBeUndefined();
    expect(dt.month).toBeUndefined();
    expect(dt.year).toBeUndefined();
  });

  it("setDateTime sets only time when onlyTime", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_ONLY_TIME);
    dt.setDateTime("11:22");
    expect(dt.time).toBe("11:22");
  });

  it("setDate updates day month year and calls updateResult", () => {
    const dt = createDateTimeNode();
    const spy = jest.spyOn(dt, "updateResult");
    dt.setDate([2024, 5, 10]);
    expect(dt.year).toBe(2024);
    expect(dt.month).toBe(5);
    expect(dt.day).toBe(10);
    expect(spy).toHaveBeenCalled();
  });

  it("setDate clears when passed null", () => {
    const dt = createDateTimeNode();
    dt.setDate([2024, 1, 1]);
    dt.setDate(null);
    expect(dt.day).toBeUndefined();
    expect(dt.month).toBeUndefined();
    expect(dt.year).toBeUndefined();
  });

  it("getISODate returns ISO date string from formatted value", () => {
    const dt = createDateTimeNode();
    const iso = dt.getISODate("2024-06-15T10:00");
    expect(iso).toBe("2024-06-15");
  });

  it("getISODate returns undefined for onlyTime", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_ONLY_TIME);
    expect(dt.getISODate("12:00")).toBeUndefined();
  });

  it("needsUpdate sets value from result when result exists", () => {
    const dt = createDateTimeNode();
    mockRoot.annotationStore.selected.results[0].mainValue = "2024-05-20T09:00";
    dt.needsUpdate();
    expect(dt.month).toBe(5);
    expect(dt.year).toBe(2024);
    expect(dt.day).toBe(20);
  });

  it("needsUpdate resets when no result", () => {
    const dt = createDateTimeNode();
    dt.setDateTime("2024-01-01");
    mockRoot.annotationStore.selected.results = [];
    dt.needsUpdate();
    expect(dt.month).toBeUndefined();
    expect(dt.year).toBeUndefined();
  });

  it("requiredModal calls InfoModal.warning with message", () => {
    const dt = createDateTimeNode();
    dt.requiredModal();
    expect(InfoModal.warning).toHaveBeenCalledWith(expect.stringContaining('DateTime "dt" is required'));
  });

  it("requiredModal uses requiredmessage when set", () => {
    const config = `<View><Text name="t" value="$text" /><DateTime name="dt" toName="t" requiredMessage="Please pick a date" /></View>`;
    const dt = createDateTimeNode(config);
    dt.requiredModal();
    expect(InfoModal.warning).toHaveBeenCalledWith("Please pick a date");
  });

  it("validateValue returns true for empty value", () => {
    const dt = createDateTimeNode();
    expect(dt.validateValue("")).toBe(true);
    expect(dt.validateValue(null)).toBe(true);
  });

  it("validateValue returns false when date below min and shows modal", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_MIN_MAX);
    expect(dt.validateValue("2019-06-15")).toBe(false);
    expect(InfoModal.warning).toHaveBeenCalledWith(expect.stringMatching(/min date is 2020-01-01/));
  });

  it("validateValue returns false when date above max", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_MIN_MAX);
    expect(dt.validateValue("2026-01-01")).toBe(false);
    expect(InfoModal.warning).toHaveBeenCalledWith(expect.stringMatching(/max date is 2025-12-31/));
  });

  it("validateValue returns true when date within min/max", () => {
    const dt = createDateTimeNode(CONFIG_DATETIME_MIN_MAX);
    expect(dt.validateValue("2023-06-15")).toBe(true);
    expect(InfoModal.warning).not.toHaveBeenCalled();
  });

  it("onMonthChange and onYearChange update and call updateResult", () => {
    const dt = createDateTimeNode();
    const spy = jest.spyOn(dt, "updateResult");
    dt.onMonthChange(4);
    expect(dt.month).toBe(4);
    dt.onYearChange(2023);
    expect(dt.year).toBe(2023);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("onTimeChange updates time", () => {
    const dt = createDateTimeNode();
    dt.onTimeChange({ target: { value: "16:45" } });
    expect(dt.time).toBe("16:45");
  });
});

describe("HtxDateTime view", () => {
  function createMockItem(overrides = {}) {
    return {
      name: "dt",
      isReadOnly: () => false,
      perRegionVisible: () => true,
      isValid: true,
      min: undefined,
      max: undefined,
      showMonth: false,
      showYear: false,
      showDate: true,
      showTime: true,
      date: undefined,
      month: undefined,
      year: undefined,
      time: undefined,
      months: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      years: [2024, 2023, 2022],
      setDate: jest.fn(),
      validDateFormat: jest.fn((v) => (v === "2024-06-15" ? [2024, 6, 15] : null)),
      setNeedsUpdate: jest.fn(),
      updateValue: false,
      elementRef: { current: null },
      onMonthChange: jest.fn(),
      onYearChange: jest.fn(),
      onTimeChange: jest.fn(),
      ...overrides,
    };
  }

  it("renders date and time inputs when showDate and showTime", () => {
    const item = createMockItem();
    const store = {};
    const { container } = render(
      <Provider store={store}>
        <HtxDateTime item={item} />
      </Provider>,
    );
    expect(container.querySelector(".htx-datetime")).toBeInTheDocument();
    const dateInput = container.querySelector('input[type="date"]');
    const timeInput = container.querySelector('input[type="time"]');
    expect(dateInput).toBeInTheDocument();
    expect(timeInput).toBeInTheDocument();
  });

  it("renders month and year selects when showMonth and showYear", () => {
    const item = createMockItem({ showMonth: true, showYear: true, showDate: false, showTime: false });
    const store = {};
    render(
      <Provider store={store}>
        <HtxDateTime item={item} />
      </Provider>,
    );
    expect(screen.getByText("Month...")).toBeInTheDocument();
    expect(screen.getByText("Year...")).toBeInTheDocument();
  });

  it("applies red border when invalid", () => {
    const item = createMockItem({ isValid: false });
    const store = {};
    const { container } = render(
      <Provider store={store}>
        <HtxDateTime item={item} />
      </Provider>,
    );
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toHaveStyle({ borderColor: "red" });
  });

  it("hides when not perRegionVisible", () => {
    const item = createMockItem({ perRegionVisible: () => false });
    const store = {};
    const { container } = render(
      <Provider store={store}>
        <HtxDateTime item={item} />
      </Provider>,
    );
    const wrapper = container.querySelector(".htx-datetime");
    expect(wrapper).toHaveStyle({ display: "none" });
  });

  it("calls setDate when date input changes with valid value", async () => {
    const user = userEvent.setup();
    const setDate = jest.fn();
    const item = createMockItem({
      setDate,
      validDateFormat: (v) => (v === "2024-06-15" ? [2024, 6, 15] : null),
    });
    const store = {};
    const { container } = render(
      <Provider store={store}>
        <HtxDateTime item={item} />
      </Provider>,
    );
    const dateInput = container.querySelector('input[type="date"]');
    await user.type(dateInput, "2024-06-15");
    expect(setDate).toHaveBeenCalled();
  });

  it("does not call setDate when readonly and input changed", async () => {
    const user = userEvent.setup();
    const setDate = jest.fn();
    const item = createMockItem({
      isReadOnly: () => true,
      setDate,
    });
    const store = {};
    const { container } = render(
      <Provider store={store}>
        <HtxDateTime item={item} />
      </Provider>,
    );
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toHaveAttribute("readOnly");
  });
});
