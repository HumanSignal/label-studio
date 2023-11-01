import { mount, shallow } from "enzyme";
import React from "react";
import { Block, Elem } from "../../../src/utils/bem";

describe('BEM', () => {
  test('Block renders without fail', () => {
    const className = 'test-block';
    const block = shallow(
      <Block tag="div" name={className}/>,
    );

    expect(block.find(`.ls-${className}`)).toHaveLength(1);
  });

  test('Elem renders with proper class name', () => {
    const blockName = 'test-block';
    const elemName = 'test-elem';

    const block = mount(
      <Block tag="div" name={blockName}>
        <Elem name={elemName}/>
      </Block>,
    );

    expect(block.find(`.ls-${blockName}`)).toHaveLength(1);
    expect(block.find(`.ls-${blockName}__${elemName}`)).toHaveLength(1);
  });
});
