import { Typography } from 'antd';
import { observer } from 'mobx-react';
import { FC, useEffect, useMemo, useRef } from 'react';
import { Block, Elem, useBEM } from '../../../utils/bem';
import { RegionEditor } from './RegionEditor';
import './RegionDetails.styl';

const { Text } = Typography;


const TextResult: FC<{mainValue: string[]}> = observer(({ mainValue }) => {
  return (
    <Text mark>
      {mainValue.map((value: string, i: number) => (
        <p key={`${value}-${i}`} data-counter={i + 1}>{value}</p>
      ))}
    </Text>
  );
});

const ChoicesResult: FC<{mainValue: string[]}> = observer(({ mainValue }) => {
  return (
    <Text mark>
      {mainValue.join(', ')}
    </Text>
  );
});

const RatingResult: FC<{mainValue: string[]}> = observer(({ mainValue }) => {
  return (
    <span>
      {mainValue}
    </span>
  );
});

const ResultItem: FC<{result: any}> = observer(({ result }) => {
  const { type, mainValue } = result;
  /**
   * @todo before fix this var was always false, so fix is left commented out
   * intention was to don't show per-region textarea text twice —
   * in region list and in region details; it failed but there were no complaints
   */
  // const isRegionList = from_name.displaymode === PER_REGION_MODES.REGION_LIST;

  const content = useMemo(() => {
    if (type === 'rating') {
      return (
        <Elem name="result">
          <Text>Rating: </Text>
          <Elem name="value">
            <RatingResult mainValue={mainValue}/>
          </Elem>
        </Elem>
      );
    } else if (type === 'textarea') {
      return (
        <Elem name="result">
          <Text>Text: </Text>
          <Elem name="value">
            <TextResult mainValue={mainValue}/>
          </Elem>
        </Elem>
      );
    } else if (type === 'choices') {
      return (
        <Elem name="result">
          <Text>Choices: </Text>
          <Elem name="value">
            <ChoicesResult mainValue={mainValue}/>
          </Elem>
        </Elem>
      );
    }
  }, [type, mainValue]);

  return content ? (
    <Block name="region-meta">
      {content}
    </Block>
  ) : null;
});

export const RegionDetailsMain: FC<{region: any}> = observer(({
  region,
}) => {
  return (
    <>
      <Elem name="result">
        {(region?.results as any[]).map((res) => <ResultItem key={res.pid} result={res}/>)}
        {region?.text ? (
          <Block name="region-meta">
            <Elem name="item">
              <Elem
                name="content"
                mod={{ type: 'text' }}
                dangerouslySetInnerHTML={{
                  __html: region.text.replace(/\\n/g, '\n'),
                }}
              />
            </Elem>
          </Block>
        ) : null}
      </Elem>
      <RegionEditor region={region}/>
    </>
  );
});

type RegionDetailsMetaProps = {
  region: any,
  editMode?: boolean,
  cancelEditMode?: () => void,
  enterEditMode?: () => void,
}

export const RegionDetailsMeta: FC<RegionDetailsMetaProps> = observer(({
  region,
  editMode,
  cancelEditMode,
  enterEditMode,
}) => {
  const bem = useBEM();
  const input = useRef<HTMLTextAreaElement | null>();

  const saveMeta = (value: string) => {
    region.setMetaInfo(value);
    region.setNormInput(value);
  };

  useEffect(() => {
    if (editMode && input.current) {
      const { current } = input;

      current.focus();
      current.setSelectionRange(current.value.length, current.value.length);
    }
  }, [editMode]);

  return (
    <>
      {editMode ? (
        <textarea
          ref={el => input.current = el}
          placeholder="Meta"
          className={bem.elem('meta-text').toClassName()}
          value={region.normInput}
          onChange={(e) => saveMeta(e.target.value)}
          onBlur={() => {
            saveMeta(region.normInput);
            cancelEditMode?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              saveMeta(region.normInput);
              cancelEditMode?.();
            }
          }}
        />
      ) : region.meta?.text && (
        <Elem name="meta-text"
          onClick={() => enterEditMode?.()}
        >
          {region.meta?.text}
        </Elem>
      )}
      {/* <Elem name="section">
        <Elem name="section-head">
          Data Display
        </Elem>
        <Elem name="section-content">
          content
        </Elem>
      </Elem> */}
    </>
  );
  // return (
  //   <>
  //     {region?.meta?.text && (
  //       <Elem name="text">
  //           Meta: <span>{region.meta.text}</span>
  //           &nbsp;
  //         <IconTrash
  //           type="delete"
  //           style={{ cursor: "pointer" }}
  //           onClick={() => {
  //             region.deleteMetaInfo();
  //           }}
  //         />
  //       </Elem>
  //     )}
  //   </>
  // );
});
