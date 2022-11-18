---
title: Comments and notifications 
short: Comments and notifications
tier: enterprise
type: guide
section: 
order: 150
meta_title: Comment and notification systems in Label Studio
meta_description: The Comments and Notifications feature defines how annotators, reviewers and administrators communicate and receive updates on projects and tasks.
---

Annotators, reviewers, and administrators can use comments to do the following:

- Speed up the labeling process
- Increase the annotation quality
- Build more solid labeling and review processes

Users can discuss task issues and other problems that happen during labeling and reviewing processes using Comments and Notifications in Label Studio Enterprise.

- [Comments](#comments).
- [Notifications](#notifications).

## Comments 

The **Comments** feature allows the Annotators and Reviewers to communicate and discuss queries on Label Studio Enterprise. Users will be notified of comments if they are associated with the task, and new comments will show up in the **Notifications** panel for a quick reference. Users can also filter and sort tasks by **Comments** status in the **Data Manager** view, such as finding tasks with unresolved comments from a particular user.


### Roles and Capabilities

#### All users

All users with access to Label Studio UI can do the following:

- Edit and delete your own comments in a task.
- By default, you can see the comment section while annotating tasks.
- Add a comment by clicking on the input field and then typing your comment.
- Send the comment by clicking on the send (>) icon. 

#### Annotators 

As an **Annotator**, you can do the following:

- See comments from your annotations and drafts. 
- Resolve your own comments.

#### Reviewers

As a **Reviewer**, you can do the following:

- See comments added by **Annotators** and other **Reviewers**.
- Resolve your comments.
- Resolve comments by others. 
- **Unresolve** a comment that has been previously resolved by yourself or others. 
- View other annotations for the task, which will show relevant comments.
- Collapse sections in the panel so that you have more space for other content and sections. By default, all sections are visible.

!!! note 

    - Comments added will trigger notifications.

    - Comments are created in context of an annotation.

    - Comments display in order from most recent at the top of the list and all previous will display subsequently below.

    - All users with access to a project will receive notifications when a comment is added or resolved per task.


### Permissions 

Table 1 displays the three key user actions on the **Comments** feature.

<i> Table 1: User permissions.</i>

| Action          | Annotator | Reviewer |
|-----------------|:---------:|:--------:|
| Add comment     | true      | true     |
| View comment    | true      | true     |
| Resolve comment | false     | true     |


### Explore the Comments feature

You can add comments to tasks independent of annotation and action such as **Skip** or **Accept**.
  
1. In the Label Studio UI, navigate to your project page.

<br>
<div style="margin:auto; text-align:center;"><img src="/images/project-page.png" style="opacity: 0.8"/></div>
<i>Figure 1: Project Page. </i>

2. Click on the **Columns** drop-down to filter the columns based on the following:

<br>
<div style="margin:auto; text-align:center;"><img src="/images/columns.png" style="opacity: 0.8"/></div>
<i>Figure 2: Columns drop-down.</i>

- **Comments**: Total number of comments for a particular task.

<br>
<div style="margin:auto; text-align:center;"><img src="/images/comments.png" style="opacity: 0.8"/></div>
<i>Figure 3: Comments column.</i>

- **Unresolved comments**: Comments that are not yet resolved. The total number of unresolved comments are displayed in this column. 
- **Resolved comments**: Comments can be resolved and is visible to others. The total number of resolved comments are displayed in this column. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/unresolved-comments.png" style="opacity: 0.8"/></div>
<i>Figure 4: Unresolved comments column.</i>

- **Commented at**: The date and time at which the comment was made. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/commented-at.png" style="opacity: 0.8"/></div>
<i>Figure 5: Commented at.</i>


Now, you can also filter by the number of comments and comments added or resolved by the authors using the **Filter** drop-down located next to the **Columns** drop-down. Figure 6 displays the list of tasks where the unresolved comments is less than or equal to 2 and the comment author name contains AN. You can add more filters to display tasks based on your filtering requirements. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/comment-by-author-filter.png" style="opacity: 0.8"/></div>
<i>Figure 6: Filter to comment by author.</i>

Use the **Pin to sidebar** button (>) to shift the filtering to the right side of the UI. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/pin-to-sidebar.png" style="opacity: 0.8"/>
</div>
<i>Figure 7: Pin to sidebar button. </i>

Click the (<) button to resume back to the normal filtering view. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/pin-to-sidebar-right.png" style="opacity: 0.8"/></div>
<i>Figure 8: Pin to sidebar moved to the right. </i>

To resolve comments, click on a task and on the right side of the window you will see the **Comments** section where you can add a comment or click the three dots (**...**) to resolve or unresolve comments. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/resolve.png" style="opacity: 0.8"/></div>
<i>Figure 9: Resolve comments.</i>

When you click **Resolve**, you will see a green color check mark next to your comment. This represents a resolved comment.

<br>
<div style="margin:auto; text-align:center;"><img src="/images/resolved-comment-green-tick-mark.png" style="opacity: 0.8"/></div>
<i>Figure 10: Green color check mark for resolved comments.</i>

To unresolve comments, click the three dots (**...**) >> **Unresolve** button.

<br>
<div style="margin:auto; text-align:center;"><img src="/images/unresolve.png" style="opacity: 0.8"/></div>
<i>Figure 11: Unresolved comments</i>






## Notifications 

To see the notifications, navigate and click the user profile icon on the top-right of the Label Studio UI.  The **Notifications** pane opens with a bell icon next to it. The blue color bell icon indicates unread notifications and the grey color bell icon indicates read notifications.

<br>
<div style="margin:auto; text-align:center;"><img src="/images/notifications.png" style="opacity: 0.8" class="gif-border"/></div>
<i>Figure 12: Notifications pane.</i>

### Roles and Capabilities

All users with access to Label Studio UI can do the following:

- Manage notifications about a comment on a specific task.
- See notifications for tasks that I have access to.
- Notifications about actions performed on comments by others.
- View a menu for options to mark an individual notification or all notifications as read or unread. 
- Navigate to a particular task to view the comment in the annotation rather than clicking the link on the notification. 
- Click on the link on the notification to go to the task annotation.
- Move to the next comment by using the notifications panel to process all comments. 

### Explore the Notifications feature

1. Navigate and click the user profile icon on the top-right of the Label Studio UI.
2. The **Notifications** pane opens on the right side of the Label Studio UI. 
3. To mark an individual notification as an unread notification, click on the three dots (**...**) >> **Mark as Unread** option. 

!!! note 
    In Figure 13, the read notification has a grey color background which means a user has already read this notification.

<br>
<div style="margin:auto; text-align:center;"><img src="/images/mark-as-unread.png" style="opacity: 0.8"/></div>
<i>Figure 13: Mark as unread notification.</i>

Now, the notification has a blue color background and is unread. 
<br>
<div style="margin:auto; text-align:center;"><img src="/images/unread-notification.png" style="opacity: 0.8"/></div>
<i>Figure 14: Unread notification.</i>

!!! note
    You can switch between **Mark as read** and **Mark as Unread** options for each individual or all notifications. 


4. To mark all the notification as a read notification, click on the three dots (**...**) >> **Mark All as read** option. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/mark-all-as-read.png" style="opacity: 0.8"/></div>
<i>Figure 15: Mark all as read notification.</i>


Now, all the notification has a grey color background and are read notifications. 

<br>
<div style="margin:auto; text-align:center;"><img src="/images/read-notification.png" style="opacity: 0.8"/></div>
<i>Figure 16: Read notification.</i>


