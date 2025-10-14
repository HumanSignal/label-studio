import { z } from "zod";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";
import React from "react";

/**
 * Backblaze B2 Logo Component
 * 
 * To use the official Backblaze logo:
 * 1. Download the logo from: https://www.backblaze.com/partners/resources
 * 2. Save it as: web/apps/labelstudio/public/images/storage-providers/backblaze-b2-logo.png
 * 3. Rebuild the frontend: cd web && yarn build
 * 
 * The logo will automatically be used instead of the fallback icon.
 */
const IconBackblazeB2: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  // Try to use the official logo if available, otherwise use fallback SVG
  const logoPath = "/static/images/storage-providers/backblaze-b2-logo.png";
  const [useImage, setUseImage] = React.useState(true);

  return useImage ? (
    <img
      src={logoPath}
      alt="Backblaze B2 Cloud Storage"
      width="24"
      height="24"
      onError={() => setUseImage(false)}
      style={{ objectFit: "contain" }}
      {...props}
    />
  ) : (
    // Fallback icon with Backblaze brand color (#D9272E)
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Backblaze B2 Cloud Storage"
      {...props}
    >
      <circle cx="12" cy="12" r="10" fill="#D9272E" />
      <text
        x="12"
        y="16"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="10"
        fontWeight="700"
        fill="#FFFFFF"
        textAnchor="middle"
      >
        B2
      </text>
    </svg>
  );
};

/**
 * Backblaze B2 Cloud Storage Provider Configuration
 * 
 * B2 is S3-compatible, using boto3 with custom endpoint URLs.
 * Users provide their B2 Application Key credentials and bucket details.
 */
export const b2Provider: ProviderConfig = {
  name: "b2",
  title: "Backblaze B2",
  description: "Configure your Backblaze B2 Cloud Storage connection with S3-compatible settings",
  icon: IconBackblazeB2, // Backblaze B2 branded icon with official Backblaze red color
  fields: [
    {
      name: "bucket",
      type: "text",
      label: "Bucket Name",
      required: true,
      placeholder: "my-b2-bucket",
      schema: z.string().min(1, "Bucket name is required"),
      description: "Your Backblaze B2 bucket name",
    },
    {
      name: "b2_endpoint_url",
      type: "text",
      label: "B2 Endpoint URL",
      required: true,
      placeholder: "https://s3.us-west-004.backblazeb2.com",
      schema: z.string()
        .min(1, "B2 Endpoint URL is required")
        .url("Must be a valid URL")
        .refine(
          (url) => url.includes("backblazeb2.com") || url.includes("backblaze.com"),
          "Endpoint URL must be a Backblaze B2 endpoint"
        ),
      description: "Your region-specific B2 S3-compatible endpoint (e.g., https://s3.us-west-004.backblazeb2.com)",
    },
    {
      name: "region_name",
      type: "text",
      label: "Region Name",
      placeholder: "us-west-004",
      schema: z.string().optional().default("us-west-004"),
      description: "B2 region (e.g., us-west-004, us-east-005, eu-central-003)",
    },
    {
      name: "prefix",
      type: "text",
      label: "Bucket Prefix (Folder Path)",
      placeholder: "path/to/files",
      schema: z.string().optional().default(""),
      target: "export",
      description: "Optional folder path within the bucket",
    },
    {
      name: "b2_access_key_id",
      type: "password",
      label: "Application Key ID",
      required: true,
      placeholder: "0051234567890abcdef",
      autoComplete: "off",
      accessKey: true,
      schema: z.string().min(1, "B2 Application Key ID is required"),
      description: "Your B2 Application Key ID (from Backblaze dashboard > App Keys)",
    },
    {
      name: "b2_secret_access_key",
      type: "password",
      label: "Application Key",
      required: true,
      placeholder: "K001234567890abcdefghij",
      autoComplete: "new-password",
      accessKey: true,
      schema: z.string().min(1, "B2 Application Key is required"),
      description: "Your B2 Application Key (shown only once when created)",
    },
    {
      name: "presign",
      type: "toggle",
      label: "Use pre-signed URLs (On) / Proxy through the platform (Off)",
      description:
        "When pre-signed URLs are enabled, all data bypasses the platform and user browsers directly read data from B2 storage",
      schema: z.boolean().default(true),
      target: "import",
      resetConnection: false,
    },
    {
      name: "presign_ttl",
      type: "counter",
      label: "Expire pre-signed URLs (minutes)",
      min: 1,
      max: 10080, // 7 days
      step: 1,
      schema: z.number().min(1).max(10080).default(15),
      target: "import",
      resetConnection: false,
      dependsOn: {
        field: "presign",
        value: true,
      },
      description: "Time until pre-signed URLs expire (default: 15 minutes)",
    },
    {
      name: "recursive_scan",
      type: "toggle",
      label: "Scan all sub-folders",
      description: "When enabled, files from all nested folders will be imported",
      schema: z.boolean().default(false),
      target: "import",
      resetConnection: false,
    },
  ],
  layout: [
    { fields: ["bucket"] },
    { fields: ["b2_endpoint_url"] },
    { fields: ["region_name"] },
    { fields: ["prefix"] },
    { fields: ["b2_access_key_id"] },
    { fields: ["b2_secret_access_key"] },
    { fields: ["presign", "presign_ttl"] },
    { fields: ["recursive_scan"] },
  ],
};

export default b2Provider;

