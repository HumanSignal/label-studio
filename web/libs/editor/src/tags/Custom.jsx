// Function-based CustomTag for Label Studio
// Code attribute contains a function that receives all Label Studio context
import React from "react";

import { destroy, types, getRoot } from "mobx-state-tree";
import { observer } from "mobx-react";
import { EnterpriseBadge } from "@humansignal/ui";
import ControlBase from "./control/Base";
import ClassificationBase from "./control/ClassificationBase";

import { AnnotationMixin } from "../mixins/AnnotationMixin";
import { CustomRegionModel } from "../regions/CustomRegion";
import { errorBuilder } from "../core/DataValidator/ConfigValidator";
import { parseValue, tryToParseJSON } from "../utils/data";
// import * as Babel from '@babel/standalone';

// Define the model for the custom tag
const TagAttrs = types.model("CustomIntrefaceAttrs", {
  // name: types.identifier,
  toname: types.maybeNull(types.string),

  // React component function code as string
  code: types.optional(types.string, ""),

  // CDATA/text content (takes priority over code attribute)
  value: types.optional(types.string, ""),

  // Data source - can be a $ reference to task data or a literal value (URL, JSON, etc.)
  data: types.optional(types.string, ""),

  // Props to pass to the component (JSON string)
  props: types.optional(types.string, "{}"),

  // CSS styles for the wrapper
  style: types.optional(types.string, ""),

  // CSS classes for the wrapper
  classname: types.optional(types.string, ""),

  // Custom CSS to inject
  css: types.optional(types.string, ""),

  // Whether to wrap in error boundary
  errorBoundary: types.optional(types.boolean, true),
});

