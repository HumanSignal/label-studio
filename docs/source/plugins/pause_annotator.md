---
title: Spam and Bot Detection
type: plugins
category: Automation
cat: automation
order: 20
meta_title: Spam and Bot Detection
meta_description: Pauses an annotator if bot behavior in detected
tier: enterprise
---

<img src="/images/plugins/pause-thumb.png" alt="" class="gif-border" style="max-width: 552px !important;" />

!!! note
     For information about modifying this plugin or creating your own custom plugins, see [Customize and Build Your Own Plugins](custom).

     For general plugin information, see [Plugins for projects](/guide/plugins) and [Plugin FAQ](faq).

## About

You can manually [pause an annotator](/guide/quality#Pause-an-annotator) to prevent stop them from completing tasks and revoke their project access. 

This script automatically pauses an annotator who breaks any of the following rules and customizes the message that appears:

* Too many duplicate values `timesInARow(3)`:

    Checks if the last three submitted annotations in the `TextArea` field (`comment`) all have the same value. If they do, it returns a custom warning message. 

    ![Screenshot of warning](/images/plugins/pause1.png)

* Too many similar values `tooSimilar()`: 

    For the `Choices` options (`sentiment`), it computes a deviation over the past values. If the deviation is below a threshold (meaning the values are too uniform/similar), it returns a custom warning message. 

    ![Screenshot of warning](/images/plugins/pause2.png)
 
* Too many submissions over a period of time `tooFast()`: 

    Monitors the overall speed of annotations. It checks if, for example, 20 annotations were submitted in less than 10 minutes. If so, a custom warning appears. 

    ![Screenshot of warning](/images/plugins/pause3.png)

To unpause an annotator, use the [Members dashboard](/guide/quality#Pause-an-annotator). 

!!! info Tip

    If you hover over the **Paused** indicator, you can see the message that was shown to the user when they were paused. If a user was manually paused, it also shows who initiated the action.  

    ![Screenshot of hover](/images/plugins/pause_hover.png)

## Plugin

```javascript
/**
 * Defines a set of rules the annotator must follow so good quality can be guaranteed. If the rules are not follow,
 * it will pause the annotator
 */

/**
 * Rules configuration for pausing the annotation
 *
 * `fields` describe per-field rules in a format
 *   <field-name>: [<rule>(<optional params for the rule>)]
 * `global` is for rules applied to the whole annotation
 */
const RULES = {
	fields: {
		comment: [timesInARow(3)],
		sentiment: [tooSimilar()],
	},
	global: [tooFast()],
};

/**
 * Messages for users when they are paused.
 *
 * Each message is a function with the same name as original rule and it receives an object with
 * `items` and `field`.
 */
const MESSAGES = {
	timesInARow: ({ field }) => `Too many similar values for ${field}`,
	tooSimilar: ({ field }) => `Too similar values for ${field}`,
	tooFast: () => "Too fast annotations",
};

/**
 * All Available rules are below.
 *
 * They receive params and return function which receives `items` and optional `field`.
 * If condition is met it returns warning message. If not — returns `false`.
 */

/**
 * Validates if values for the `field` in last `times` items are the same
 */
function timesInARow(times) {
	return (items, field) => {
		if (items.length < times) return false;
		const last = String(items.at(-1).values[field]);
		return items
			.slice(-times)
			.every((item) => String(item.values[field]) === last)
			? MESSAGES.timesInARow({ items, field })
			: false;
	};
}

/**
 * Validates if the annotations are too similar (`deviation`) with the given frequency (`max_count`)
 */
function tooSimilar(deviation = 0.1, max_count = 10) {
	return (items, field) => {
		if (items.length < max_count) return false;
		const values = items.map((item) => item.values[field]);
		const points = values.map((v) => values.indexOf(v));
		return calcDeviation(points) < deviation
			? MESSAGES.tooSimilar({ items, field })
			: false;
	};
}

/**
 * Validates the annotations are less than `times` in the given time window (`minutes`)
 */
function tooFast(minutes = 10, times = 20) {
	return (items) => {
		if (items.length < times) return false;
		const last = items.at(-1);
		const first = items.at(-times);
		return last.created_at - first.created_at < minutes * 60
			? MESSAGES.tooFast({ items })
			: false;
	};
}

/**
 * Internal code for calculating the deviation and provide faster accessors
 */
const project = DM.project?.id;
if (!project) throw new Error("Project is not initialized");

const key = ["__pause_stats", project].join("|");
const fields = Object.keys(RULES.fields);
// { sentiment: ["positive", ...], comment: undefined }
const values = Object.fromEntries(
	fields.map((field) => [field, DM.project.parsed_label_config[field]?.labels]),
);

// simplified version of MSE with normalized x-axis
function calcDeviation(data) {
	const n = data.length;
	// we normalize indices from -n/2 to n/2 so meanX is 0
	const mid = n / 2;
	const mean = data.reduce((a, b) => a + b) / n;

	const k =
		data.reduce((a, b, i) => a + (b - mean) * (i - mid), 0) /
		data.reduce((a, b, i) => a + (i - mid) ** 2, 0);
	const mse =
		data.reduce((a, b, i) => a + (b - (k * (i - mid) + mean)) ** 2, 0) / n;

	return Math.abs(mse);
}

// When triggering the submission of the annotation, it will check the annotators are following the predefined `RULES`
// and they will be paused otherwise
LSI.on("submitAnnotation", async (_store, annotation) => {
	const results = annotation.serializeAnnotation();
	// { sentiment: "positive", comment: "good" }
	const values = {};
	for (const field of fields) {
		const value = results.find((r) => r.from_name === field)?.value;
		if (!value) return;
		if (value.choices) values[field] = value.choices.join("|");
		else if (value.text) values[field] = value.text;
	}
	let stats = [];
	try {
		stats = JSON.parse(localStorage.getItem(key)) ?? [];
	} catch (e) {
		// Ignore parse errors
	}
	stats.push({ values, created_at: Date.now() / 1000 });

	for (const rule of RULES.global) {
		const result = rule(stats);

		if (result) {
			localStorage.setItem(key, "[]");

			try {
				await pause(result);
			} catch (error) {
				Htx.showModal(error.message, "error");
			}
			return;
		}
	}

	for (const field of fields) {
		if (!values[field]) continue;
		for (const rule of RULES.fields[field]) {
			const result = rule(stats, field);

			if (result) {
				localStorage.setItem(key, "[]");

				try {
					await pause(result);
				} catch (error) {
					Htx.showModal(error.message, "error");
				}
				return;
			}
		}
	}

	localStorage.setItem(key, JSON.stringify(stats));
});

/**
 * Sends a request to the API to pause an annotator
 */
async function pause(verbose_reason) {
	const body = {
		reason: "CUSTOM_SCRIPT",
		verbose_reason,
	};
	const options = {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
	const response = await fetch(
		`/api/projects/${project}/members/${Htx.user.id}/pauses`,
		options,
	);
	if (!response.ok) {
		throw new Error(
			`Error pausing the annotator: ${response.status} ${response.statusText}`,
		);
	}

	const data = await response.json();
	return data;
}
```

**Related LSI instance methods:**

* [on(eventName, handler)](custom#LSI-on-eventName-handler)
  
**Related frontend events:**

* [submitAnnotation](/guide/frontend_reference#submitAnnotationn)

## Labeling config

This labeling config presents users with text and asks them to:

* Provide a sentiment value using `<Choices>`
* Comment on their reasoning using `<TextArea>`

```xml
<View>
  <Text name="text" value="$text"/>
  <View style="box-shadow: 2px 2px 5px #999; padding: 20px; margin-top: 2em; border-radius: 5px;">
    
    <Header value="What is the sentiment of this text?" />
    <Choices name="sentiment" toName="text" choice="single" showInLine="true">
      <Choice value="positive" hotkey="1" />
      <Choice value="negative" hotkey="2" />
      <Choice value="neutral" hotkey="3" />
    </Choices>

    <Header value="Why?" />
    <TextArea name="comment" toName="text" rows="4" placeholder="Add your comment here..." />
  
  </View>
</View>

```

**Related tags:**

* [View](/tags/view.html)
* [Text](/tags/text.html)
* [Header](/tags/header.html)
* [Choices](/tags/choices.html)
* [TextArea](/tags/textarea.html)

## Sample data

```json
[
  {
    "data": {
      "text": "I recently purchased a portable Bluetooth speaker and have been impressed with its clear sound and long battery life. The speaker is compact and easy to use, making it perfect for outdoor adventures."
    }
  },
  {
    "data": {
      "text": "I bought a smartwatch from this vendor and it has exceeded my expectations. The device offers an intuitive user interface and tracks my daily activities accurately while looking very stylish on my wrist."
    }
  },
  {
    "data": {
      "text": "I ordered a pair of noise-cancelling headphones and they don't do anything to cancel out noise. Waste of money."
    }
  }
]
```
