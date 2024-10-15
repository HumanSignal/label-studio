---
title: Comments and notifications 
short: Comments and notifications
type: guide
tier: enterprise
section: "Create & Manage Projects"
order: 0
order_enterprise: 146
meta_title: Comment and notification systems in Label Studio
meta_description: The Comments and Notifications feature defines how annotators, reviewers and administrators communicate and receive updates on projects and tasks.
---

Annotators, reviewers, and administrators can use comments to do the following:

- Speed up the labeling process
- Increase the annotation quality
- Build more solid labeling and review processes

Users can discuss task issues and other problems during labeling and reviewing processes using Comments and Notifications in Label Studio Enterprise.


## Workflow overviews

The following two workflows are flexible and can be combined. For example, in Figure 1A, Annotators don’t have access to the Data Manager and they would only use the Label Stream. They can write comments there, resolve them, and see notifications. Meanwhile, other roles like Managers or Administrators can filter tasks by “Unresolved comments” in the Data Manager and use the second workflow (see Figure 1B).

<center>
<br>
<img src="/images/workflow-notifications.png"/>
<br><i>Figure 1A. The workflow based on notifications</i><br>

<br>

<img src="/images/workflow-data-manager.png" style="max-width: 17rem;"/>
<br><i>Figure 2B. The workflow based on the Data Manager</i><br>
</center>

### Notification workflow

This approach is centered on the notification panel (see figure 1A). The entry point here is the notification link, it allows going into editing or review mode (depending on your role). Note that label or review streams are deactivated there, only a task from a notification link is shown.

#### Annotators

##### Write comments 

1. Annotator starts the labeling stream.
2. Annotator sees a new task and writes a comment.
3. Who will see the notification about this comment? 
    * a. If this comment is the first in a task draft or an annotation, then it will be shown:
      - To all reviewers on the current project.
      - To all administrators on the current project.
    * b. If this comment is not the first one, then it will be shown.
      - To all users who were involved in the initial comment thread only.

##### Read other’s comments

Annotators will see notifications from reviewers and other users when another user’s comment is added to the annotator draft or annotation

!!! note
    An annotator must be added to the project or workspace to see associated comments.

#### Reviewers and other higher roles

##### Write comments

Reviewers (or other higher roles) can write comments during the review stream. It is especially useful when a reviewer rejects an annotation. 

1. Reviewer starts the review stream
2. Reviewer sees a task with an annotation and writes a comment
3. Who will see the notification about this comment? 
    1. Annotator who created this annotation
    2. Other commentators who wrote comments in this comment thread

##### Read comments

1. Reviewers will see notifications from annotators and other users when: 

- The comment is the first one in a task draft or an annotation
- There is a new comment in an annotation that were reviewed by this reviewer previously

!!! note
    A reviewer must be added to the project or workspace to see associated comments.

### Submitted annotations vs postponed drafts

The standard labeling workflow is to submit an annotation. This action affects statistics, agreement, and annotator performance scores. In some cases where annotators want to avoid submitting (e.g. while they wait for their comment to be resolved), they can use to postpone draft functionality by clicking blue arrow button in the labeling stream: 

<br>
<img src="/images/comments-notifications/postpone.png" class="gif-border">
<br>

It’s helpful to combine postponed drafts with comments, because users can clarify some questions without affecting a dataset labeling state. Annotators can access their postponed drafts in the following ways: 

- Postponed drafts will be re-queued at the end of the labeling stream after the annotator completes all tasks
- Using the Data Manager
- Using task history navigation <img src="/images/comments-notifications/history.png" clas="gif-border" style="height:25px"> 
Note: If the user refreshes the page, the navigation history will be lost. This inconvenience will be fixed soon in upcoming releases.
 - Using notification links when somebody answers to comments



### Data manager workflow

You can add comments to tasks independent of annotation and action such as **Skip** or **Accept**.
  
1. In the Label Studio UI, navigate to your Data Manager.

2. Click on the **Columns** drop-down to filter the columns based on the following:

<br>
<img src="/images/comments-notifications/columns.png" class="gif-border"/>
<i>Figure 2: Columns drop-down.</i>

- **Comments**: Total number of comments for a particular task.
- **Unresolved comments**: Comments that are not yet resolved. The total number of unresolved comments are displayed in this column. 
- **Commented at**: The date and time at which the comment was made. 
- **Commented authors**: Users who wrote comments.  

