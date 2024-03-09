
import { forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { ErrorWrapper } from '../../../components/Error/Error';
import { InlineError } from '../../../components/Error/InlineError';
import { Form, Input, Label, TextArea, Toggle, ToggleRight, Select } from '../../../components/Form';
import { modal } from '../../../components/Modal/Modal';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { IconEmptyPredictions } from "../../../assets/icons";
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { Block, cn, Elem } from '../../../utils/bem';
import { FF_DEV_1682, isFF } from '../../../utils/feature-flags';
import './MachineLearningSettings.styl';


const CustomBackendForm = ({ action, backend, project, onSubmit }) => {
  const [selectedAuthMethod, setAuthMethod] = useState('');
  const [mlError, setMLError] = useState();
  
  return (
    <Form action={action}
          formData={{ ...(backend ?? {}) }}
          params={{ pk: backend?.id }}
          onSubmit={async (response) => {
            if (!response.error_message) {
              onSubmit(response);
            }
          }}>
      <Input type="hidden" name="project" value={project.id}/>

      <Form.Row columnCount={1}>
        <Input name="title" label="Name" placeholder="Enter a name" required />            
      </Form.Row>

      <Form.Row columnCount={1}>
        <Input name="url" label="Backend URL" required />
      </Form.Row>

      <Form.Row columnCount={2}>
        <Select name="auth_method" label="Select authentication method"
                options={[ { label: "None", value: "NA" }, { label: "Basic Authentication", value: "BA" } ]}
                onChange={(e) => { setAuthMethod(e.target.value) } } />
      </Form.Row>
      
      {(backend?.auth_method == "BA" || selectedAuthMethod == "BA") && (
        <Form.Row columnCount={2}>
          <Input name="basic_auth_user" label="Basic auth user" />
          <Input name="basic_auth_pass" label="Basic auth pass" type="password" />
        </Form.Row>
      )}
      
      <Form.Row columnCount={1}>
        <TextArea name="extra_params" label="Any extra params to pass during model connection" style={{ minHeight: 120 }}/>
      </Form.Row>
      
      <Form.Row columnCount={1}>
          <Toggle
            name="is_interactive"
            label="Interactive preannotations"
            description="If enabled some labeling tools will send requests to the ML Backend interactively during the annotation process."
          />
      </Form.Row>

      <Form.Actions>
        <Button type="submit" look="primary" onClick={() => setMLError(null)}>
          Validate and Save
        </Button>
      </Form.Actions>

      <Form.ResponseParser>{response => (
        <>
          {response.error_message && (
            <ErrorWrapper error={{
              response: {
                detail: `Failed to ${backend ? 'save' : 'add new'} ML backend.`,
                exc_info: response.error_message,
              },
            }}/>
          )}
        </>
      )}</Form.ResponseParser>

      <InlineError/>
    </Form>
  );
};

export { CustomBackendForm };
