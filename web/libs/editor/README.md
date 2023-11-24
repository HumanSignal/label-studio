# Label Studio Frontend

Label Studio Frontend (LSF) is a crucial module of the Label Studio ecosystem, pivotal in driving the entire annotation flow. It's a front-end-only module, combining a user interface for annotation creation with a data layer that standardizes the annotation format. Every manual annotation in Label Studio has been crafted using LSF, making it integral to the system.

### Usage Instructions

LSF provides specific scripts for operation and testing:

_Important Note: These scripts must be executed within the web folder or its subfolders. This is crucial for the scripts to function correctly, as they are designed to work within the context of the web directory's structure and dependencies._

- **`yarn lsf:watch`: Build LSF continuously**
  - Crucial for development, this script continuously builds Label Studio Frontend (LSF), allowing developers to observe their changes in real-time within the Label Studio environment.
- **`yarn lsf:serve`: Run LSF standalone**
  - To run Label Studio Frontend in standalone mode. Visit http://localhost:3000 to use the application in standalone mode.
- **`yarn lsf:e2e`: Execute end-to-end (e2e) tests on LSF**
  - To run comprehensive e2e tests, ensuring the frontend works as expected from start to finish. The Label Studio environment must be running, typically at `http://localhost:8080`.
- **`yarn lsf:integration`: Run integration tests**
  - To conduct integration tests using Cypress, verifying that different parts of LSF work together correctly. The LSF in standalone mode (`yarn lsf:serve`) must be running.
- **`yarn lsf:integration:ui`: Run integration tests in UI mode**
  - Facilitates debugging during integration tests by running them in a UI mode, allowing you to visually track what is being tested. The LSF in standalone mode (`yarn lsf:serve`) must be running.
- **`yarn lsf:unit`: Run unit tests on LSF**
  - Essential for maintaining code quality and reliability, especially in collaborative development.

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />
