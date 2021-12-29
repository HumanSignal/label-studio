## Feature flags modes

### Feature flags from file

1. Prepare `feature-flags.yml` file with flags:

    ```yml
    flagValues:
      ff-dev-123-some-fixed-issue-231221-short: true
      ff-dev-456-my-super-feature-010122-long: true
    ```
   
    Naming convention is presented [here](#feature-flags-namings)
    
    [Read more](https://docs.launchdarkly.com/sdk/features/flags-from-files#creating-a-flag-data-file) about extended format
    
2. Set variables:

    ```
    FEATURE_FLAGS_FROM_FILE=true
    FEATURE_FLAGS_FILE=feature-flags.yml
    ```
   

### Feature flags from environment

1. Prepare env variables using [proper namings](#feature-flags-namings), e.g.

    ```
    ff-dev-123-some-fixed-issue-231221-short=true
    ff-dev-456-my-super-feature-010122-long=true
    ```


### Production mode

1. Set `FEATURE_FLAGS_OFFLINE=false` (by default)



## Feature flags namings

`ff-<back|front|all>-<issue-id>-short-description-<date>-<short|long>`

- *short* - short-term flags
- *long* - permanent flags or killswitchers

(check best practices from [here](https://launchdarkly.com/blog/best-practices-short-term-permanent-flags/))


## Frontend feature flags

Feature flags JSON object is available on frontend via

```
window.APP_SETTINGS.feature_flags
```

To make use flags with LD client, [populate it with bootstap values](https://docs.launchdarkly.com/sdk/features/bootstrapping#javascript)
