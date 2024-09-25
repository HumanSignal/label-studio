import { FF_DEV_3034, isFF } from "../utils/feature-flags";

export class CommentsSdk {
  constructor(lsf, dm) {
    this.lsf = lsf;
    this.dm = dm;
    this.bindEventHandlers();
  }

  bindEventHandlers() {
    ["comments:create", "comments:update", "comments:delete", "comments:list"].forEach((evt) => this.lsf.off(evt));

    this.lsf.on("comments:create", this.createComment);
    this.lsf.on("comments:update", this.updateComment);
    this.lsf.on("comments:delete", this.deleteComment);
    this.lsf.on("comments:list", this.listComments);
  }

  createComment = async (comment) => {
    const body = {
      is_resolved: comment.is_resolved,
      text: comment.text,
      region_ref: comment.region_ref,
    };

    if (comment.annotation) {
      body.annotation = comment.annotation;
    } else if (isFF(FF_DEV_3034) && comment.draft) {
      body.draft = comment.draft;
    }
    const { $meta: _, ...newComment } = await this.dm.apiCall("createComment", undefined, {
      body,
    });

    return newComment;
  };

  updateComment = async (comment) => {
    if (!comment.id || comment.id < 0) return; // Don't allow an update with an incorrect id

    const res = await this.dm.apiCall("updateComment", { id: comment.id }, { body: comment });

    return res;
  };

  listComments = async (params) => {
    const listParams = {
      ordering: params.ordering || "-id",
      expand_created_by: true,
    };

    if (params.annotation) {
      listParams.annotation = params.annotation;
    } else if (isFF(FF_DEV_3034) && params.draft) {
      listParams.draft = params.draft;
    } else {
      return [];
    }

    const res = await this.dm.apiCall("listComments", listParams);

    const commentUsers = [];
    const comments = res.map((comment) => {
      commentUsers.push(comment.created_by);
      return { ...comment, created_by: comment.created_by.id };
    });

    if (commentUsers.length) {
      this.lsf.store.enrichUsers(commentUsers);
    }

    return comments;
  };

  deleteComment = async (comment) => {
    if (!comment.id || comment.id < 0) return; // Don't allow an update with an incorrect id

    const res = await this.dm.apiCall("deleteComment", { id: comment.id }, { body: comment });

    return res;
  };
}
