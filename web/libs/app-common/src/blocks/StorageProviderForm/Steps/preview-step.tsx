import { Label, Toggle, Select, Tooltip, cn } from "@humansignal/ui";
import { Form, Input } from "apps/labelstudio/src/components/Form";
import { IconDocument, IconSearch } from "@humansignal/icons";
import { formatDistanceToNow } from "date-fns";
import type { ForwardedRef } from "react";

interface PreviewStepProps {
  formData: any;
  formState: any;
  setFormState: (updater: (prevState: any) => any) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  action: string;
  target: string;
  type: string;
  project: string;
  storage?: any;
  onSubmit: () => void;
  formRef: ForwardedRef<unknown>;
  filesPreview: any[] | null;
  formatSize: (bytes: number) => string;
  onImportSettingsChange?: () => void;
}

const regexFilters = [
  {
    title: "Images",
    regex: ".*.(jpe?g|png|gif)$",
    blob: true,
  },
  {
    title: "Videos",
    regex: ".*\\.(mp4|avi|mov|wmv|webm)$",
    blob: true,
  },
  {
    title: "Audio",
    regex: ".*\\.(mp3|wav|ogg|flac)$",
    blob: true,
  },
  {
    title: "Tabular",
    regex: ".*\\.(csv|tsv)$",
    blob: true,
  },
  {
    title: "JSON",
    regex: ".*\\.json$",
    blob: false,
  },
  {
    title: "JSONL",
    regex: ".*\\.jsonl$",
    blob: false,
  },
  {
    title: "Parquet",
    regex: ".*\\.parquet$",
    blob: false,
  },
  {
    title: "All Tasks Files",
    regex: ".*\\.(json|jsonl|parquet)$",
    blob: false,
  },
] as const;

