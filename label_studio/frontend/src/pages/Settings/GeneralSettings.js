import React, { useContext, useEffect, useRef } from 'react';
import { Button } from '../../components';
import { Form, Input, TextArea } from '../../components/Form';
import { RadioGroup } from '../../components/Form/Elements/RadioGroup/RadioGroup';
import { MenubarContext } from '../../components/Menubar/Menubar';
import { ProjectContext } from '../../providers/ProjectProvider';
import { Block } from '../../utils/bem';

export const GeneralSettings = () => {
  const {project, fetchProject} = useContext(ProjectContext);
  const pageContext = useContext(MenubarContext);
  const formRef = useRef();

  useEffect(() => {
    pageContext.setProps({formRef});
  }, [formRef]);

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

  return (
    <div style={{width: 480}}>
      <Form ref={formRef} action="updateProject" formData={{...project}} params={{pk: project.id}} onSubmit={() => fetchProject(project.id, true)}>
        <Form.Row columnCount={1} rowGap="32px">
          <Input
            name="title"
            label="Project Name"
            labelProps={{large: true}}
          />

          <TextArea
            name="description"
            label="Description"
            labelProps={{large: true}}
            style={{minHeight: 128}}
          />

          <RadioGroup name="color" label="Color" size="large" labelProps={{size: "large"}}>
            {colors.map(color => (
              <RadioGroup.Button key={color} value={color}>
                <Block name="color" style={{'--background': color}}/>
              </RadioGroup.Button>
            ))}
          </RadioGroup>
        </Form.Row>

        <Form.Actions>
          <Form.Indicator>
            <span case="success">Saved!</span>
          </Form.Indicator>
          <Button type="submit" look="primary" style={{width: 120}}>Save</Button>
        </Form.Actions>
      </Form>
    </div>
  );
};

GeneralSettings.menuItem = "General";
GeneralSettings.path = "/";
GeneralSettings.exact = true;
