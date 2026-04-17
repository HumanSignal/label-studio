import { Assignee } from "./Assignee";

describe("Assignee preProcessSnapshot (FIT-1658)", () => {
  let ff;

  beforeEach(() => {
    ff = mockFF();
    ff.setup();
  });

  afterEach(() => {
    ff.reset();
  });

  it("embeds flat profile fields from API payload", () => {
    const row = Assignee.create({
      user_id: 42,
      id: 42,
      first_name: "Sam",
      last_name: "",
      email: "sam@example.com",
      username: "sam",
      last_activity: "",
      avatar: null,
      initials: "S",
      annotated: true,
      review: null,
      reviewed: false,
    });

    expect(row.email).toBe("sam@example.com");
    expect(row.firstName).toBe("Sam");
  });

  it("embeds nested user object when API provides user", () => {
    const row = Assignee.create({
      id: 9,
      user: {
        id: 9,
        first_name: "Rae",
        email: "rae@example.com",
        last_name: "Lee",
        username: "rae",
        lastActivity: "",
        avatar: null,
        initials: "RL",
      },
      annotated: true,
      review: null,
      reviewed: false,
    });

    expect(row.email).toBe("rae@example.com");
  });
});
