import { EnterpriseBadge, Select, Typography } from "@humansignal/ui";
import { useCallback, useContext } from "react";
import { Button } from "@humansignal/ui";
import { Form, Input, TextArea } from "../../components/Form";
import { RadioGroup } from "../../components/Form/Elements/RadioGroup/RadioGroup";
import { ProjectContext } from "../../providers/ProjectProvider";
import { cn } from "../../utils/bem";
import { HeidiTips } from "../../components/HeidiTips/HeidiTips";
import { FF_LSDV_E_297, isFF } from "../../utils/feature-flags";
import { createURL } from "../../components/HeidiTips/utils";

export const GeneralSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);

  const updateProject = useCallback(() => {
    if (project.id) fetchProject(project.id, true);
  }, [project]);

  const colors = ["#FDFDFC", "#FF4C25", "#FF750F", "#ECB800", "#9AC422", "#34988D", "#617ADA", "#CC6FBE"];

  const samplings = [
    { value: "Sequential", label: "Sequential", description: "Tasks are ordered by Task ID" },
    { value: "Uniform", label: "Random", description: "Tasks are chosen with uniform random" },
  ];

  return (
    <div className={cn("general-settings").toClassName()}>
      <div className={cn("general-settings").elem("wrapper").toClassName()}>
        <h1>General Settings</h1>
        <div className={cn("settings-wrapper").toClassName()}>
          <Form action="updateProject" formData={{ ...project }} params={{ pk: project.id }} onSubmit={updateProject}>
            <Form.Row columnCount={1} rowGap="16px">
              <Input name="title" label="Project Name" />

              <TextArea name="description" label="Description" style={{ minHeight: 128 }} />
              {isFF(FF_LSDV_E_297) && (
                <div className={cn("workspace-placeholder").toClassName()}>
                  <div className={cn("workspace-placeholder").elem("badge-wrapper").toClassName()}>
                    <div className={cn("workspace-placeholder").elem("title").toClassName()}>Workspace</div>
                    <EnterpriseBadge className="ml-2" />
                  </div>
                  <Select placeholder="Select an option" disabled options={[]} />
                  <Typography size="small" className="my-tight">
                    Simplify project management by organizing projects into workspaces.{" "}
                    <a
                      target="_blank"
                      href={createURL(
                        "https://docs.humansignal.com/guide/manage_projects#Create-workspaces-to-organize-projects",
                        {
                          experiment: "project_settings_tip",
                          treatment: "simplify_project_management",
                        },
                      )}
                      rel="noreferrer"
                      className="underline hover:no-underline"
                    >
                      Learn more
                    </a>
                  </Typography>
                </div>
              )}
              <RadioGroup name="color" label="Color" size="large" labelProps={{ size: "large" }}>
                {colors.map((color) => (
                  <RadioGroup.Button key={color} value={color}>
                    <div className={cn("color").toClassName()} style={{ "--background": color }} />
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
                {isFF(FF_LSDV_E_297) && (
                  <RadioGroup.Button
                    key="uncertainty-sampling"
                    value=""
                    label={
                      <>
                        Uncertainty sampling <EnterpriseBadge className="ml-2" />
                      </>
                    }
                    disabled
                    description={
                      <>
                        Tasks are chosen according to model uncertainty score (active learning mode).{" "}
                        <a
                          target="_blank"
                          href={createURL("https://docs.humansignal.com/guide/active_learning", {
                            experiment: "project_settings_workspace",
                            treatment: "workspaces",
                          })}
                          rel="noreferrer"
                        >
                          Learn more
                        </a>
                      </>
                    }
                  />
                )}
              </RadioGroup>
            </Form.Row>

            <Form.Actions>
              <Form.Indicator>
                <span case="success">Saved!</span>
              </Form.Indicator>
              <Button type="submit" className="w-[150px]" aria-label="Save general settings">
                Save
              </Button>
            </Form.Actions>
          </Form>
        </div>
      </div>
      {isFF(FF_LSDV_E_297) && <HeidiTips collection="projectSettings" />}
    </div>
  );
};

GeneralSettings.menuItem = "General";
GeneralSettings.path = "/";
GeneralSettings.exact = true;
