/**
 * Unit tests for UserStore and UserExtended (Codecov: Chunk 10 - stores/core)
 */
import UserStore, { UserExtended } from "../UserStore";

describe("UserStore", () => {
  it("creates with null id and pk", () => {
    const store = UserStore.create({});
    expect(store.id).toBeNull();
    expect(store.pk).toBeNull();
    expect(store.firstName).toBeNull();
    expect(store.lastName).toBeNull();
  });

  it("creates with id and pk", () => {
    const store = UserStore.create({ id: 1, pk: 42 });
    expect(store.id).toBe(1);
    expect(store.pk).toBe(42);
  });

  it("displayName returns empty string when no name", () => {
    const store = UserStore.create({});
    expect(store.displayName).toBe("");
  });

  it("displayName returns first and last name joined", () => {
    const store = UserStore.create({ firstName: "Jane", lastName: "Doe" });
    expect(store.displayName).toBe("Jane Doe");
  });

  it("displayName works with only firstName", () => {
    const store = UserStore.create({ firstName: "Jane" });
    expect(store.displayName).toContain("Jane");
  });

  it("displayName works with only lastName", () => {
    const store = UserStore.create({ lastName: "Doe" });
    expect(store.displayName).toContain("Doe");
  });
});

describe("UserExtended", () => {
  it("creates with required id and camelizes snapshot keys", () => {
    const snapshot = { id: 10, first_name: "John", last_name: "Smith" };
    const user = UserExtended.create(snapshot);
    expect(user.id).toBe(10);
    expect(user.firstName).toBe("John");
    expect(user.lastName).toBe("Smith");
  });

  it("displayName returns trimmed first and last name", () => {
    const user = UserExtended.create({ id: 1, first_name: "Jane", last_name: "Doe" });
    expect(user.displayName).toBe("Jane Doe");
  });

  it("displayName returns empty string when no name fields", () => {
    const user = UserExtended.create({ id: 1 });
    expect(user.displayName).toBe("");
  });

  it("handles optional fields as null", () => {
    const user = UserExtended.create({ id: 1 });
    expect(user.username).toBeNull();
    expect(user.email).toBeNull();
  });
});