<br>
<img src="/images/comments-notifications/commented-at.png" class="gif-border"/>
<i>Figure 3: Commented at.</i>


Now, you can also filter by the number of comments and comments added or by the authors using the **Filter** drop-down located next to the **Columns** drop-down. You can add more filters to display tasks based on your filtering requirements. 

<br>
<img src="/images/comments-notifications/comment-by-author-filter.png" class="gif-border"/>
<i>Figure 4: Filter to comment by author.</i>

To resolve comments, click on a task and on the right side of the window you will see the **Comments** section where you can add a comment or click the three dots (**...**) to resolve or unresolve comments. 

<br>
<img src="/images/comments-notifications/resolve.png" class="gif-border"/>
<i>Figure 5: Resolve comments.</i>

When you click **Resolve**, you will see a green color check mark next to your comment. This represents a resolved comment.

<br>
<img src="/images/comments-notifications/resolved-comment-green-tick-mark.png" class="gif-border" style="max-width: 300px!important;"/>
<br/>
<i>Figure 6: Green color check mark for resolved comments.</i>


To unresolve comments, click the three dots (**...**) >> **Unresolve** button.

<br>
<img src="/images/comments-notifications/unresolve.png" class="gif-border"/>
<i>Figure 7: Unresolved comments.</i>

There is a special pink icon that appears on comments attached to annotations or drafts in the dropdown menu that indicates unresolved comments:

<br>
<img src="/images/comments-notifications/comment-pink.png" class="gif-border"> 
</br>
<i>Figure 8: Pink color check mark for unresolved comments.</i>


## Comments 

The **Comments** feature allows Annotators Reviewers and other higher roles to communicate and discuss queries on Label Studio Enterprise. Users will be notified of comments if they are associated with the task, and new comments will show up in the **Notifications** panel for a quick reference. Users can also filter and sort tasks by **Comments** status in the **Data Manager** view, such as finding tasks with unresolved comments from a particular user.

### Roles and Capabilities

#### All users

All users with access to Label Studio UI can do the following:

- Edit and delete own comments in a task.
- By default, you can see the comment section while annotating tasks.
- Add a comment by clicking on the input field and then typing your comment.
- Send and save the comment by clicking on the send (>) icon. 

#### Annotators 

As an **Annotator**, you can do the following:

- See comments from your annotations and drafts. 
- Resolve your own comments.

#### Reviewers and higher roles

As a **Reviewer**, you can do the following:

- See comments added by **Annotators** and other users.
- Resolve and unresolve own comments.
- Resolve and unresolve comments by others.

!!! note 

    - Comments added will trigger notifications.
    - Comments are created in context of an annotation.
    - All users with access to a project will receive notifications when a comment is added.


### Permissions 

Table 1 displays the three key user actions on the **Comments** feature.

<i> Table 1: User permissions.</i>

| Action          | Annotator | Reviewer and higher roles|
|-----------------|:---------:|:--------:|
| Add comment     | true      | true     |
| View comment    | true      | true     |
| Resolve comment | false     | true     |

### Project settings

You can make it mandatory to write comments when annotators click Skip on annotations. You can find it in Project Settings on the Annotation tab:
<br><img src="/images/comments-notifications/annotator-skip.png" class="gif-border"><br>

A similar option is available for reviewers. You can find it in Project Settings on the Review tab:
<br>
<img src="/images/comments-notifications/reviewer-reject.png" class="gif-border">
<br>


## Notifications 

To see the notifications, navigate and click the user profile icon on the top-right of the Label Studio UI.  The **Notifications** pane opens with a bell icon next to it. The blue color bell icon indicates unread notifications and the grey color bell icon indicates read notifications.

<br>
<img src="/images/comments-notifications/notifications.png" class="gif-border"/><br/>
<i>Figure 9: Notification panel.</i>


1. Navigate and click the user profile icon on the top-right of the Label Studio UI.
2. The **Notifications** pane opens on the right side of the Label Studio UI. 
3. To mark an individual notification as an unread notification, click on the three dots (**...**) >> **Mark as Unread** option. 
4. To mark all the notification as a read notification, click on the three dots (**...**) >> **Mark All as Read** option. 

!!! note
    The read notification has a gray color background which means a user has already read this notification.