// Main custom tag model
const Model = types
  .model({
    type: "custominterface",
    regions: types.array(CustomRegionModel),
    globalState: types.optional(types.frozen(), {}),
    globalMetadata: types.optional(types.array(types.frozen()), []),
  })
  .volatile(() => ({
    loadedData: null,
    dataLoaded: false,
    dataError: null,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    get annStore() {
      return self.annotationStore;
    },

    get result() {
      return self.annotation?.results?.find((r) => r.from_name === self);
    },

    get currentValue() {
      return self.result?.value || null;
    },

    get parsedProps() {
      try {
        return JSON.parse(self.props);
      } catch (e) {
        console.warn("Invalid props JSON:", e);
        return {};
      }
    },

    get parsedStyle() {
      try {
        return self.style ? JSON.parse(self.style) : {};
      } catch (e) {
        return {};
      }
    },

    get effectiveCode() {
      // Priority: CDATA/text content (value) > code attribute
      // Label Studio automatically puts CDATA content into the 'value' property during XML parsing
      if (self.value && self.value.trim()) {
        return self.value.trim();
      }
      if (self.code && self.code.trim()) {
        return self.code.trim();
      }
      return "";
    },

    // Required by ClassificationBase mixin
    selectedValues() {
      // Return the current state to be serialized as the result
      const result = {
        regions: self.regions.map((r) => r._value),
        globalState: self.globalState,
        metadata: self.globalMetadata,
      };
      console.log("🎯 selectedValues() called, returning:", result);
      console.log("Regions array:", self.regions);
      console.log("Global state:", self.globalState);
      console.log("Metadata:", self.globalMetadata);
      return result;
    },

    // Required for classification tags - the type of value this control produces
    get valueType() {
      return "custom";
    },

    // Required for result creation - the type of result this control creates
    // Must be one of the valid result types that the system recognizes
    get resultType() {
      return "custominterface"; // Use our custom result type
    },

    // Required for classification tags - indicates if this tag holds state
    get holdsState() {
      return (
        self.regions.length > 0 ||
        Object.keys(self.globalState || {}).length > 0 ||
        (self.globalMetadata && self.globalMetadata.length > 0)
      );
    },
  }))
  .actions((self) => ({
    setValue(value) {
      self.addRegion(value);
    },

    perRegionCleanup() {
      // Clear all regions - following the exact pattern from TextArea.jsx
      self.regions = [];
      // Call updateResult to save the cleared state
      self.updateResult();
    },

    needsUpdate() {
      // Called when loading an annotation - restore regions from saved result
      // Following the exact pattern from TextArea.jsx
      console.log("🔄 needsUpdate called");
      console.log("Current result:", self.result);
      console.log("Result mainValue:", self.result?.mainValue);
      self.updateFromResult(self.result?.mainValue);
    },

    updateFromResult(value) {
      // Restore complete state including regions, global state, and metadata
      console.log("📥 updateFromResult called with value:", value);
      console.log("Current regions before update:", self.regions.length);

      // Clear current state
      self.regions = [];
      self.globalState = {};
      self.globalMetadata = [];

      if (value && typeof value === "object") {
        // New format: object with regions, state, and metadata
        if (value.regions && Array.isArray(value.regions)) {
          console.log("Recreating", value.regions.length, "regions from saved data");
          value.regions.forEach((regionValue, index) => {
            console.log(`Creating region ${index + 1}:`, regionValue);
            self.createRegion(regionValue);
          });
        }

        // Restore global state
        if (value.globalState && typeof value.globalState === "object") {
          console.log("Restoring global state:", value.globalState);
          self.globalState = value.globalState;
        }

        // Restore metadata
        if (value.metadata && Array.isArray(value.metadata)) {
          console.log("Restoring metadata:", value.metadata.length, "entries");
          self.globalMetadata = value.metadata;
        }
      } else if (value && Array.isArray(value)) {
        // Legacy format: just array of regions (backward compatibility)
        console.log("Recreating", value.length, "regions from legacy format");
        value.forEach((regionValue, index) => {
          console.log(`Creating region ${index + 1}:`, regionValue);
          self.createRegion(regionValue);
        });
      } else {
        console.log("No valid saved data to restore");
      }

      console.log("Regions after update:", self.regions.length);
      console.log("Global state keys:", Object.keys(self.globalState).length);
      console.log("Metadata entries:", self.globalMetadata.length);
    },

    createRegion(value, pid) {
      const r = CustomRegionModel.create({ pid, _value: value });

      self.regions.push(r);
      return r;
    },

    addRegion(value) {
      // Create a custom region and add it to the regions array
      console.log("🚨 UPDATED addRegion method called with value:", value);
      console.log("addRegion called with value:", value);
      console.log("Current regions before adding:", self.regions.length);
      const region = self.createRegion(value);
      console.log("Created custom region:", region);
      console.log("Current regions after adding:", self.regions.length);
      console.log("All regions:", self.regions);

      // Call updateResult to save the new state - following TextArea pattern
      console.log("🔄 addRegion called, calling updateResult()");
      try {
        self.updateResult();
        console.log("updateResult completed successfully in addRegion");
      } catch (error) {
        console.error("Error calling updateResult in addRegion:", error);
      }

      return region;
    },

    remove(region) {
      // Remove region from the regions array - called by region.deleteRegion()
      // Following the exact pattern from TextArea.jsx
      const index = self.regions.indexOf(region);

      if (index < 0) return;
      self.regions.splice(index, 1);
      destroy(region);

      // Call updateResult to save the new state - following TextArea pattern
      console.log("🔄 remove region called, calling updateResult()");
      self.updateResult();
    },

    deleteResult() {
      const result = self.annotation.results.find((r) => r.from_name === self);
      if (result) {
        self.annotation.deleteResult(result);
      }
    },

    triggerEvent(eventType, data) {
      console.log(`Event ${eventType} triggered on ${self.name}:`, data);
    },

    setLoadedData(data) {
      self.loadedData = data;
      self.dataLoaded = true;
      self.dataError = null;
    },

    setDataError(error) {
      self.dataError = error;
      self.dataLoaded = false;
      self.loadedData = null;
    },

    async preloadData(store) {
      if (!self.data) {
        // No data attribute specified, skip data loading
        self.dataLoaded = true;
        return;
      }

      const dataObj = store.task.dataObj;
      let dataValue;

      // Resolve data value - if starts with $, get from task data, otherwise use literal
      if (self.data.startsWith("$")) {
        dataValue = parseValue(self.data, dataObj);
      } else {
        dataValue = self.data;
      }

      if (!dataValue) {
        self.setDataError(`Cannot resolve data from "${self.data}"`);
        return;
      }

      // If it's a string that looks like a URL, fetch it
      if (typeof dataValue === "string" && /^https?:\/\//.test(dataValue)) {
        try {
          const response = await fetch(dataValue);
          if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
          }
          const text = await response.text();

          // Try to parse as JSON first, fall back to text
          let parsedData;
          try {
            parsedData = tryToParseJSON(text) || text;
          } catch (e) {
            parsedData = text;
          }

          self.setLoadedData(parsedData);
        } catch (error) {
          console.error("Error loading data from URL:", error);
          self.setDataError(`Failed to load data from ${dataValue}: ${error.message}`);
          store.annotationStore.addErrors([errorBuilder.loadingError(error, dataValue, self.data)]);
        }
      } else {
        // Use data directly (could be JSON object, string, etc.)
        self.setLoadedData(dataValue);
      }
    },

    // Global state management methods
    updateGlobalState(newState) {
      // Replace the entire state, don't merge. This ensures keys can be deleted.
      self.globalState = newState;
      console.log("🔄 updateGlobalState called, SAVING NEW STATE:", newState);
      // This is still needed to save the global state which is stored on the
      // main result object for the <CustomInterface> tag.
      self.updateResult();
    },

    // Metadata management methods
    addMetadata(action, data) {
      const entry = {
        timestamp: new Date().toISOString(),
        action: action,
        data: data,
      };
      self.globalMetadata.push(entry);
      console.log("🔄 addMetadata called, calling updateResult()");
      self.updateResult(); // Trigger serialization
    },

    removeMetadata(index) {
      if (index >= 0 && index < self.globalMetadata.length) {
        self.globalMetadata.splice(index, 1);
        console.log("🔄 removeMetadata called, calling updateResult()");
        self.updateResult(); // Trigger serialization
      }
    },

    clearAllMetadata() {
      self.globalMetadata = [];
      console.log("🔄 clearAllMetadata called, calling updateResult()");
      self.updateResult(); // Trigger serialization
    },

    // Debug override to see what ClassificationBase does and catch errors
    updateResult() {
      console.log("🔄 CustomInterface updateResult() called");
      console.log("Current result exists:", !!self.result);
      console.log("Selected values:", self.selectedValues());
      console.log("Value type:", self.valueType);
      console.log("Annotation:", self.annotation);
      console.log("Toname:", self.toname);

      try {
        // Try the ClassificationBase approach
        if (self.result) {
          console.log("Updating existing result");
          console.log("Result area:", self.result.area);
          self.result.area.updateOriginOnEdit();
          self.result.area.setValue(self);
          console.log("✅ Successfully updated existing result");
        } else {
          console.log("Creating new result");
          const resultData = { [self.valueType]: self.selectedValues() };
          console.log("Result data to create:", resultData);

          const newResult = self.annotation.createResult({}, resultData, self, self.toname);
          console.log("✅ Successfully created new result:", newResult);
        }

        // CRITICAL: Signal that annotation has been modified
        // This is what the "Update" button does that we were missing
        console.log("🔔 Signaling annotation has been modified");

        // Mark annotation as having changes (like the Update button does)
        self.annotation.history.freeze();
        self.annotation.history.unfreeze();

        // Mark as user-generated if not already
        if (!self.annotation.sentUserGenerate) {
          console.log("📝 Marking annotation as user-generated");
          self.annotation.sendUserGenerate();
        }

        // Don't trigger automatic API calls - just mark as dirty
        // User can press Update when ready to save to backend
        console.log("✅ Annotation marked as modified - ready for manual save");

        // CRITICAL: Handle automatic saving based on annotation state
        const store = getRoot(self);
        const annotation = self.annotation;

        console.log("📋 Annotation details:", {
          id: annotation.id,
          pk: annotation.pk,
          exists: annotation.exists,
          sentUserGenerate: annotation.sentUserGenerate,
        });

        if (annotation.pk && annotation.exists) {
          // Existing annotation - trigger update
          console.log("🔄 Triggering automatic update for existing annotation ID:", annotation.pk);
          if (store && store.events) {
            store.events.invoke("updateAnnotation", store, annotation).catch((error) => {
              console.error("❌ Update annotation failed:", error);
            });
          }
        } else {
          // New annotation - trigger submit/create
          console.log("➕ Triggering automatic submit for new annotation");
          if (store && store.events) {
            store.events.invoke("submitAnnotation", store, annotation).catch((error) => {
              console.error("❌ Submit annotation failed:", error);
            });
          }
        }

        console.log("✅ Annotation update signaling complete");
      } catch (error) {
        console.error("❌ Error in updateResult:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          result: self.result,
          annotation: self.annotation,
          valueType: self.valueType,
          selectedValues: self.selectedValues(),
        });
      }
    },
  }));

