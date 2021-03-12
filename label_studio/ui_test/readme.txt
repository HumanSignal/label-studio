UI Automation for Label-studio

What we have?
_Automation script
_testCases.txt file
_files for import (jpg, png, txt, …)

testCases.txt file contains all needed types(Like: image, font, common formats, audio, html, time series)
And also it contains appropriate formats for each type (Example: jpg, png for image)
the symbol ‘+’ means that current format will be tested
the symbol ‘-‘ means that current format will not be tested

[testCases.txt file]
=====image=====
+jpg
+png
-gif
----------
=====font=====
+txt
----------
=====common formats=====
+csv
-tsv
-txt
+json


Automation script parses the file ‘testCases.txt’ and takes choosed formats for testing
Script opened browser and goes to page settings(by clicking on buttons if needed)
Here script parsed web page and takes all templates for each file-type

After begins looping throgh formats…
  for each format will begins looping through templates…
     and will be executed Labeling process


Old Labeling process were:
 (Setup->Import->Labeling->Export)
-Goes to welcome page and doing click on import button (If there were imported some file perviously, then will go to page Tasks)
-Importing chooses file and goes to page Tasks
-Clicking on Label button on Tasks page and goes to page Settings
-Clicking on appropriate template on Settings page and doing click on Save button
-Clicking on Submit button for confirmation

New Labeling process is:
 (Import->Tasks->Setup ->Tasks->Export)
-Open app (automatically we will be redirected to page Import)
-Click on Import button
-Choose image file for uploading
-Click on Import button (after that we will be redirected to page Tasks)

-Clicking on "Label" button on Tasks page
-Clicking on "Go to setup" button on the appeared popup window (after that we will be redirected to page Settings)

-Clicking on appropriate template on Settings page
-Clicking on "Proceed" button on the appeared popup window
-Clicking on "Save" button
-Clicking on "Explore Tasks" button on the appeared popup window "Label config saved!" (after that we will be redirected to page Tasks)

-Clicking on "Label" button on Tasks page
-Clicking on "Submit" button for confirmation

-Clicking on checkbox for choose complated task
-Clicking on "Delete tasks" button
-Clicking on "Ok" button on the appeared popup window "Destructive action" (after that complated task will be deleted)
-Clicking on "Import" button (after that we will be redirected to page Import)





