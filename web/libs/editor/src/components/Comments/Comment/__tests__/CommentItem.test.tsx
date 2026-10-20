/**
 * CommentItem header slot: the host app can put its own control right after the author name by
 * setting `commentHeaderExtra` on the root store (AppStore.setCommentHeaderExtra, UTC-1446 experiment).
 *
 * The store here is a plain MobX observable with the field as an observable reference, which is how
 * an MST volatile field behaves; AppStore.test.js checks that the real field is observable.
 */
import { act, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { CommentItem } from "../CommentItem";

type HeaderExtraProps = { comment: any; text: string };

const createStore = (commentHeaderExtra: ((props: HeaderExtraProps) => JSX.Element) | null = null) =>
  observable({ commentHeaderExtra, hasInterface: () => false }, { commentHeaderExtra: observable.ref });

const createComment = (store: ReturnType<typeof createStore>) => ({
  id: 42,
  isEditMode: false,
  isConfirmDelete: false,
  createdAt: "2026-10-16T14:02:00Z",
  updatedAt: "2026-10-16T14:02:00Z",
  isPersisted: true,
  isDeleted: false,
  createdBy: { id: 7, first_name: "Rita", last_name: "Reviewer", email: "rita@example.com" },
  text: "Please fix the bounding box",
  regionRef: null,
  classifications: null,
  isResolved: false,
  updateComment: mock(),
  deleteComment: mock(),
  setConfirmMode: mock(),
  setClassifications: mock(),
  setEditMode: mock(),
  toggleResolve: mock(),
  canResolveAny: false,
  unsetLink: mock(),
  isHighlighted: false,
  setHighlighted: mock(),
  _commentRef: null,
  commentsStore: { store },
});

const HeaderExtra = ({ comment, text }: HeaderExtraProps) => (
  <span data-testid="header-extra">{`extra for #${comment.id}: ${text}`}</span>
);

const renderItem = (comment: ReturnType<typeof createComment>) =>
  render(<CommentItem comment={comment as any} listComments={mock()} classificationsItems={[]} />);

describe("CommentItem header slot (commentHeaderExtra)", () => {
  it("renders nothing extra when the host has not set a component", () => {
    renderItem(createComment(createStore()));

    expect(screen.getByText("Rita Reviewer")).toBeInTheDocument();
    expect(screen.queryByTestId("header-extra")).not.toBeInTheDocument();
  });

  it("renders the host component right after the author name with the comment and its text", () => {
    const comment = createComment(createStore(HeaderExtra));
    renderItem(comment);

    const extra = screen.getByTestId("header-extra");
    expect(extra).toHaveTextContent("extra for #42: Please fix the bounding box");
    expect(screen.getByText("Rita Reviewer").nextElementSibling).toBe(extra);
  });

  it("passes the comment model itself to the host component", () => {
    const received: HeaderExtraProps[] = [];
    const Spy = (props: HeaderExtraProps) => {
      received.push(props);
      return null;
    };
    const comment = createComment(createStore(Spy));
    renderItem(comment);

    expect(received.at(-1)?.comment).toBe(comment);
    expect(received.at(-1)?.text).toBe("Please fix the bounding box");
  });

  it("shows and hides the component when the host sets or clears it after comments are on screen", () => {
    const store = createStore();
    renderItem(createComment(store));
    expect(screen.queryByTestId("header-extra")).not.toBeInTheDocument();

    act(() => {
      runInAction(() => {
        store.commentHeaderExtra = HeaderExtra;
      });
    });
    expect(screen.getByTestId("header-extra")).toBeInTheDocument();

    act(() => {
      runInAction(() => {
        store.commentHeaderExtra = null;
      });
    });
    expect(screen.queryByTestId("header-extra")).not.toBeInTheDocument();
  });
});
