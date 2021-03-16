---
title: Start Label Studio
type: guide
order: 202
---

After you install Label Studio, start the server to start using it. 

```bash
label-studio start
```

By default, Label Studio starts with a SQLite database to store labeling tasks and annotations. You can specify different source and target storage for labeling tasks and annotations using Label Studio UI or the API. See [Sync data from cloud or database storage](storage.html) for more.

## Labeling performance 

The SQLite database works well for projects with tens of thousands of labeling tasks. If you want to annotate millions of tasks or anticipate a lot of concurrent users, use a PostgreSQL database. See [Sync data from cloud or database storage](storage.html) for more.  

For example, if you import data while labeling is being performed, labeling tasks can take more than 10 seconds to load and annotations can take more than 10 seconds to perform.

## Command line arguments for starting Label Studio

You can specify project config, machine learning backend and other options using the command line interface. Run `label-studio start --help` to see all available options. Many command line arguments are deprecated and removed in version 1.0.0. 

## Run Label Studio with an external domain name

If you want multiple people to collaborate on a project, you might want to run Label Studio with an external domain name. 

To do that, use the `host`, `protocol`, `port` parameters when you start Label Studio. These parameters ensure that the correct URLs are created when importing resource files (images, audio, etc) and generating labeling tasks.   

There are several possible ways to run Label Studio with an external domain name.
 
- Replace the host, protocol, and port parameters in the `project/config.json` file, or or `label_studio/utils/schema/default_config.json` in the Label Studio package directory.
- Specify the parameters when you start Label Studio: `label-studio start --host label-studio.example.com --protocol http:// --port 8080`.
- For Docker installations, specify the parameters as environment variables `HOST`, `PROTOCOL`, `PORT` when setting up Docker. If your external host has a port, e.g.: `77.77.77.77:1234` then you have to specify HOST with the port together `HOST=77.77.77.77:1234`. 

> The Label Studio web server always uses the `0.0.0.0` address to start. If you need to change it to `localhost`, set host to `localhost` and the web server starts at `localhost`.  


## Set up task sampling for your project 

When you start Label Studio, you can define the way of how your imported tasks are exposed to annotators by setting up task sampling. To enable task sampling, specify one of the sampling option with the `--sampling=<option>` command line argument when you start Label Studio. 

The following table lists the available sampling options: 

| Option | Description |
| --- | --- | 
| sequential | Default. Tasks are shown to annotators in ascending order by the `id` field. |
| uniform | Tasks are sampled with equal probabilities. |
| prediction-score-min | Tasks with the minimum average prediction score are shown to annotators. To use this option, you must also include predictions data in the task data that you import into Label Studio. |
| prediction-score-max | Tasks with the maximum average prediction score are shown to annotators. To use this option, you must also include predictions data in the task data that you import into Label Studio. |

