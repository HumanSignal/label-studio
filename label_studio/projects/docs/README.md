# Projects
Projects app contains models and apis for serving Projects, Project Settings and Label stream pages.


### Task locks

 - if a task has a lock, this task will be shown in the beginning of the stream
 - locks are taken into account when the stream is evaluating (the rule is: tasks where annotation number + lock number >= overlap are skipped)
 - set lock in the end of the stream evaluation, before the task is shown to annotator

#### Task lock known issues
If lock was accuired and then overlap setting decreases, label steam can work not consistently. Already locked task can not be returned to the lock owner, or number of resulting annotations can be more, than overlap value
