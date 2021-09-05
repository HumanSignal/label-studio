import React, { useCallback, useContext } from 'react';
import { Button } from '../../components';
import { Form, Input, TextArea } from '../../components/Form';
import { RadioGroup } from '../../components/Form/Elements/RadioGroup/RadioGroup';
import { ProjectContext } from '../../providers/ProjectProvider';
import { Block } from '../../utils/bem';
import { useTranslation } from "react-i18next";
import "../../translations/i18n";
import i18n from "i18next";

export const GeneralSettings = () => {
  const { t } = useTranslation();

  const {project, fetchProject} = useContext(ProjectContext);

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
    {value: "Sequential", label: "Sequential", description: t("tasksOrdered")},
    {value: "Uniform", label: "Random", description: t("tasksChosen")},
  ];

  return (
    <div style={{width: 480}}>
      <Form
        action="updateProject"
        formData={{...project}}
        params={{pk: project.id}}
        onSubmit={updateProject}
      >
        <Form.Row columnCount={1} rowGap="32px">
          <Input
            name="title"
            label={t("projectName")}
            labelProps={{large: true}}
          />

          <TextArea
            name="description"
            label={t("description")}
            labelProps={{large: true}}
            style={{minHeight: 128}}
          />

          <RadioGroup name="color" label={t("color")} size="large" labelProps={{size: "large"}}>
            {colors.map(color => (
              <RadioGroup.Button key={color} value={color}>
                <Block name="color" style={{'--background': color}}/>
              </RadioGroup.Button>
            ))}
          </RadioGroup>

          <RadioGroup label={t("taskSampling")} labelProps={{size: "large"}} name="sampling" simple>
            {samplings.map(({value, label, description}) => (
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
            <span case="success">{t("saved")}!</span>
          </Form.Indicator>
          <Button type="submit" look="primary" style={{width: 120}}>{t("save")}</Button>
        </Form.Actions>
      </Form>
    </div>
  );
};

GeneralSettings.menuItem = i18n.t("general");
GeneralSettings.path = "/";
GeneralSettings.exact = true;
