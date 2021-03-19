---
title: Start Label Studio
type: guide
order: 202
---

After you install Label Studio, start the server to start using it. 

```bash
label-studio start
```

By default, Label Studio starts with a SQLite database to store labeling tasks and annotations. You can specify different source and target storage for labeling tasks and annotations using Label Studio UI or the API. See [Database storage](install.html#Database-storage) for more.

## Labeling performance 

The SQLite database works well for projects with tens of thousands of labeling tasks. If you want to annotate millions of tasks or anticipate a lot of concurrent users, use a PostgreSQL database. See [Install and upgrade Label Studio](install.html#PostgreSQL-database) for more.  

For example, if you import data while labeling is being performed, labeling tasks can take more than 10 seconds to load and annotations can take more than 10 seconds to perform. If you want to label more than 100,000 tasks with 5 or more concurrent users, consider using PostgreSQL or another database with Label Studio. 

## Command line arguments for starting Label Studio

You can specify project config, machine learning backend and other options using the command line interface. Run `label-studio start --help` to see all available options. Many command line arguments are deprecated and removed in version 1.0.0. 

* The Label Studio web server always uses the `0.0.0.0` address to start. If you need to change it to `localhost`, set `--internal-host` from console arguments to `localhost` and the web server starts at `localhost`.

* You can use the `--port` or `PORT` environment var to set port for Label Studio web server. 

## Run Label Studio with an external domain name

If you want multiple people to collaborate on a project, you might want to run Label Studio with an external domain name. 

To do that, use the `host` parameter when you start Label Studio. These parameters ensure that the correct URLs are created when importing resource files (images, audio, etc) and generating labeling tasks.   

There are several possible ways to run Label Studio with an external domain name.
 
- Replace the `host` parameter in the file which you specified with `--config` option. If you don't use `--config` then edit `label_studio/utils/schema/default_config.json` in the Label Studio package directory.
- Specify the parameters when you start Label Studio: `label-studio start --host http://your.domain.com/ls-root`.
- Specify the parameters as environment variables `HOST` especially when setting up Docker: `HOST=https://your.domain.com:7777`. 

> Don't forget to specify protocol: `http://` or `https://`

> If your external host has a port, e.g.: `http://77.77.77.77:1234` then you have to specify HOST with the port together `HOST=http://77.77.77.77:1234`. 

## Set up task sampling for your project 

When you start Label Studio, you can define the way of how your imported tasks are exposed to annotators by setting up task sampling. To enable task sampling, specify one of the sampling option with the `--sampling=<option>` command line argument when you start Label Studio. 

The following table lists the available sampling options: 

| Option | Description |
| --- | --- | 
| sequential | Default. Tasks are shown to annotators in ascending order by the `id` field. |
| uniform | Tasks are sampled with equal probabilities. |
| prediction-score-min | Tasks with the minimum average prediction score are shown to annotators. To use this option, you must also include predictions data in the task data that you import into Label Studio. |
| prediction-score-max | Tasks with the maximum average prediction score are shown to annotators. To use this option, you must also include predictions data in the task data that you import into Label Studio. |

