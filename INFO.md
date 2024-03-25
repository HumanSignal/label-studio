
## To run
python label_studio/manage.py migrate - This command is needed for the application to use the database and need to be re run when makeing changes to tables and attributes
python label_studio/manage.py collectstatic - This command is needed for the application to see static files and needs to be re run if static files are changed
# Start the server in development mode at http://localhost:8080
python label_studio/manage.py runserver


## Folder breakdown

/deploy
Deployment scripts are found here

/images
Static files such as images are found in this folder for refrence in html files (NOT USED BY REACT)

/label_sudio
This is where blueprints are found

/docs 
This is where documentation is stored

/web
This is where the REACT front end is located

/scripts 
Deployment scripts are found here also


## Blueprints

/annotation_templates
where the classes for a project are defined

/core

/data_export

/data_import

/data_manager
Where all filtering api sit

/frontend

/io_storages

/labels_manager

/ml

/ml_model_providers

/ml_models

/organizations

/projects
Where project api sits

/tasks

/templates

/users

/webhooks