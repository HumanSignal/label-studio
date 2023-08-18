import React, { useCallback, useContext } from 'react';
import { Button } from '../../components';
import { EnterpriseBadge } from '../../components/Badges/Enterprise';
import { Caption } from '../../components/Caption/Caption';
import { Form, Input, Select, TextArea } from '../../components/Form';
import { RadioGroup } from '../../components/Form/Elements/RadioGroup/RadioGroup';
import { HeidiTips } from '../../components/HeidiTips/HeidiTips';
import { ProjectContext } from '../../providers/ProjectProvider';
import { Block } from '../../utils/bem';

export const GeneralSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);

  const updateProject = useCallback(() => {
    if (project.id) fetchProject(project.id, true);
  }, [project]);

  const colors = [
    '#FFFFFF',
    '#F52B4F',
    '#FA8C16',
    '#F6C549',
    '#9ACA4F',
    '#51AAFD',
    '#7F64FF',
    '#D55C9D',
  ];

  const samplings = [
    { value: "Sequential", label: "Sequential", description: "Tasks are ordered by Data manager ordering" },
    { value: "Uniform", label: "Random", description: "Tasks are chosen with uniform random" },
  ];

  return (
    <div style={{ width: 480 }}>
      <Form
        action="updateProject"
        formData={{ ...project }}
        params={{ pk: project.id }}
        onSubmit={updateProject}
      >
        <Form.Row columnCount={1} rowGap="32px">
          <Input
            name="title"
            label="Project Name"
            labelProps={{ large: true }}
          />

          <TextArea
            name="description"
            label="Description"
            labelProps={{ large: true }}
            style={{ minHeight: 128 }}
          />

          <div>
            <Select
              placeholder="Select an option"
              label={(
                <>
                  Workspace
                  <EnterpriseBadge />
                </>
              )}
              disabled
              options={[]}
              labelProps={{
                large: true,
              }}
            />
            <Caption>
              Organize projects into workspaces to make it easier to find and manage them using Label Studio Enterprise.
              <a href="#">Learn more</a>
            </Caption>
            <HeidiTips collection="projectCreation" />
          </div>

          <RadioGroup name="color" label="Color" size="large" labelProps={{ size: "large" }}>
            {colors.map(color => (
              <RadioGroup.Button key={color} value={color}>
                <Block name="color" style={{ '--background': color }} />
              </RadioGroup.Button>
            ))}
          </RadioGroup>

          <RadioGroup label="Task Sampling" labelProps={{ size: "large" }} name="sampling" simple>
            {samplings.map(({ value, label, description }) => (
              <RadioGroup.Button
                key={value}
                value={`${value} sampling`}
                label={`${label} sampling`}
                description={description}
              />
            ))}
          </RadioGroup>
        </Form.Row>

        <Form.Actions>
          <Form.Indicator>
            <span case="success">Saved!</span>
          </Form.Indicator>
          <Button type="submit" look="primary" style={{ width: 120 }}>Save</Button>
        </Form.Actions>
      </Form>
    </div>
  );
};

GeneralSettings.menuItem = "General";
GeneralSettings.path = "/";
GeneralSettings.exact = true;
