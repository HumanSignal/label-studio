# Label Studio Frontend

Label Studio Frontend (LSF) is a crucial module of the Label Studio ecosystem, pivotal in driving the entire annotation flow. It's a front-end-only module, combining a user interface for annotation creation with a data layer that standardizes the annotation format. Every manual annotation in Label Studio has been crafted using LSF, making it integral to the system.

### Key Features

Label Studio Frontend is packed with features designed to enhance the annotation process:

- **Customizable Labeling Interfaces:** Create tailored interfaces for different data types like text, images, audio, and video using configurable templates.
- **Multi-Format Support:** Annotate diverse datasets, including images, text, audio, and video files.
- **Interactive Annotation Tools:** Utilize tools like bounding boxes, polygons, keypoints, and brush tools for images; text highlight tools for text; and time-series labeling for audio/video.
- **Real-Time Collaboration:** Enables simultaneous work on projects by multiple annotators.
- **Data Filtering and Sorting:** Sort and filter data for prioritized tasks or specific data reviews.
- **Integration with Machine Learning Models:** Connect with ML models for pre-labeling and active learning.
- **Extensibility and Customization:** Enhance functionality with custom scripts and integrate with external tools.

### Usage Instructions

DataManager provides specific scripts for operation and testing:

- **`yarn lsf:watch`: Build LSF continuously**
  - Crucial for development, this script continuously builds Label Studio Frontend (LSF), allowing developers to observe their changes in real-time within the Label Studio environment.
- **`yarn lsf:serve`: Run LSF standalone**
  - To run Label Studio Frontend in standalone mode. Visit http://localhost:3000 to use the application in standalone mode.
- **`yarn lsf:e2e`: Execute end-to-end (e2e) tests on LSF**
  - To run comprehensive e2e tests, ensuring the frontend works as expected from start to finish. The Label Studio environment must be running, typically at `http://localhost:8080`.
- **`yarn lsf:integration`: Run integration tests**
  - To conduct integration tests using Cypress, verifying that different parts of LSF work together correctly.
- **`yarn lsf:integration`: Run integration tests in UI mode**
  - Facilitates debugging during integration tests by running them in a UI mode, allowing you to visually track what is being tested.
- **`yarn lsf:unit`: Run unit tests on LSF**
  - Essential for maintaining code quality and reliability, especially in collaborative development.

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />
