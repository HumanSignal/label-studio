## Feature flags modes

### Feature flags from environment

1. Prepare env variables using [proper namings](#feature-flags-namings), export these environment variables.

    ```
    ff_back_dev_123_some_fixed_issue_231221_short=true
    ff_front_dev_456_my_super_feature_010122_long=true
    ```
   or run label-studio this way: 
   ```
   ff_back_dev_123_some_fixed_issue_231221_short=true label-studio 
   ```


### Feature flags from file

1. Prepare `feature_flags.yml` file with flags:

    ```yml
    flagValues:
      ff_back_dev_123_some_fixed_issue_231221_short: true
      ff_front_dev_456_my_super_feature_010122_long: true
    ```
   
    Naming convention is presented [here](#feature-flags-namings)
    
    [Read more](https://docs.launchdarkly.com/sdk/features/flags_from_files#creating_a_flag_data_file) about extended format
    
2. Set variables:

    ```
    FEATURE_FLAGS_FROM_FILE=true
    FEATURE_FLAGS_FILE=feature_flags.yml
    ```

### Production mode

1. Set `FEATURE_FLAGS_OFFLINE=false` (by default)



## Feature flags namings

`fflag_<back|front|all>_<issue_id>_short_description_<date>_<short|long>`

- *short*: short_term flags
- *long*: permanent flags or killswitchers

(check best practices from [here](https://launchdarkly.com/blog/best-practices-short-term-permanent-flags/))


## How to use

### Backend development

```python
from core.feature_flags import flag_set

if flag_set('ff_back_dev_123_new_feature_231221_long', request.user):
    run_new_code()
else:
    run_old_code()
```


### Frontend development

Feature flags JSON object is available on frontend via

```
window.APP_SETTINGS.feature_flags
```

To make use flags with LD client, [populate it with bootstrap values](https://docs.launchdarkly.com/sdk/features/bootstrapping#javascript)