const CustomInterfaceModel = types.compose(
  "CustomInterfaceModel",
  ControlBase,
  ClassificationBase,
  TagAttrs,
  // ...(isFF(FF_LEAD_TIME) ? [LeadTimeMixin] : []),
  // ProcessAttrsMixin,
  // RequiredMixin,
  // PerRegionMixin,
  // ...(isFF(FF_LSDV_4583) ? [PerItemMixin] : []),
  AnnotationMixin,
  // ReadOnlyControlMixin,
  Model,
);

// Error boundary component
class CustomInterfaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.group("🚨 CustomInterface Error Details");
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    console.error("Component Stack:", errorInfo?.componentStack);
    console.error("Function Code:", this.props.code);
    console.error("Item Data:", this.props.item);
    console.groupEnd();

    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const { code, item } = this.props;

      return (
        <div
          style={{
            padding: "15px",
            border: "2px solid #ff6b6b",
            borderRadius: "8px",
            backgroundColor: "#ffe0e0",
            color: "#d63031",
            fontFamily: "monospace",
            maxWidth: "100%",
            overflow: "auto",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#d63031" }}>🚨 Custom Component Error</h4>

          <div style={{ marginBottom: "15px" }}>
            <strong>Error Message:</strong>
            <pre
              style={{
                fontSize: "12px",
                backgroundColor: "#fff",
                padding: "8px",
                borderRadius: "4px",
                margin: "5px 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error?.toString() || "Unknown error"}
            </pre>
          </div>

          {error?.stack && (
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", fontWeight: "bold" }}>📍 Error Stack Trace</summary>
              <pre
                style={{
                  fontSize: "10px",
                  backgroundColor: "#fff",
                  padding: "8px",
                  borderRadius: "4px",
                  margin: "5px 0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {error.stack}
              </pre>
            </details>
          )}

          {errorInfo?.componentStack && (
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", fontWeight: "bold" }}>🔗 Component Stack</summary>
              <pre
                style={{
                  fontSize: "10px",
                  backgroundColor: "#fff",
                  padding: "8px",
                  borderRadius: "4px",
                  margin: "5px 0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          <details style={{ marginBottom: "15px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>📝 Your Function Code</summary>
            <pre
              style={{
                fontSize: "10px",
                backgroundColor: "#f8f9fa",
                padding: "8px",
                borderRadius: "4px",
                margin: "5px 0",
                whiteSpace: "pre-wrap",
                border: "1px solid #ddd",
              }}
            >
              {code || "No code provided"}
            </pre>
          </details>

          <details style={{ marginBottom: "15px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>🔍 Context Information</summary>
            <div
              style={{
                fontSize: "11px",
                backgroundColor: "#fff",
                padding: "8px",
                borderRadius: "4px",
                margin: "5px 0",
              }}
            >
              <p>
                <strong>Tag Name:</strong> {item?.name || "Unknown"}
              </p>
              <p>
                <strong>To Name:</strong> {item?.toname || "Unknown"}
              </p>
              <p>
                <strong>Data Loaded:</strong> {item?.dataLoaded ? "Yes" : "No"}
              </p>
              <p>
                <strong>Data Error:</strong> {item?.dataError || "None"}
              </p>
              <p>
                <strong>Has Code:</strong> {code ? "Yes" : "No"}
              </p>
              <p>
                <strong>Code Length:</strong> {code?.length || 0} characters
              </p>
            </div>
          </details>

          <div
            style={{
              fontSize: "11px",
              backgroundColor: "#fff3cd",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ffeaa7",
            }}
          >
            <strong>Debugging Tips:</strong>
            <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
              <li>Check the console for more detailed logs</li>
              <li>Verify your function syntax and JSX</li>
              <li>Ensure all variables and hooks are properly declared</li>
              <li>Check if you're using the correct parameter names</li>
              <li>Test your function code in isolation first</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// React component that executes the custom function
const CustomInterfaceComponent = observer(({ item }) => {
  const [DynamicComponent, setDynamicComponent] = React.useState(null);
  const [error, setError] = React.useState(null);

  // --- ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP ---

  // 1. Hook for loading data
  React.useEffect(() => {
    if (item.annotation?.store && !item.dataLoaded && !item.dataError) {
      item.preloadData(item.annotation.store);
    }
  }, [item.annotation?.store]);

  // 2. Hook for main component logic
  React.useEffect(() => {
    // Don't run logic until data is loaded.
    // This check is *inside* the hook, not outside.
    if (!item.dataLoaded) return;

    if (item.dataError) {
      setDynamicComponent(() => () => (
        <div
          style={{
            padding: "10px",
            border: "1px solid #ff6b6b",
            borderRadius: "4px",
            backgroundColor: "#ffe0e0",
            color: "#d63031",
          }}
        >
          <h4>Data Loading Error</h4>
          <p>{item.dataError}</p>
        </div>
      ));
      setError(null);
      return;
    }

    if (!item.effectiveCode.trim()) {
      setDynamicComponent(() => () => (
        <div style={{ padding: "10px", border: "1px dashed #ccc", borderRadius: "4px" }}>
          <p>No function code provided. Add your React component function in the 'code' attribute.</p>
          <pre style={{ fontSize: "12px", backgroundColor: "#f8f9fa", padding: "8px" }}>
            {`<CustomInterface name="example" toname="text" data="$mydata" code="
function({ React, data, item, annotation, store, getValue, setValue, getTagValue, setTagValue }) {
  const { useState } = React;
  const [count, setCount] = useState(getValue() || 0);
  
  const increment = () => {
    const newCount = count + 1;
    setCount(newCount);
    setValue(newCount);
  };
  
  return (
    <div>
      <p>Count: {count}</p>
      <p>Loaded data: {data ? JSON.stringify(data).slice(0, 100) : 'No data'}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
" />`}
          </pre>
        </div>
      ));
      setError(null);
      return;
    }

    try {
      const context = {
        React,
        useState: React.useState,
        useEffect: React.useEffect,
        useCallback: React.useCallback,
        useMemo: React.useMemo,
        useRef: React.useRef,
        useReducer: React.useReducer,
        useContext: React.useContext,
        data: item.loadedData,
        regions: item.regions,
        addRegion: item.addRegion?.bind(item),
        deleteRegion: item.remove?.bind(item),
        clearAllRegions: item.perRegionCleanup?.bind(item),
        state: item.globalState,
        saveState: item.updateGlobalState?.bind(item),
        saveData: item.updateGlobalState?.bind(item),
        metadata: item.globalMetadata,
        saveMetadata: item.addMetadata?.bind(item),
        deleteMetadata: item.removeMetadata?.bind(item),
        clearAllMetadata: item.clearAllMetadata?.bind(item),
        tags: () => {
          return Array.from(item.annotation.names.values())
            .filter((tag) => tag.type === "choices")
            .map((tag) => {
              const options = (tag.children || []).map((choice) => choice.value ?? choice._value);
              return {
                name: tag.name,
                type: tag.type,
                options,
              };
            });
        },
        getTagValue: (tagName) => {
          const tag = item.annotation.names.get(tagName);
          if (!tag) return null;
          const result = item.annotation.results.find((r) => r.from_name === tag);
          return result ? result.value : null;
        },
        setTagValue: ((tagName, value) => {
          const tag = item.annotation.names.get(tagName);
          if (!tag) return;
          if (tag.type !== "choices") {
            console.warn(
              `POC LIMITATION: setTagValue only supports 'choices' tags, got '${tag.type}' for tag '${tagName}'`,
            );
            alert(`POC Limitation: Only Choices tags are currently supported. Tag '${tagName}' is type '${tag.type}'.`);
            return;
          }
          let formattedValue = value;
          if (tag.type === "choices") {
            formattedValue = Array.isArray(value) ? value : [value];
          }
          const existingResult = item.annotation.results.find((r) => r.from_name === tag);
          if (existingResult) {
            if (existingResult.setValue) {
              existingResult.setValue(formattedValue);
            } else {
              existingResult.value = formattedValue;
            }
          } else {
            item.annotation.createResult({}, { [tag.valueType]: formattedValue }, tag, tag.toname);
          }
          if (typeof item.updateResult === "function") {
            item.updateResult();
          }
        }).bind(item),
        item,
        annotation: item.annotation,
        store: item.annotation?.store || null,
        task: item.annotation?.task || null,
        getAllResults: () => item.annotation.results,
        deleteResult: item.deleteResult?.bind(item),
        getValue: () => {
          const result = item.annotation?.results.find((r) => r.from_name === item);
          return result ? result.value : null;
        },
        setValue: item.setValue?.bind(item),
        updateResult: item.updateResult?.bind(item),
        tagName: item.name,
        toName: item.toname,
        props: item.parsedProps,
      };

      function decodeHtmlEntities(text) {
        const textArea = document.createElement("textarea");
        textArea.innerHTML = text;
        return textArea.value;
      }

      const transformedCode = decodeHtmlEntities(item.effectiveCode);
      // const transformedCode = POC_UI;

      const UserComponent = () => {
        const code = `
          "use strict";
          try {
            const {
              React, useState, regions, addRegion, deleteRegion, clearAllRegions,
              state, saveState, metadata, saveMetadata, deleteMetadata, clearAllMetadata,
              tags, getTagValue, setTagValue, item, annotation, store, task,
              getValue, setValue, tagName, toName, props
            } = arguments[0];

            const userFunction = (${transformedCode});
            return userFunction(arguments[0]);
          } catch (error) {
            console.error('Error in custom component function:', error);
            console.error('Original code:', ${JSON.stringify(item.effectiveCode)});
            console.error('Transformed code:', ${JSON.stringify(transformedCode)});
            throw error;
          }
        `;
        const componentFunction = new Function(code);
        return componentFunction(context);
      };

      setDynamicComponent(() => UserComponent);
      setError(null);
    } catch (err) {
      console.group("🚨 CustomInterface Compilation Error");
      console.error("Error:", err);
      console.error("Function Code:", item.effectiveCode);
      console.error("Item:", item);
      console.groupEnd();

      setError(err);
      setDynamicComponent(() => () => (
        <div
          style={{
            padding: "15px",
            border: "2px solid #ff6b6b",
            borderRadius: "8px",
            backgroundColor: "#ffe0e0",
            color: "#d63031",
            fontFamily: "monospace",
            maxWidth: "100%",
            overflow: "auto",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#d63031" }}>🚨 Component Compilation Error</h4>
          <div style={{ marginBottom: "15px" }}>
            <strong>Error Message:</strong>
            <pre
              style={{
                fontSize: "12px",
                backgroundColor: "#fff",
                padding: "8px",
                borderRadius: "4px",
                margin: "5px 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {err?.toString() || "Unknown compilation error"}
            </pre>
          </div>
          {err?.stack && (
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", fontWeight: "bold" }}>📍 Error Stack Trace</summary>
              <pre
                style={{
                  fontSize: "10px",
                  backgroundColor: "#fff",
                  padding: "8px",
                  borderRadius: "4px",
                  margin: "5px 0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {err.stack}
              </pre>
            </details>
          )}
          <details style={{ marginBottom: "15px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>📝 Your Function Code</summary>
            <pre
              style={{
                fontSize: "10px",
                backgroundColor: "#f8f9fa",
                padding: "8px",
                borderRadius: "4px",
                margin: "5px 0",
                whiteSpace: "pre-wrap",
                border: "1px solid #ddd",
              }}
            >
              {item.effectiveCode || "No code provided"}
            </pre>
          </details>
          <details style={{ marginBottom: "15px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>🔍 Context Information</summary>
            <div
              style={{
                fontSize: "11px",
                backgroundColor: "#fff",
                padding: "8px",
                borderRadius: "4px",
                margin: "5px 0",
              }}
            >
              <p>
                <strong>Tag Name:</strong> {item?.name || "Unknown"}
              </p>
              <p>
                <strong>To Name:</strong> {item?.toname || "Unknown"}
              </p>
              <p>
                <strong>Data Loaded:</strong> {item?.dataLoaded ? "Yes" : "No"}
              </p>
              <p>
                <strong>Data Error:</strong> {item?.dataError || "None"}
              </p>
              <p>
                <strong>Has Code:</strong> {item.effectiveCode ? "Yes" : "No"}
              </p>
              <p>
                <strong>Code Length:</strong> {item.effectiveCode?.length || 0} characters
              </p>
              <p>
                <strong>Error Type:</strong> Compilation/Execution Error
              </p>
            </div>
          </details>
          <div
            style={{
              fontSize: "11px",
              backgroundColor: "#fff3cd",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ffeaa7",
            }}
          >
            <strong>💡 Common Compilation Issues:</strong>
            <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
              <li>Syntax errors in JavaScript/JSX</li>
              <li>Missing closing brackets or parentheses</li>
              <li>Invalid JSX (check for properly closed tags)</li>
              <li>Typos in parameter names or function syntax</li>
              <li>Using variables that aren't in the context</li>
              <li>Missing 'return' statement in your function</li>
            </ul>
          </div>
        </div>
      ));
    }
  }, [item.effectiveCode, item.dataLoaded, item.dataError]);

  // --- CONDITIONAL RENDERING LOGIC HAPPENS AFTER ALL HOOKS ---

  if (!item.dataLoaded) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
        <span>Loading data...</span>
      </div>
    );
  }

  const context = {
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    useReducer: React.useReducer,
    useContext: React.useContext,
    data: item.loadedData,
    regions: item.regions,
    addRegion: item.addRegion?.bind(item),
    deleteRegion: item.remove?.bind(item),
    clearAllRegions: item.perRegionCleanup?.bind(item),
    state: item.globalState,
    saveState: item.updateGlobalState?.bind(item),
    saveData: item.updateGlobalState?.bind(item),
    metadata: item.globalMetadata,
    saveMetadata: item.addMetadata?.bind(item),
    deleteMetadata: item.removeMetadata?.bind(item),
    clearAllMetadata: item.clearAllMetadata?.bind(item),
    tags: () => {
      return Array.from(item.annotation.names.values())
        .filter((tag) => tag.type === "choices")
        .map((tag) => {
          const options = (tag.children || []).map((choice) => choice.value ?? choice._value);
          return {
            name: tag.name,
            type: tag.type,
            options,
          };
        });
    },
    getTagValue: (tagName) => {
      const tag = item.annotation.names.get(tagName);
      if (!tag) return null;
      const result = item.annotation.results.find((r) => r.from_name === tag);
      return result ? result.value : null;
    },
    setTagValue: ((tagName, value) => {
      const tag = item.annotation.names.get(tagName);
      if (!tag) return;
      if (tag.type !== "choices") {
        console.warn(
          `POC LIMITATION: setTagValue only supports 'choices' tags, got '${tag.type}' for tag '${tagName}'`,
        );
        alert(`POC Limitation: Only Choices tags are currently supported. Tag '${tagName}' is type '${tag.type}'.`);
        return;
      }
      let formattedValue = value;
      if (tag.type === "choices") {
        formattedValue = Array.isArray(value) ? value : [value];
      }
      const existingResult = item.annotation.results.find((r) => r.from_name === tag);
      if (existingResult) {
        if (existingResult.setValue) {
          existingResult.setValue(formattedValue);
        } else {
          existingResult.value = formattedValue;
        }
      } else {
        item.annotation.createResult({}, { [tag.valueType]: formattedValue }, tag, tag.toname);
      }
      if (typeof item.updateResult === "function") {
        item.updateResult();
      }
    }).bind(item),
    item,
    annotation: item.annotation,
    store: item.annotation?.store || null,
    task: item.annotation?.task || null,
    getAllResults: () => item.annotation.results,
    deleteResult: item.deleteResult?.bind(item),
    getValue: () => {
      const result = item.annotation?.results.find((r) => r.from_name === item);
      return result ? result.value : null;
    },
    setValue: item.setValue?.bind(item),
    updateResult: item.updateResult?.bind(item),
    tagName: item.name,
    toName: item.toname,
    props: item.parsedProps,
  };

  const wrapperStyle = {
    ...item.parsedStyle,
  };

  const content = DynamicComponent ? <DynamicComponent /> : <div>Loading...</div>;

  return (
    <div className={`custom-tag-wrapper ${item.classname}`} style={wrapperStyle}>
      {item.css && <style dangerouslySetInnerHTML={{ __html: item.css }} />}
      {/* <ManagementUI {...context} /> */}
      {/* <POCUI {...context} /> */}
      <hr />
      {item.errorBoundary ? (
        <CustomInterfaceErrorBoundary code={item.effectiveCode} item={item}>
          {content}
        </CustomInterfaceErrorBoundary>
      ) : (
        content
      )}
    </div>
  );
});

const CustomComponentWrapper = observer(({ item }) => {
  if (!APP_SETTINGS?.billing?.enterprise) {
    return (
      <div className="flex items-center gap-2">
        <EnterpriseBadge />
        CustomInterface tag is only available in the enterprise.
      </div>
    );
  }
  return <CustomInterfaceComponent item={item} />;
});

// Register the custom tag
// Registry.addTag("custominterface", CustomInterfaceModel, CustomComponentWrapper);
// Registry.addObjectType(CustomInterfaceModel);

export { CustomInterfaceModel, CustomComponentWrapper as CustomInterfaceComponent };
