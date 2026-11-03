---
title: Hotkeys
short: Hotkeys
tier: all
type: guide
order: 138
order_enterprise: 138
meta_title: Hotkeys in Label Studio
section: "Create & Manage Projects"
parent: "labeling"
parent_enterprise: "labeling"
date: 2025-05-24 17:19:21
---

Use keyboard shortcuts, or hotkeys, to improve your labeling performance. 

For drawing labels (such as brush and rectangle labels), pressing a label hotkey
clears the current region selection and selects the label for the next region.
Existing regions keep their labels, including when you press the same label hotkey
again. Finish the current stroke or shape before switching: label hotkeys are
ignored while drawing is in progress.

To correct an existing region's label, select the region and click the desired
label with the mouse.

## View out-of-the-box hotkeys

From the labeling editor, click the settings icon to see more details about hotkeys or to enable or disable hotkeys. 

![Screenshot of settings icon](/images/label/settings.png)

!!! info Tip
    If `enter` is specified and you have a Mac keyboard, use `return` instead. Use `delete` instead of `backspace`, and `option` instead of `alt`.

## Customize global hotkeys from your account page

You can easily customize global hotkeys on from the [**Account & Settings > Hotkeys** page](user_account#Hotkeys). 

![Screenshot of customized key](/images/admin/global-hotkeys.png)

## Customize global hotkeys using environment variables

If you want to change the hotkeys used for specific actions, set the `EDITOR_KEYMAP` environment variable with valid JSON in your `.env` file or when starting Label Studio. For example, to change the keyboard shortcut used to submit an annotation to `shift` + `s`, set the environment variable as follows:
```
EDITOR_KEYMAP='{"annotation:submit":{"key": "shift+s","description": "My Custom Submit Hotkey!"}}'
```
This overwrites the existing hotkey mapping with your custom mapping. See [more about how to set environment variables](https://labelstud.io/guide/start#Set-environment-variables). 

Refer to the full list of customizable hotkeys in the [`keymap.json` file](https://github.com/HumanSignal/label-studio/blob/develop/web/libs/editor/src/core/settings/keymap.json) to update a different hotkey combination. 

You cannot use this environment variable to remove an existing or add a new keyboard shortcut. 

## Use the `<Shortcut>` tag

Use the [Shortcut tag](/tags/shortcut) to allow annotators to insert a predefined text snippet into their current annotation. 

They can do this by either clicking the shortcut button or by pressing its hotkey. 

!!! info Tip
    Shortcuts work inside control tags (e.g., `<TextArea>`, `<Labels>`)

For example, use the following to insert predefined text into a text area:

```html
<View>
  <Image name="image" value="$captioning"/>
  <Header value="Describe the image:"/>
  <TextArea name="caption" toName="image">
    <!-- Inserts “CAR” when clicked or on Ctrl+1 -->
    <Shortcut alias="Car" value="CAR" hotkey="ctrl+1" background="#333333"/>
    <!-- Inserts “AIRPLANE” when clicked or on Ctrl+2 -->
    <Shortcut alias="Airplane"   value="AIRPLANE"   hotkey="ctrl+2" background="#FFEE00"/>
  </TextArea>
</View>
```
