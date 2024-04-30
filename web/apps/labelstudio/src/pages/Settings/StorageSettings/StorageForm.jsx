import { forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components";
import { InlineError } from "../../../components/Error/InlineError";
import { Form, Input } from "../../../components/Form";
import { Oneof } from "../../../components/Oneof/Oneof";
import { ApiContext } from "../../../providers/ApiProvider";
import { Block, Elem } from "../../../utils/bem";
import { isDefined } from "../../../utils/helpers";

export const StorageForm = forwardRef(({ onSubmit, target, project, rootClass, storage, storageTypes }, ref) => {
  /**@type {import('react').RefObject<Form>} */
  const api = useContext(ApiContext);
  const formRef = ref ?? useRef();
  const [type, setType] = useState(storage?.type ?? storageTypes?.[0]?.name ?? "s3");
  const [checking, setChecking] = useState(false);
  const [connectionValid, setConnectionValid] = useState(null);
  const [formFields, setFormFields] = useState([]);

  useEffect(() => {
    api
      .callApi("storageForms", {
        params: {
          target,
          type,
        },
      })
      .then((formFields) => setFormFields(formFields ?? []));
  }, [type]);

  const storageTypeSelect = {
    columnCount: 1,
    fields: [
      {
        skip: true,
        type: "select",
        name: "storage_type",
        label: "Storage Type",
        disabled: !!storage,
        options: storageTypes.map(({ name, title }) => ({
          value: name,
          label: title,
        })),
        value: storage?.type ?? type,
        onChange: (e) => {
          setType(e.target.value);
        },
      },
    ],
  };

  const validateStorageConnection = useCallback(async () => {
    setChecking(true);
    setConnectionValid(null);

    const form = formRef.current;

    if (form && form.validateFields()) {
      const body = form.assembleFormData({ asJSON: true });
      const type = form.getField("storage_type").value;

      if (isDefined(storage?.id)) {
        body.id = storage.id;
      }

      // we're using api provided by the form to be able to save
      // current api context and render inline erorrs properly
      const response = await form.api.callApi("validateStorage", {
        params: {
          target,
          type,
        },
        body,
      });

      if (response !== null) setConnectionValid(true);
      else setConnectionValid(false);
    }
    setChecking(false);
  }, [formRef, target, type, storage]);

  const action = useMemo(() => {
    return storage ? "updateStorage" : "createStorage";
  }, [storage]);

  return (
    <Form.Builder
      ref={formRef}
      action={action}
      params={{ target, type, project, pk: storage?.id }}
      fields={[storageTypeSelect, ...(formFields ?? [])]}
      formData={{ ...(storage ?? {}) }}
      skipEmpty={false}
      onSubmit={onSubmit}
      autoFill="off"
      autoComplete="off"
    >
      <Input type="hidden" name="project" value={project} />
      <Form.Actions
        valid={connectionValid}
        extra={
          connectionValid !== null && (
            <Block name="form-indicator">
              <Oneof value={connectionValid}>
                <Elem tag="span" mod={{ type: "success" }} name="item" case={true}>
                  Successfully connected!
                </Elem>
                <Elem tag="span" mod={{ type: "fail" }} name="item" case={false}>
                  Connection failed
                </Elem>
              </Oneof>
            </Block>
          )
        }
      >
        <Input type="hidden" name="project" value={project} />
        <Button.Group className={rootClass.elem("buttons")}>
          <Button type="button" waiting={checking} onClick={validateStorageConnection}>
            Check Connection
          </Button>
          <Button type="submit" look="primary">
            {storage ? "Save" : "Add Storage"}
          </Button>
        </Button.Group>
      </Form.Actions>

      <InlineError />
    </Form.Builder>
  );
});
