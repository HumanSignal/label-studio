---
title: Multi user support
type: guide
order: 950
---


## Multisession mode

You can start Label Studio in _multisession mode_ - each browser session creates it's own project with associated session ID as a name.

In order to launch Label Studio in multisession mode and keep all projects in a separate directory `session_projects`, run

```bash
label-studio start-multi-session --root-dir ./session_projects
```

## Auth with login and password
You can restrict the access for LS instance with the basic HTTP auth.

```
label-studio start my_project --username user --password pwd 
```

Or put `username` and `password` in the project config.json.
 
```
{ 
 ...
 "username": "user", 
 "password": "pwd",
 ...
}
```

> For docker you need to setup environment variables `USERNAME` and `PASSWORD`

It will be the same username and password for all the users.