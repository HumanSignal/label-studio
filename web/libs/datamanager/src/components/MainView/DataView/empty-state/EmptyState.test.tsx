import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nProvider } from "@humansignal/app-common";
import { EmptyState } from "./EmptyState";
import * as uiModule from "@humansignal/ui";
import * as iconsModule from "@humansignal/icons";
import * as docsModule from "../../../../../../editor/src/utils/docs";
import * as authProviderModule from "@humansignal/core/providers/AuthProvider";

// Mock global window.APP_SETTINGS
Object.defineProperty(window, "APP_SETTINGS", {
  value: { whitelabel_is_active: false },
  writable: true,
});

describe("EmptyState Component", () => {
  const defaultProps = {
    canImport: true,
    onOpenSourceStorageModal: mock(),
    onOpenImportModal: mock(),
  };

  beforeEach(() => {
    mock.clearAllMocks();

    spyOn(uiModule, "Button").mockImplementation(
      ({ children, onClick, disabled, "data-testid": testId, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} data-testid={testId} {...props}>
          {children}
        </button>
      ),
    );
    spyOn(uiModule, "Typography").mockImplementation(({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ));
    spyOn(uiModule, "IconExternal").mockImplementation(({ width, height }: any) => (
      <span data-testid="icon-external" width={width} height={height} />
    ));
    spyOn(uiModule, "Tooltip").mockImplementation(({ children, title }: any) => (
      <div data-tooltip={title}>{children}</div>
    ));

    spyOn(iconsModule, "IconUpload").mockImplementation(() => <span data-testid="icon-upload" />);
    spyOn(iconsModule, "IconLsLabeling").mockImplementation(({ width, height }: any) => (
      <span data-testid="icon-ls-labeling" width={width} height={height} />
    ));
    spyOn(iconsModule, "IconCheck").mockImplementation(({ width, height }: any) => (
      <span data-testid="icon-check" width={width} height={height} />
    ));
    spyOn(iconsModule, "IconSearch").mockImplementation(({ width, height }: any) => (
      <span data-testid="icon-search" width={width} height={height} />
    ));
    spyOn(iconsModule, "IconInbox").mockImplementation(({ width, height }: any) => (
      <span data-testid="icon-inbox" width={width} height={height} />
    ));
    spyOn(iconsModule, "IconCloudProviderS3").mockImplementation(({ width, height, className }: any) => (
      <span data-testid="icon-cloud-provider-s3" width={width} height={height} className={className} />
    ));
    spyOn(iconsModule, "IconCloudProviderGCS").mockImplementation(({ width, height, className }: any) => (
      <span data-testid="icon-cloud-provider-gcs" width={width} height={height} className={className} />
    ));
    spyOn(iconsModule, "IconCloudProviderAzure").mockImplementation(({ width, height, className }: any) => (
      <span data-testid="icon-cloud-provider-azure" width={width} height={height} className={className} />
    ));
    spyOn(iconsModule, "IconCloudProviderRedis").mockImplementation(({ width, height, className }: any) => (
      <span data-testid="icon-cloud-provider-redis" width={width} height={height} className={className} />
    ));

    spyOn(docsModule, "getDocsUrl").mockImplementation((path: string) => `https://docs.example.com/${path}`);

    spyOn(authProviderModule, "useAuth").mockReturnValue({
      user: { id: 1, username: "testuser" },
      permissions: {
        can: (ability: string) => ability === "storages.change",
      },
      isLoading: false,
    } as any);
  });

  describe("Basic Import Functionality", () => {
    it("should render the default import state when no role is specified", () => {
      render(<EmptyState {...defaultProps} />);

      // Check main title and description
      expect(screen.getByText("Import data to get your project started")).toBeInTheDocument();
      expect(screen.getByText("Connect your cloud storage or upload files from your computer")).toBeInTheDocument();

      // Check that storage provider icons are present
      expect(screen.getByTestId("dm-storage-provider-icons")).toBeInTheDocument();

      // Check that both buttons are present
      expect(screen.getByTestId("dm-connect-source-storage-button")).toBeInTheDocument();
      expect(screen.getByTestId("dm-import-button")).toBeInTheDocument();

      // Check accessibility features
      expect(screen.getByTestId("empty-state-label")).toHaveAttribute("aria-labelledby", "dm-empty-title");
      expect(screen.getByTestId("empty-state-label")).toHaveAttribute("aria-describedby", "dm-empty-desc");
    });

    it("should render non-interactive state when canImport is false", () => {
      render(<EmptyState {...defaultProps} canImport={false} />);

      const label = screen.getByTestId("empty-state-label");
      expect(label).toHaveAttribute("aria-labelledby", "dm-empty-title");
      expect(label).toHaveAttribute("aria-describedby", "dm-empty-desc");

      // Import button should not be present when canImport is false
      expect(screen.queryByTestId("dm-import-button")).not.toBeInTheDocument();
      // Connect Storage button should still be present
      expect(screen.getByTestId("dm-connect-source-storage-button")).toBeInTheDocument();
    });

    it("should render interactive state when canImport is true", () => {
      render(<EmptyState {...defaultProps} canImport={true} />);

      const label = screen.getByTestId("empty-state-label");
      expect(label).toHaveAttribute("aria-labelledby", "dm-empty-title");
      expect(label).toHaveAttribute("aria-describedby", "dm-empty-desc");

      // Both buttons should be present
      expect(screen.getByTestId("dm-connect-source-storage-button")).toBeInTheDocument();
      expect(screen.getByTestId("dm-import-button")).toBeInTheDocument();
    });
  });

  describe("Button Interactions", () => {
    it("should call onOpenSourceStorageModal when Connect Storage button is clicked", async () => {
      const user = userEvent.setup();
      const mockOpenStorage = mock();

      render(<EmptyState {...defaultProps} onOpenSourceStorageModal={mockOpenStorage} />);

      const connectButton = screen.getByTestId("dm-connect-source-storage-button");
      await user.click(connectButton);

      expect(mockOpenStorage).toHaveBeenCalledTimes(1);
    });

    it("should call onOpenImportModal when Import button is clicked", async () => {
      const user = userEvent.setup();
      const mockOpenImport = mock();

      render(<EmptyState {...defaultProps} onOpenImportModal={mockOpenImport} />);

      const importButton = screen.getByTestId("dm-import-button");
      await user.click(importButton);

      expect(mockOpenImport).toHaveBeenCalledTimes(1);
    });
  });

  describe("Role-Based Empty States", () => {
    describe("Filter-based Empty State", () => {
      it("should render filter empty state when hasFilters is true", () => {
        render(<EmptyState {...defaultProps} hasFilters={true} onClearFilters={mock()} />);

        expect(screen.getByText("No tasks found")).toBeInTheDocument();
        expect(screen.getByText("Try adjusting or clearing the filters to see more results")).toBeInTheDocument();
        expect(screen.getByTestId("dm-clear-filters-button")).toBeInTheDocument();
        expect(screen.getByTestId("icon-search")).toBeInTheDocument();
      });

      it("should call onClearFilters when Clear Filters button is clicked", async () => {
        const user = userEvent.setup();
        const mockClearFilters = mock();

        render(<EmptyState {...defaultProps} hasFilters={true} onClearFilters={mockClearFilters} />);

        const clearButton = screen.getByTestId("dm-clear-filters-button");
        await user.click(clearButton);

        expect(mockClearFilters).toHaveBeenCalledTimes(1);
      });
    });

    describe("Reviewer Role", () => {
      it("should render reviewer empty state", () => {
        render(<EmptyState {...defaultProps} userRole="REVIEWER" />);

        expect(screen.getByText("No tasks available for review or labeling")).toBeInTheDocument();
        expect(screen.getByText("Tasks imported to this project will appear here")).toBeInTheDocument();
        expect(screen.getByTestId("icon-check")).toBeInTheDocument();
      });
    });

    describe("Annotator Role", () => {
      it("should render annotator auto-distribution state with Label All Tasks button", () => {
        const mockLabelAllTasks = mock();
        const project = {
          assignment_settings: {
            label_stream_task_distribution: "auto_distribution",
          },
        };

        render(
          <EmptyState {...defaultProps} userRole="ANNOTATOR" project={project} onLabelAllTasks={mockLabelAllTasks} />,
        );

        expect(screen.getByText("Start labeling tasks")).toBeInTheDocument();
        expect(screen.getByText("Tasks you've labeled will appear here")).toBeInTheDocument();
        expect(screen.getByTestId("dm-label-all-tasks-button")).toBeInTheDocument();
        expect(screen.getByTestId("icon-ls-labeling")).toBeInTheDocument();
      });

      it("should call onLabelAllTasks when Label All Tasks button is clicked", async () => {
        const user = userEvent.setup();
        const mockLabelAllTasks = mock();
        const project = {
          assignment_settings: {
            label_stream_task_distribution: "auto_distribution",
          },
        };

        render(
          <EmptyState {...defaultProps} userRole="ANNOTATOR" project={project} onLabelAllTasks={mockLabelAllTasks} />,
        );

        const labelButton = screen.getByTestId("dm-label-all-tasks-button");
        await user.click(labelButton);

        expect(mockLabelAllTasks).toHaveBeenCalledTimes(1);
      });

      it("should render annotator manual distribution state without button", () => {
        const project = {
          assignment_settings: {
            label_stream_task_distribution: "assigned_only",
          },
        };

        render(<EmptyState {...defaultProps} userRole="ANNOTATOR" project={project} />);

        expect(screen.getByText("No tasks available")).toBeInTheDocument();
        expect(screen.getByText("Tasks assigned to you will appear here")).toBeInTheDocument();
        expect(screen.getByTestId("icon-inbox")).toBeInTheDocument();
        expect(screen.queryByTestId("dm-label-all-tasks-button")).not.toBeInTheDocument();
      });

      it("should render fallback annotator state for unknown distribution setting", () => {
        const project = {
          assignment_settings: {
            label_stream_task_distribution: "unknown_setting",
          },
        };

        render(<EmptyState {...defaultProps} userRole="ANNOTATOR" project={project} />);

        expect(screen.getByText("No tasks available")).toBeInTheDocument();
        expect(screen.getByText("Tasks will appear here when they become available")).toBeInTheDocument();
        expect(screen.getByTestId("icon-inbox")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<EmptyState {...defaultProps} />);

      const label = screen.getByTestId("empty-state-label");
      const title = screen.getByText("Import data to get your project started");
      const description = screen.getByText("Connect your cloud storage or upload files from your computer");

      expect(label).toHaveAttribute("aria-labelledby", "dm-empty-title");
      expect(label).toHaveAttribute("aria-describedby", "dm-empty-desc");
      expect(title).toHaveAttribute("id", "dm-empty-title");
      expect(description).toHaveAttribute("id", "dm-empty-desc");
    });

    it("should render documentation link with proper accessibility", () => {
      render(<EmptyState {...defaultProps} />);

      const docLink = screen.getByTestId("dm-docs-data-import-link");
      expect(docLink).toHaveAttribute("href", "https://docs.example.com/guide/tasks");
      expect(docLink).toHaveAttribute("target", "_blank");
      expect(docLink).toHaveAttribute("rel", "noopener noreferrer");

      const srText = docLink.querySelector(".sr-only");
      expect(srText).toHaveTextContent("(opens in a new tab)");
    });
  });

  describe("Conditional Content", () => {
    it("should hide documentation link when whitelabel is active", () => {
      // Mock whitelabel active
      Object.defineProperty(window, "APP_SETTINGS", {
        value: { whitelabel_is_active: true },
        writable: true,
      });

      render(<EmptyState {...defaultProps} />);

      expect(screen.queryByTestId("dm-docs-data-import-link")).not.toBeInTheDocument();

      // Reset for other tests
      Object.defineProperty(window, "APP_SETTINGS", {
        value: { whitelabel_is_active: false },
        writable: true,
      });
    });

    it("should show documentation link when whitelabel is not active", () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByTestId("dm-docs-data-import-link")).toBeInTheDocument();
    });
  });

  describe("Storage Provider Icons", () => {
    it("should render storage provider icons with proper tooltips", () => {
      render(<EmptyState {...defaultProps} />);

      const iconsContainer = screen.getByTestId("dm-storage-provider-icons");
      expect(iconsContainer).toBeInTheDocument();

      // Check for aria-labels on storage provider containers
      const s3Container = screen.getByLabelText("Amazon S3");
      const gcsContainer = screen.getByLabelText("Google Cloud Storage");
      const azureContainer = screen.getByLabelText("Azure Blob Storage");
      const redisContainer = screen.getByLabelText("Redis Storage");

      expect(s3Container).toBeInTheDocument();
      expect(gcsContainer).toBeInTheDocument();
      expect(azureContainer).toBeInTheDocument();
      expect(redisContainer).toBeInTheDocument();
    });

    it("should show storage icons in correct order", () => {
      render(<EmptyState {...defaultProps} />);

      const iconsContainer = screen.getByTestId("dm-storage-provider-icons");
      const iconContainers = iconsContainer.querySelectorAll("[aria-label]");

      expect(iconContainers).toHaveLength(4);
      expect(iconContainers[0]).toHaveAttribute("aria-label", "Amazon S3");
      expect(iconContainers[1]).toHaveAttribute("aria-label", "Google Cloud Storage");
      expect(iconContainers[2]).toHaveAttribute("aria-label", "Azure Blob Storage");
      expect(iconContainers[3]).toHaveAttribute("aria-label", "Redis Storage");
    });
  });

  describe("Button States and Props", () => {
    it("should render buttons with correct text content", () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByTestId("dm-connect-source-storage-button")).toHaveTextContent("Connect Cloud Storage");
      expect(screen.getByTestId("dm-import-button")).toHaveTextContent("Import");
    });

    it("should render Clear Filters button with correct text", () => {
      render(<EmptyState {...defaultProps} hasFilters={true} onClearFilters={mock()} />);

      expect(screen.getByTestId("dm-clear-filters-button")).toHaveTextContent("Clear Filters");
    });

    it("should render Label All Tasks button with correct text and state", () => {
      const project = {
        assignment_settings: {
          label_stream_task_distribution: "auto_distribution",
        },
      };

      render(<EmptyState {...defaultProps} userRole="ANNOTATOR" project={project} onLabelAllTasks={mock()} />);

      const labelButton = screen.getByTestId("dm-label-all-tasks-button");
      expect(labelButton).toHaveTextContent("Label All Tasks");
      expect(labelButton).not.toBeDisabled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing project object gracefully", () => {
      render(<EmptyState {...defaultProps} userRole="ANNOTATOR" />);

      // Should render fallback state
      expect(screen.getByText("No tasks available")).toBeInTheDocument();
      expect(screen.getByText("Tasks will appear here when they become available")).toBeInTheDocument();
    });

    it("should handle missing assignment settings gracefully", () => {
      const project = {}; // No assignment_settings

      render(<EmptyState {...defaultProps} userRole="ANNOTATOR" project={project} />);

      // Should render fallback state
      expect(screen.getByText("No tasks available")).toBeInTheDocument();
      expect(screen.getByText("Tasks will appear here when they become available")).toBeInTheDocument();
    });
  });

  describe("i18n", () => {
    // The i18next singleton is shared across tests in this file — restore English
    // so later/other tests asserting English strings are not affected.
    afterEach(() => {
      i18next.changeLanguage("en");
    });

    it("renders the default import empty state in zh-CN", () => {
      render(
        <I18nProvider browserLanguages={["zh-CN"]}>
          <EmptyState {...defaultProps} />
        </I18nProvider>,
      );

      expect(screen.getByText("导入数据，开始使用项目")).toBeInTheDocument();
      expect(screen.getByText("连接你的云存储，或从电脑上传文件")).toBeInTheDocument();
      expect(screen.getByTestId("dm-connect-source-storage-button")).toHaveTextContent("连接云存储");
      expect(screen.getByTestId("dm-import-button")).toHaveTextContent("导入");
    });

    it("renders the filter empty state in zh-CN", () => {
      render(
        <I18nProvider browserLanguages={["zh-CN"]}>
          <EmptyState {...defaultProps} hasFilters onClearFilters={mock()} />
        </I18nProvider>,
      );

      expect(screen.getByText("未找到任务")).toBeInTheDocument();
      expect(screen.getByText("尝试调整或清除筛选条件以查看更多结果")).toBeInTheDocument();
      expect(screen.getByTestId("dm-clear-filters-button")).toHaveTextContent("清除筛选");
    });
  });
});
