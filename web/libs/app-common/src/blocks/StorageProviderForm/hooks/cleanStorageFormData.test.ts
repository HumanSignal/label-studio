import { z } from "zod";
import { addProvider } from "../providers";
import type { ProviderConfig } from "../types/provider";
import { cleanStorageFormDataForSubmission } from "./cleanStorageFormData";

const provider: ProviderConfig = {
  name: "s3",
  title: "Credential test",
  description: "Credential test provider",
  fields: [
    {
      name: "credential",
      type: "password",
      label: "Credential",
      accessKey: true,
      schema: z.string().optional().default(""),
    },
  ],
  layout: [{ fields: ["credential"] }],
};

describe("cleanStorageFormDataForSubmission", () => {
  beforeAll(() => {
    addProvider(provider.name, provider);
    addProvider("other-provider", { ...provider, name: "other-provider" });
  });

  it("keeps an explicitly cleared credential in edit mode", () => {
    const result = cleanStorageFormDataForSubmission(
      {
        provider: provider.name,
        credential: "",
      },
      true,
    );

    expect(result).toEqual({
      provider: provider.name,
      credential: "",
    });
  });

  it("omits an unchanged protected credential in edit mode", () => {
    const result = cleanStorageFormDataForSubmission(
      {
        provider: provider.name,
        credential: "••••••••••••••••",
      },
      true,
    );

    expect(result).toEqual({ provider: provider.name });
  });

  it("continues to omit empty credentials for other providers", () => {
    const result = cleanStorageFormDataForSubmission(
      {
        provider: "other-provider",
        credential: "",
      },
      true,
    );

    expect(result).toEqual({ provider: "other-provider" });
  });
});
