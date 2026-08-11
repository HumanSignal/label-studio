import { z } from "zod";
import { addProvider } from "../providers";
import type { ProviderConfig } from "../types/provider";
import { cleanStorageFormDataForSubmission } from "./cleanStorageFormData";

const provider: ProviderConfig = {
  name: "credential-test",
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
});
