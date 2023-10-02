import { observer } from "mobx-react";
import React, { forwardRef, useCallback, useRef } from "react";
import { Block, Elem } from "../../utils/bem";
import { Spinner } from "../Common/Spinner";
import "./CandidateTaskView.styl";
import { getRoot } from "mobx-state-tree";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FF_LSDV_4711, isFF } from "../../utils/feature-flags";

const imgDefaultProps = {};

if (isFF(FF_LSDV_4711)) imgDefaultProps.crossOrigin = 'anonymous';

const DataItemVisual = forwardRef(({ columns, dataKey, data }, imageRef) => {
  const [isInProgress, setIsInProgress] = useState();
  const [fileContent, setFileContent] = useState();
  const [isFileError, setIsFileError] = useState(false);
  const isUrlData = /https?:\/\/.*/.test(data);
  const columnDefinition = columns.find(colData => colData.alias === dataKey);

  useEffect(async () => {
    if ( isUrlData && columnDefinition?.currentType === "Text" ) {
      setIsInProgress(true);
      setIsFileError(false);
      let response;

      try {
        response = await fetch(data);
      } catch (ex) {
        response = ex;
      }

      if (response?.status === 200) {
        setFileContent(await response.text());
      } else {
        console.error("Error:", response);
        setIsFileError(true);
      }
      setIsInProgress(false);
    }
  }, [isUrlData, data, columnDefinition]);

  if (columnDefinition?.currentType === "Image") {
    return (
      <Elem name="data-display" mod={{ image: true }}>
        <img {...imgDefaultProps} ref={imageRef} src={data} />
      </Elem>
    );
  } else if (columnDefinition?.currentType === "Text" && isUrlData && !isFileError) {
    return (
      <Elem name="data-display" mod={{ text: true }}>
        {isInProgress ? <Spinner /> : (
          <Elem name='textdata' tag="pre">
            {fileContent}
          </Elem>
        )}
      </Elem>
    );
  } else if (isUrlData) {
    return (
      <Elem name="data-display" mod={{ link: true }} >
        <Elem name="data-link" tag="a" href={data} target="_blank">{data}</Elem>
      </Elem>
    );
  }
  return (
    <Elem name="data-display" mod={{ [columnDefinition?.currentType ?? "text"]: true }} >
      {data}
    </Elem>
  );
});

const AttributeRow = (({ fieldName, value }) => {
  return (
    <Block name='attributeRow'>
      <Elem name='name'>{fieldName}</Elem>
      <Elem name='value'>{value}</Elem>
    </Block>
  );
});
const dateDisplayFormat = "MMM dd, yyyy HH:mm a";

export const CandidateTaskView = observer(({ item, columns }) => {
  const { candidate_task_id, id, data, exported } = item;
  const dataset = getRoot(item)?.SDK?.dataset;
  const [fName, setFName] = useState();
  const [fType, setFType] = useState();
  const [mType, setMType] = useState();
  const [created, setCreated] = useState();
  const [modified, setModified] = useState();
  const [size, setSize] = useState();
  const [dimensions, setDimensions] = useState([]);
  const [bucket, setBucket] = useState();
  const imgRef = useRef({});
  const associatedList = getRoot(item).taskStore.associatedList;

  useEffect(() => {
    const setDefaultMetadata = async () => {
      const { metadata } = await getRoot(item).apiCall("candidateTaskMeta", {
        candidate_task_id,
      });
  
      if (metadata) {
        setFName(metadata.name.split('/').pop());
        setFType(metadata.contentType.split('/').shift());
        setMType(metadata.contentType);
        setCreated(metadata.timeCreated ? format(new Date(metadata.timeCreated), dateDisplayFormat) : "");
        setModified(metadata.updated ? format(new Date(metadata.updated), dateDisplayFormat) : "");
        setSize(`${new Intl.NumberFormat().format(parseInt(metadata.size))} bytes`);
        setBucket(metadata.bucket);
        setDimensions(Object.values(imgRef.current).map(ref => `${ref?.naturalWidth ?? 0} x ${ref?.naturalHeight ?? 0} px`));
      }
    };
    
    setDefaultMetadata();
  }, [candidate_task_id]);
  

  return (
    <Block name="candidate-task-view">
      <Elem name="data-display-container">
        {Object.entries(data).map( ([dataKey, dataValue]) => (
          <DataItemVisual key={dataKey} columns={columns} dataKey={dataKey} data={dataValue} ref={(ele) => imgRef.current[dataKey] = ele} />
        ))}
      </Elem>
      <Elem name="details">
        <Elem name="detailContainer">
          <Elem name="title">File Attributes</Elem>
          <Elem name="fname">{fName}</Elem>
        </Elem>
        <Elem name="detailContainer">
          <Elem name="detailSubContainer">
            <Elem name="subtitle">General</Elem>
            <Elem name="detailContent">
              <AttributeRow fieldName="ID:" value={id}/>
              <AttributeRow fieldName="File Type:" value={fType}/>
              <AttributeRow fieldName="Mime Type:" value={mType}/>
              <AttributeRow fieldName="Created:" value={created}/>
              <AttributeRow fieldName="Modified:" value={modified}/>
              <AttributeRow fieldName="Size:" value={size}/>
              <AttributeRow fieldName="Dimensions:" value={dimensions.map((dim, key) => <Elem key={key} name='dimension'>{dim}</Elem>)}/>
              <AttributeRow fieldName="Dataset:" value={dataset?.title}/>
            </Elem>
          </Elem>
          <Elem name="detailSubContainer">
            <Elem name="subtitle">Origin Storage</Elem>
            <Elem name="detailContent">
              <AttributeRow fieldName="Name:" value={fName}/>
              <AttributeRow fieldName="Bucket:" value={bucket}/>
              <AttributeRow fieldName="External ID:" value={candidate_task_id}/>
            </Elem>
          </Elem>
          <Elem name="detailSubContainer">
            <Elem name="subtitle">Projects</Elem>
            <Elem name="detailContent">{
              (associatedList.length && exported.length) ? (
                exported.map((exportedEntry, index) => {
                  const { project_id, created_at } = exportedEntry;
                  const associtedRecord = associatedList?.find(associatedItem => associatedItem?.id === project_id);
                  const { title, workspace } = associtedRecord;
                  const clickHandler = useCallback(e => {
                    e.preventDefault();
                    window.open(`/projects/${project_id}/data`, '_self');
                  }, [project_id]);
                  
                  return (
                    <Block onClick={clickHandler} name='projectNav' key={index}>
                      <Elem name='name'>{workspace?.length && `${workspace.join(" - ")} / `}{title}</Elem>
                      {created_at && <Elem name='date'>Added {format(new Date(created_at), dateDisplayFormat)}</Elem>}
                    </Block>
                  );
                })
              ) : (
                <>This file hasn’t been imported to any projects.</>
              )
            }</Elem>
          </Elem>
        </Elem>
      </Elem>
    </Block>
  );
});