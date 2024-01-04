
import { render } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import * as VirtualVideo from '../VirtualVideo';


describe('VirtualVideo', () => {
  it('should call canPlayUrl and return false if no url specified', async () => {
    const canPlayType = jest.fn();

    render(<VirtualVideo.VirtualVideo canPlayType={canPlayType} />);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(canPlayType).toBeCalledWith(false);
  });

  it('should call canPlayUrl and return true if valid url specified', async () => {
    const canPlayType = jest.fn();

    render(<VirtualVideo.VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.mp4" canPlayType={canPlayType} />);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(canPlayType).toBeCalledWith(true);
  });

  it('should call canPlayUrl and return true if valid relative url specified', async () => {
    const canPlayType = jest.fn();

    render(<VirtualVideo.VirtualVideo src="/files/opossum_intro.webm" canPlayType={canPlayType} />);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(canPlayType).toBeCalledWith(true);
  });

  it('should call canPlayUrl and return true if valid url specified, even if content-type is binary/octet-stream', async () => {
    const canPlayType = jest.fn();

    // return binary/octet-stream for all requests, mimicking the situation where
    // the server doesn't set the content-type header and defaults to binary/octet-stream
    fetchMock.mockResponseOnce('', {
      headers: {
        'content-type': 'binary/octet-stream',
      },
    });

    render(<VirtualVideo.VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.mp4" canPlayType={canPlayType} />);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(canPlayType).toBeCalledWith(true);
  });

  it('should call canPlayUrl and return true if valid file is specified, and content-type is binary/octet-stream but no file extension', async () => {
    const canPlayType = jest.fn();

    // return binary/octet-stream for all requests, mimicking the situation where
    // the server doesn't set the content-type header and defaults to binary/octet-stream
    fetchMock.mockResponseOnce('', {
      headers: {
        'content-type': 'binary/octet-stream',
      },
    });

    render(<VirtualVideo.VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow" canPlayType={canPlayType} />);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(canPlayType).toBeCalledWith(true);
  });

  it('should call canPlayUrl and return false if invalid url specified', async () => {
    const canPlayType = jest.fn();

    render(<VirtualVideo.VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.avi" canPlayType={canPlayType} />);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(canPlayType).toBeCalledWith(false);
  });

  it('should call canPlayUrl and return false if invalid url specified, even if content-type is binary/octet-stream', async () => {
    const canPlayType = jest.fn();

    // return binary/octet-stream for all requests, mimicking the situation where
    // the server doesn't set the content-type header and defaults to binary/octet-stream
    fetchMock.mockResponseOnce('', {
      headers: {
        'content-type': 'binary/octet-stream',
      },
    });

    render(<VirtualVideo.VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.avi" canPlayType={canPlayType} />);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(canPlayType).toBeCalledWith(false);
  });
});
