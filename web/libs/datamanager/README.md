# Data Manager

LabelStudio DataManager is a vital component within the Label Studio ecosystem, designed to efficiently manage and navigate through annotated data. It provides users with advanced capabilities to organize, filter, and browse their datasets seamlessly.


### Features

DataManager boasts several key features, enhancing data handling within Label Studio:

- Grid and List Views: Facilitate easy exploration of datasets.
- Customizable Data Representation: Tailor the visibility and presentation of your data.
- Advanced Data Filtering: Slice datasets with filters for precise exploration.
- Integration with Label Studio Frontend: Ensures cohesive functionality with the Label Studio Frontend.

### Environment Configuration:
#### Custom Configuration for DataManager:
- If you need to customize the configuration specifically for DataManager, follow these steps:
  - Duplicate the `.env.example` file located in the DataManager directory and rename the copy to `.env`.
  - Make your desired changes in this new `.env` file. The key configurations to consider are:
    - `NX_API_GATEWAY`: Set this to your API root. For example, `https://localhost:8080/api/dm`.
    - `LS_ACCESS_TOKEN`: This is the access token for Label Studio, which can be obtained from your Label Studio account page.
- This process allows you to have a customized configuration for DataManager, separate from the default settings in the .env.local files.


### Usage Instructions
DataManager provides specific scripts for operation and testing:

_Important Note: These scripts must be executed within the web folder or its subfolders. This is crucial for the scripts to function correctly, as they are designed to work within the context of the web directory's structure and dependencies._

- **`yarn dm:watch`: Build DataManager continuously.**
    - This script is essential for development. It continuously builds DataManager, allowing developers to see their changes in real-time within the Label Studio environment.
- **`yarn dm:unit`: Run unit tests on DataManager.**
    - Essential for maintaining code quality and reliability, particularly important in a collaborative development environment.

#### Events

DataManager integrates closely with Label Studio, handling various events:

```js
dm.on('submitAnnotation', () => /* handle the submit process */)
```

#### API endpoints

To have access to the backend DataManager uses endpoints. Every endpoint is converted into a named method that DM will use under the hood. Full list of those method could be found [here](#under-the-hood).

Every endpoint could be either a string or an object.

API endpoint paths also support `:[parameter-name]` notation, e.g. `/tabs/:tabID/tasks`. These parameters are required if specified. This means DM will throw an exception if the parameter is not present in the API call.

```js
// In this case DM will assume that api.columns() is a get request
apiEndpoints: {
  columns: "/api/columns",
}
```



For requests other than **GET** use object notation:

```javascript
// If you want to specify a method, use object instead
apiEndpoints: {
  updateTab: {
    path: "/api/tabs/:id",
    method: "post"
  }
}
```

###### Response conversion

```javascript
// In case you already have the api but the response doesn't fit the format expected by DM
// you can convert the response on the fly
apiEndpoints: {
  tabs: {
    path: "/api/tabs",
    convert: (response) => {
      /* do whatever you need with the response */
      /* then return the modified object */
      return response
    }
  }
}
```

###### Request mock

DataManager supports requests mocking. This feature comes handy for the development purposes.

```javascript
apiEndpoints: {
  columns: {
    path: "/api/columns",
    mock: (url, requestParams, request) => {
      // here you can process the request and return the response
      // execution of this method can be disabled by using `apiMockDisabled: true`
    }
  }
}
```


### Under the hood

- [Backend API][api_docs]
- [Architecture][dm_architecture]

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />

[api_docs]: docs/api_reference.md
[dm_architecture]: docs/dm_architecture_diagram.pdf