export const PreviewStep = ({
  formData,
  formState,
  setFormState,
  handleChange,
  action,
  target,
  type,
  project,
  storage,
  onSubmit,
  formRef,
  filesPreview,
  formatSize,
  onImportSettingsChange,
}: PreviewStepProps) => {
  return (
    <div className="space-y-wide">
      <div>
        <h2 className="text-xl font-semibold">Configure Import Settings & Preview Data</h2>
        <p className="text-muted-foreground">Set up filters for your files and preview what will be synchronized</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-wide">
        {/* Left Column Header */}
        <h4>Import Configuration</h4>

        {/* Right Column Header with Button */}
        <div className="flex justify-between items-center">
          <h4>Files Preview</h4>
        </div>

        {/* Left Column: Configuration */}
        <div>
          <Form
            ref={formRef}
            action={action}
            params={{ target, type, project, pk: storage?.id }}
            formData={formData}
            skipEmpty={false}
            onSubmit={onSubmit}
            autoFill="off"
            autoComplete="off"
          >
            <div className="space-y-wider">
              {/* Path/Bucket Prefix Section - Hide for localfiles since it has its own path field */}
              {type !== "localfiles" && (
                <div className="space-y-tight">
                  <Label text={`${type === "redis" ? "Path to Files" : "Bucket Prefix"} (optional)`} />
                  <p className="text-sm text-muted-foreground">
                    {type === "redis"
                      ? "Specify the folder path within your storage where your files are located"
                      : "Specify the folder path within your bucket where your files are located"}
                  </p>
                  <Input
                    id={type === "redis" ? "path" : "prefix"}
                    name={type === "redis" ? "path" : "prefix"}
                    value={type === "redis" ? (formData.path ?? "") : (formData.prefix ?? "")}
                    onChange={(e) => {
                      handleChange(e);
                      // Reset preview when prefix/path changes
                      onImportSettingsChange?.();
                    }}
                    placeholder="path/to/files/ or leave empty for root"
                    style={{ width: "100%" }}
                    required={false}
                    skip={false}
                    labelProps={{}}
                    ghost={false}
                    tooltipIcon={null}
                  />
                </div>
              )}

              {/* Import Method */}
              <div className="space-y-tight">
                <Label text="Import Method (optional)" />
                <p className="text-sm text-muted-foreground">Choose how to interpret your data from storage</p>
                <Select
                  name="use_blob_urls"
                  value={formData.use_blob_urls ? "Files" : "Tasks"}
                  onChange={(value) => {
                    const isFiles = value === "Files";
                    setFormState((prevState) => ({
                      ...prevState,
                      formData: {
                        ...prevState.formData,
                        use_blob_urls: isFiles,
                        regex_filter: "", // Reset regex filter when import method changes
                      },
                    }));
                    // Reset validation state when import method changes
                    onImportSettingsChange?.();
                  }}
                  options={
                    [
                      {
                        value: "Files",
                        label: "Files - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT)",
                      },
                      {
                        value: "Tasks",
                        label: "Tasks - Treat each JSON, JSONL, or Parquet as one or more task definitions per file",
                      },
                    ] as any
                  }
                  placeholder="Select import method"
                />
              </div>

              {/* File Filter Section */}
              <div className="space-y-tight">
                <Label text="File Name Filter (optional)" />
                <p className="text-sm text-muted-foreground">Use regex patterns to filter which files are imported</p>
                <Input
                  id="regex_filter"
                  name="regex_filter"
                  value={formData.regex_filter ?? ""}
                  onChange={(e) => {
                    handleChange(e);
                    // Reset preview when regex filter changes
                    onImportSettingsChange?.();
                  }}
                  placeholder={
                    formData.use_blob_urls
                      ? ".*\\.(jpg|png)$ - imports only JPG, PNG files"
                      : ".*\\.(json|jsonl|parquet)$ - imports task definitions"
                  }
                  style={{ width: "100%" }}
                  label=""
                  description=""
                  footer=""
                  className=""
                  validate=""
                  required={false}
                  skip={false}
                  labelProps={{}}
                  ghost={false}
                  tooltip=""
                  tooltipIcon={null}
                />

                <div className="flex flex-wrap gap-x-tight items-center text-xs">
                  <span className="text-muted-foreground">Common filters:</span>
                  {regexFilters
                    .filter((r) => r.blob === formData.use_blob_urls)
                    .map((r) => {
                      return (
                        <button
                          key={r.regex}
                          type="button"
                          className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                          onClick={(e) => {
                            e.preventDefault();
                            setFormState((prevState) => ({
                              ...prevState,
                              formData: {
                                ...prevState.formData,
                                regex_filter: r.regex,
                              },
                            }));
                            // Reset preview when common filter is selected
                            onImportSettingsChange?.();
                          }}
                        >
                          {r.title}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Scan All Subfolders */}
              <div className="flex items-center justify-between">
                <div>
                  <Label text="Scan all sub-folders" className="block mb-tight" />
                  <p className="text-sm text-muted-foreground">Include files from all nested folders</p>
                </div>
                <Toggle
                  checked={formData.recursive_scan ?? false}
                  onChange={(e) => {
                    setFormState((prevState) => ({
                      ...prevState,
                      formData: {
                        ...prevState.formData,
                        recursive_scan: e.target.checked,
                      },
                    }));
                    // Reset validation state when recursive scan changes
                    onImportSettingsChange?.();
                  }}
                />
              </div>
            </div>
          </Form>
        </div>

        {/* Right Column: Preview Files */}
        <div className="border rounded-md overflow-hidden h-[340px]">
          <div className="bg-card h-full flex flex-col">
            {filesPreview === null ? (
              // No API response yet
              <div className="flex flex-col items-center justify-center py-12 px-base text-center flex-grow">
                <div className="rounded-full bg-muted p-3 mb-base">
                  <IconDocument className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-tighter">No Preview Available</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Configure your import settings and click "Load Preview" to see a sample of files that will be
                  imported.
                </p>
              </div>
            ) : filesPreview.length === 0 ? (
              // API returned empty array
              <div className="flex flex-col items-center justify-center py-12 px-base text-center flex-grow">
                <div className="rounded-full bg-muted p-3 mb-base">
                  <IconSearch className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-tighter">No Files Found</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  No files matching your current criteria were found. Try adjusting your filter settings and reload the
                  preview.
                </p>
              </div>
            ) : (
              // Files available - display in a table format with fixed height and scrolling
              <div className="px-tight py-tight flex-grow overflow-auto">
                <div className="grid grid-cols-1 text-xs gap-tighter">
                  {filesPreview.map((file, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex justify-between py-tightest px-tight bg-neutral-surface border-b last:border-b-0 rounded-small",
                        {
                          "hover:bg-neutral-surface-hover": file.key !== null,
                        },
                      )}
                    >
                      <Tooltip title={file.key || "..."} disabled={file.key === null}>
                        <div
                          className={cn("max-w-[260px] overflow-hidden", {
                            "cursor-help": file.key !== null,
                          })}
                        >
                          {file.key ? (
                            file.key.length > 28 ? (
                              <span>
                                {file.key.slice(0, 12)}...{file.key.slice(-13)}
                              </span>
                            ) : (
                              file.key
                            )
                          ) : (
                            <span className="italic">... preview limit reached ...</span>
                          )}
                        </div>
                      </Tooltip>
                      <div className="flex items-center space-x-tighter text-muted-foreground whitespace-nowrap">
                        <span>
                          {file.last_modified && formatDistanceToNow(new Date(file.last_modified), { addSuffix: true })}
                        </span>
                        <span className="mx-tightest">•</span>
                        <span>{file.size && formatSize(file.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
