import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from '../../components';
import { Form, Label, TextArea, Toggle } from '../../components/Form';
import { MenubarContext } from '../../components/Menubar/Menubar';
import { PrelabelingSelector } from './AnnotationSettings/PrelabelingSelector';
import { Block, cn, Elem } from '../../utils/bem';

import { ProjectModelVersionSelector } from './AnnotationSettings/ProjectModelVersionSelector';
import { ProjectContext } from '../../providers/ProjectProvider';
import { useAPI } from '../../providers/ApiProvider';
import { Divider } from '../../components/Divider/Divider';


export const AnnotationSettings = () => {
  const api = useAPI();
  const {project, fetchProject} = useContext(ProjectContext);
  const pageContext = useContext(MenubarContext);
  const formRef = useRef();
  const [collab, setCollab] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState();
  
  const edittable = ! project.evaluate_predictions_automatically;

  const fetchVersions = useCallback(async () => {
    // const versions = await api.callApi('projectModelVersions', {
    //     params: {
    //       pk: project.id,
    //       extended: true,
    //       include_live_models: true
    //     }
    // });

    // if (versions) setVersions(versions);
  }, [project, setVersions]);

  useEffect(() => {
    if (project.id) {
      fetchVersions();
      setActiveVersion(project.model_version);
    }
  }, [project]);
  
  useEffect(() => {
    pageContext.setProps({formRef});
  }, [formRef]);

  const updateProject = useCallback(() => {
    fetchProject(project.id, true);
  }, [project]);

  return (
    <Block name="annotation-settings">
      <Elem name={'wrapper'}>
      <Form ref={formRef} action="updateProject" formData={{...project}} params={{pk: project.id}} onSubmit={updateProject}>
        <Form.Row columnCount={1}>
          <h4>Labeling Instructions</h4>
          <div>
            <Toggle label="Show before labeling" name="show_instruction"/>
          </div>
          <div style={{color: "rgba(0,0,0,0.4)" }}>
            <p>Write instructions to help users complete labeling tasks.</p>
            <p>The instruction field supports HTML markup and it allows to integrate with images, iframes (pdf).</p>
          </div>
        </Form.Row>

        <Form.Row columnCount={1}>
          <TextArea name="expert_instruction" style={{minHeight: 128, maxWidth: "520px"}}/>
        </Form.Row>

        <Divider height={32} />
        
        <Form.Row columnCount={1} style={{ borderTop: "1px solid #f1f1f1"}}>
          <h4>Predictions</h4>
          
          <div>        
            <Toggle label="Use predictions to pre-label data"
                    description="Enable and select which set of predictions to use for prelabeling."
                    name="show_collab_predictions"
                    onChange={(e) => { setCollab(e.target.checked) }}
                    disabled={! edittable} />            
          </div>

          {
            (((collab !== null) ? collab : project.show_collab_predictions)) &&
            <ProjectModelVersionSelector />
          }
        </Form.Row>
        
        <Form.Actions>
          <Form.Indicator>
            <span case="success">Saved!</span>
          </Form.Indicator>
          <Button type="submit" look="primary" style={{width: 120}}>Save</Button>
        </Form.Actions>
      </Form>
    </Elem>
    </Block>
  );
};

AnnotationSettings.title = "Annotation";
AnnotationSettings.path = "/annotation";
