import { s3Provider } from "./s3";

describe("S3 provider", () => {
  it("allows access key credentials to be blank", () => {
    for (const name of ["aws_access_key_id", "aws_secret_access_key"]) {
      const field = s3Provider.fields.find((candidate) => candidate.name === name);

      expect(field?.type).toBe("password");
      if (!field || field.type === "message") throw new Error(`Missing S3 credential field: ${name}`);

      expect(field.required).not.toBe(true);
      expect(field.schema.parse("")).toBe("");
    }
  });
});
