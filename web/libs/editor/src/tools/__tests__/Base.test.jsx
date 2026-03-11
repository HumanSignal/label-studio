/**
 * Unit tests for Base tool (tools/Base.jsx).
 * Covers BaseTool model defaults, views (toolName, isSeparated, viewClass, viewTooltip,
 * controls, shouldRenderView, iconClass, iconComponent, smartEnabled), actions (afterCreate,
 * makeDynamic), exports (MIN_SIZE, DEFAULT_DIMENSIONS), and ToolView render/click.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { types } from "mobx-state-tree";

import BaseTool, { MIN_SIZE, DEFAULT_DIMENSIONS } from "../Base";
import ToolMixin from "../../mixins/Tool";

jest.mock("../../components/Toolbar/Tool", () => {
  const React = require("react");
  return {
    Tool: ({ ariaLabel, active, onClick }) =>
      React.createElement(
        "button",
        {
          "data-testid": "tool-button",
          "aria-label": ariaLabel,
          onClick,
        },
        active ? "active" : "inactive",
      ),
  };
});

// Minimal composition: only add iconComponent so BaseTool's viewClass (ToolView) is used
const StubWithIcon = types.model("StubWithIcon").views(() => ({
  get iconComponent() {
    return () => React.createElement("span", { "data-testid": "stub-icon" });
  },
}));

const ComposedBase = types.compose("ComposedBase", ToolMixin, BaseTool, StubWithIcon);
// No icon so shouldRenderView stays false when not separated/smartEnabled
const ComposedBaseNoIcon = types.compose("ComposedBaseNoIcon", ToolMixin, BaseTool);

function createManager() {
  return { name: "test", selectTool: jest.fn(), addTool: jest.fn() };
}

function createControl(overrides = {}) {
  return {
    isSeparated: false,
    smartEnabled: false,
    smart: false,
    removeDuplicatesNamed: null,
    ...overrides,
  };
}

function createTool(Model, snapshot = {}, envOverrides = {}) {
  const manager = createManager();
  const control = createControl();
  return Model.create(snapshot, {
    manager,
    control,
    ...envOverrides,
  });
}

describe("Base tool", () => {
  describe("exports", () => {
    it("exports MIN_SIZE with X and Y", () => {
      expect(MIN_SIZE).toEqual({ X: 3, Y: 3 });
    });

    it("exports DEFAULT_DIMENSIONS for rect, ellipse, polygon, vector", () => {
      expect(DEFAULT_DIMENSIONS).toEqual({
        rect: { width: 30, height: 30 },
        ellipse: { radius: 30 },
        polygon: { length: 30 },
        vector: { length: 30 },
      });
    });
  });

  describe("model defaults", () => {
    it("has default smart false", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.smart).toBe(false);
    });

    it("has default unselectRegionOnToolChange false", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.unselectRegionOnToolChange).toBe(false);
    });

    it("has default removeDuplicatesNamed null", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.removeDuplicatesNamed).toBeNull();
    });

    it("has volatile dynamic false by default", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.dynamic).toBe(false);
    });

    it("has volatile canInteractWithRegions true", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.canInteractWithRegions).toBe(true);
    });
  });

  describe("views", () => {
    it("toolName returns composed type name", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.toolName).toBe("ComposedBaseNoIcon");
    });

    it("isSeparated reflects control.isSeparated", () => {
      const tool = createTool(
        ComposedBaseNoIcon,
        {},
        {
          control: createControl({ isSeparated: true }),
        },
      );
      expect(tool.isSeparated).toBe(true);
    });

    it("viewTooltip returns null", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.viewTooltip).toBeNull();
    });

    it("controls returns null", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.controls).toBeNull();
    });

    it("shouldRenderView is false when not separated and not smartEnabled", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.shouldRenderView).toBe(false);
    });

    it("shouldRenderView is truthy when isSeparated and iconClass present", () => {
      const tool = createTool(
        ComposedBase,
        {},
        {
          control: createControl({ isSeparated: true }),
        },
      );
      expect(tool.shouldRenderView).toBeTruthy();
    });

    it("shouldRenderView is truthy when smartEnabled and iconClass present", () => {
      const tool = createTool(
        ComposedBase,
        {},
        {
          control: createControl({ smartEnabled: true }),
        },
      );
      expect(tool.shouldRenderView).toBeTruthy();
    });

    it("iconClass returns null when iconComponent is null", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.iconClass).toBeNull();
    });

    it("iconComponent returns null on base-only composition", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.iconComponent).toBeNull();
    });

    it("iconClass renders icon when iconComponent provided", () => {
      const tool = createTool(ComposedBase);
      const icon = tool.iconClass;
      expect(icon).not.toBeNull();
      const { getByTestId } = render(React.createElement(icon.type));
      expect(getByTestId("stub-icon")).toBeInTheDocument();
    });

    it("smartEnabled reflects control.smartEnabled", () => {
      const tool = createTool(
        ComposedBaseNoIcon,
        {},
        {
          control: createControl({ smartEnabled: true }),
        },
      );
      expect(tool.smartEnabled).toBe(true);
    });

    it("viewClass is a function", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(typeof tool.viewClass).toBe("function");
    });

    it("viewClass returns null when shouldRenderView is false", () => {
      const tool = createTool(ComposedBaseNoIcon);
      const View = tool.viewClass();
      expect(View).toBeNull();
    });
  });

  describe("actions", () => {
    it("makeDynamic sets dynamic to true", () => {
      const tool = createTool(ComposedBaseNoIcon);
      expect(tool.dynamic).toBe(false);
      tool.makeDynamic();
      expect(tool.dynamic).toBe(true);
    });

    it("afterCreate does not call addTool when smart is false", () => {
      const manager = createManager();
      createTool(ComposedBaseNoIcon, {}, { manager, control: createControl({ smart: true }) });
      expect(manager.addTool).not.toHaveBeenCalled();
    });

    it("afterCreate calls manager.addTool when smart and control.smart", () => {
      const manager = createManager();
      createTool(
        ComposedBaseNoIcon,
        { smart: true },
        {
          manager,
          control: createControl({ smart: true }),
        },
      );
      expect(manager.addTool).toHaveBeenCalledWith("ComposedBaseNoIcon-smart", expect.any(Object), null);
    });

    it("afterCreate passes control.removeDuplicatesNamed to addTool when set", () => {
      const manager = createManager();
      createTool(
        ComposedBaseNoIcon,
        { smart: true },
        {
          manager,
          control: createControl({ smart: true, removeDuplicatesNamed: "foo" }),
        },
      );
      expect(manager.addTool).toHaveBeenCalledWith("ComposedBaseNoIcon-smart", expect.any(Object), "foo");
    });
  });

  describe("ToolView (via composed tool)", () => {
    it("renders Tool and calls manager.selectTool on click", () => {
      const tool = createTool(
        ComposedBase,
        { selected: false },
        {
          control: createControl({ isSeparated: true }),
        },
      );
      const viewEl = tool.viewClass();
      expect(viewEl).toBeTruthy();
      render(viewEl);
      const btn = screen.getByTestId("tool-button");
      expect(btn).toHaveAttribute("aria-label", "composed-base");
      btn.click();
      expect(tool.manager.selectTool).toHaveBeenCalledWith(tool, true);
    });

    it("Tool receives active from item.selected", () => {
      const tool = createTool(
        ComposedBase,
        { selected: true },
        {
          control: createControl({ isSeparated: true }),
        },
      );
      const viewEl = tool.viewClass();
      render(viewEl);
      expect(screen.getByText("active")).toBeInTheDocument();
    });
  });
});
