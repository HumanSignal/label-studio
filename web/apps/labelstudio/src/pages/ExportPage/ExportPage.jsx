import React, { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router";
import { Button } from "../../components";
import { Form, Input } from "../../components/Form";
import { Modal } from "../../components/Modal/Modal";
import { Space } from "../../components/Space/Space";
import { useAPI } from "../../providers/ApiProvider";
import { useFixedLocation, useParams } from "../../providers/RoutesProvider";
import { BemWithSpecifiContext } from "../../utils/bem";
import { isDefined } from "../../utils/helpers";
import "./ExportPage.scss";

// const formats = {
//   json: 'JSON',
//   csv: 'CSV',
// };

const downloadFile = (blob, filename) => {
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const { Block, Elem } = BemWithSpecifiContext();

const wait = () => new Promise((resolve) => setTimeout(resolve, 5000));

export const ExportPage = () => {
  const history = useHistory();
  const location = useFixedLocation();
  const pageParams = useParams();
  const api = useAPI();

  const [previousExports, setPreviousExports] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadingMessage, setDownloadingMessage] = useState(false);
  const [availableFormats, setAvailableFormats] = useState([]);
  const [currentFormat, setCurrentFormat] = useState("JSON");

  /** @type {import('react').RefObject<Form>} */
  const form = useRef();

  const proceedExport = async () => {
    setDownloading(true);

    const message = setTimeout(() => {
      setDownloadingMessage(true);
    }, 1000);

    const params = form.current.assembleFormData({
      asJSON: true,
      full: true,
      booleansAsNumbers: true,
    });

    const response = await api.callApi("exportRaw", {
      params: {
        pk: pageParams.id,
        ...params,
      },
    });

    if (response.ok) {
      const blob = await response.blob();

      downloadFile(blob, response.headers.get("filename"));
    } else {
      api.handleError(response);
    }

    setDownloading(false);
    setDownloadingMessage(false);
    clearTimeout(message);
  };

  useEffect(() => {
    if (isDefined(pageParams.id)) {
      api
        .callApi("previousExports", {
          params: {
            pk: pageParams.id,
          },
        })
        .then(({ export_files }) => {
          setPreviousExports(export_files.slice(0, 1));
        });

      api
        .callApi("exportFormats", {
          params: {
            pk: pageParams.id,
          },
        })
        .then((formats) => {
          setAvailableFormats(formats);
          setCurrentFormat(formats[0]?.name);
        });
    }
  }, [pageParams]);

  // const formatSelect = (
  //   <Label text="Export format" style={{display: "block", width: "mix-content"}} flat>
  //     <Dropdown.Trigger content={(
  //       <Menu size="medium">
  //         {Object.entries(formats).map(([key, value]) => {
  //           return <Menu.Item key={key} onClick={() => setFormat(key)}>{value}</Menu.Item>;
  //         })}
  //       </Menu>
  //     )}>
  //       <Button size="small" style={{textAlign: "left"}}>
  //         <span>{formats[format]}</span>
  //       </Button>
  //     </Dropdown.Trigger>
  //   </Label>
  // );

  // const aggregation = (
  //   <Form.Row columnCount={2}>
  //     {/* TODO: We don't have api for different formats yet, so let's hide the select for now */}
  //     {/* {formatSelect} */}

  //     <RadioGroup label="Aggregation of annotations" size="small" name="aggregator_type" labelProps={{size: "large", flat: true}}>
  //       <RadioGroup.Button value="majority_vote" checked>
  //         Majority vote
  //       </RadioGroup.Button>
  //       <RadioGroup.Button value="no_aggregation">
  //         No aggregation
  //       </RadioGroup.Button>
  //     </RadioGroup>
  //   </Form.Row>
  // );

  // const exportHistory = (
  //   <Label text="Previous exports" size="large" flat>
  //     {previousExports.map(file => {
  //       const basename = file.url.split('/').reverse()[0];
  //       return (
  //         <Button key={file.url} href={file.url} size="medium" download={basename} icon={<FaFileDownload/>}>
  //           {basename}
  //         </Button>
  //       );
  //     })}
  //   </Label>
  // );

  return (
    <Modal
      onHide={() => {
        const path = location.pathname.replace(ExportPage.path, "");
        const search = location.search;

        history.replace(`${path}${search !== "?" ? search : ""}`);
      }}
      title="Export data"
      style={{ width: 720 }}
      closeOnClickOutside={false}
      allowClose={!downloading}
      // footer="Read more about supported export formats in the Documentation."
      visible
    >
      <Block name="export-page">
        <FormatInfo
          availableFormats={availableFormats}
          selected={currentFormat}
          onClick={(format) => setCurrentFormat(format.name)}
        />

        <Form ref={form}>
          <Input type="hidden" name="exportType" value={currentFormat} />

          {/* {aggregation} */}

          {/*<Form.Row columnCount={3} style={{marginTop: 24}}>*/}
          {/*  <Toggle label="Only finished tasks" name="finished" checked/>*/}
          {/*  <Toggle label="Include full task descriptions" name="return_task" checked/>*/}
          {/*  <Toggle label="Include predictions" name="return_predictions" checked/>*/}
          {/*</Form.Row>*/}
        </Form>

        <Elem name="footer">
          <Space style={{ width: "100%" }} spread>
            <Elem name="recent">{/* {exportHistory} */}</Elem>
            <Elem name="actions">
              <Space>
                {downloadingMessage && "Files are being prepared. It might take some time."}
                <Elem tag={Button} name="finish" look="primary" onClick={proceedExport} waiting={downloading}>
                  Export
                </Elem>
              </Space>
            </Elem>
          </Space>
        </Elem>
      </Block>
    </Modal>
  );
};

const FormatInfo = ({ availableFormats, selected, onClick }) => {
  return (
    <Block name="formats">
      <Elem name="info">You can export dataset in one of the following formats:</Elem>
      <Elem name="list">
        {availableFormats.map((format) => (
          <Elem
            key={format.name}
            name="item"
            mod={{
              active: !format.disabled,
              selected: format.name === selected,
            }}
            onClick={!format.disabled ? () => onClick(format) : null}
          >
            <Elem name="name">
              {format.title}

              <Space size="small">
                {format.tags?.map?.((tag, index) => (
                  <Elem key={index} name="tag">
                    {tag}
                  </Elem>
                ))}
              </Space>
            </Elem>

            {format.description && <Elem name="description">{format.description}</Elem>}
          </Elem>
        ))}
      </Elem>
      <Elem name="feedback">
        Can't find an export format?
        <br />
        Please let us know in{" "}
        <a className="no-go" href="https://slack.labelstud.io/?source=product-export" target="_blank" rel="noreferrer">
          Slack
        </a>{" "}
        or submit an issue to the{" "}
        <a
          className="no-go"
          href="https://github.com/heartexlabs/label-studio-converter/issues"
          target="_blank"
          rel="noreferrer"
        >
          Repository
        </a>
      </Elem>
    </Block>
  );
};

ExportPage.path = "/export";
ExportPage.modal = true;
