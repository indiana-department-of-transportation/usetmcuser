/**
 * index.test.tsx
 *
 * @description Tests for the user hooks and content provider.
 *
 * @author jasmith79@gmail.com
 * @license MIT
 */

import 'jsdom-global/register';
import '@testing-library/jest-dom/extend-expect';

import React from 'react';
import { emptyFn } from '@jasmith79/ts-utils';

import {
  render,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  screen,
  act
} from '@testing-library/react';

import {
  useUser,
  useLogin,
  UserContextProvider,
} from './index';

jest.useFakeTimers();
globalThis.Headers = jest.fn();

const timeout = (n: number) => new Promise(res => setTimeout(res, n));
const localStorageMockFactory = () => {
  const store: { [key: string]: string } = {};

  return {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: (index: number) => null,
    removeItem: (key: string) => { },
  };
};

const userURL = '/user/auth';

const now = Date.now();
const mockSavedUser = JSON.stringify({
  user_name: 'foobar',
  user_id: '1',
  token: '123BABEFACE',
  userError: null,
  lastAuthed: now,
});

const CtxHarness = ({ children }: { children: React.ReactNode }) => (
  <UserContextProvider>{children}</UserContextProvider>
);

const UserState = () => {
  const user = useUser();
  return (
    <div>
      <span data-testid="user_name">{'' + user.user_name}</span>
      <span data-testid="user_id">{'' + user.user_id}</span>
      <span data-testid="token">{'' + user.token}</span>
      <span data-testid="lastAuthed">{'' + user.lastAuthed}</span>
      <span data-testid="userError">{'' + user.userError}</span>
    </div>
  )
};

const Login = ({ children }: { children: React.ReactNode }) => {
  const [login, logoff, resetTimeout] = useLogin();
  const user = useUser();
  return (
    <div>
      <button data-testid="login" onClick={() => login('foobar', 'barfoo')} />
      <button data-testid="logout" onClick={logoff} />
      <button data-testid="reset" onClick={() => resetTimeout()} />
      {
        user.token ? <div data-testid="logged-in">{children}</div> : ''
      }
    </div>
  );
};

globalThis.fetch = jest.fn();

const fakeResponseFactory = async (returnValue: any, status: number = 200) => ({
  json: () => new Promise(res => setTimeout(res, 0, returnValue)),
  status,
});

let fetch = jest.fn()
beforeEach(() => {
  fetch = jest.fn()
  globalThis.fetch = fetch;
});

describe('useUser', () => {
  it('should have the current user state', () => {
    const { queryByTestId } = render(<CtxHarness><UserState /></CtxHarness>);
    expect(queryByTestId('user_name')?.textContent?.trim()).toBe('');
    expect(queryByTestId('user_id')?.textContent?.trim()).toBe('0');
    expect(queryByTestId('token')?.textContent?.trim()).toBe('');
    expect(queryByTestId('lastAuthed')?.textContent?.trim()).toBe('null');
    expect(queryByTestId('userError')?.textContent?.trim()).toBe('null');
  });
});

describe('useLogin', () => {
  it('should load a saved user from localStorage on first use', async (done) => {
    const storage = localStorageMockFactory();

    storage.getItem.mockReturnValueOnce(mockSavedUser);
    globalThis.localStorage = storage;

    const { queryByTestId } = render(
      <CtxHarness>
        <Login>
          <UserState />
        </Login>
      </CtxHarness>
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(storage.getItem).toHaveBeenCalledWith(userURL);

    // This is a hack around a problem with react-testing-library and fake timers.
    // see https://github.com/testing-library/react-testing-library/issues/244
    // no way to suppress the act(...) warning here.
    Promise.resolve().then(() => jest.advanceTimersByTime(30));
    await waitFor(() => screen.getByTestId('logged-in'));

    expect(queryByTestId('user_name')?.textContent?.trim()).toBe('foobar');
    expect(queryByTestId('user_id')?.textContent?.trim()).toBe('1');
    expect(queryByTestId('token')?.textContent?.trim()).toBe('123BABEFACE');
    expect(queryByTestId('lastAuthed')?.textContent?.trim()).toBe(`${now}`);
    expect(queryByTestId('userError')?.textContent?.trim()).toBe('null');
    done();
  });

  it('should fetch a user if login called', async () => {
    fetch.mockReturnValueOnce(fakeResponseFactory({
      user_name: 'foobar',
      user_id: '1',
      token: '123BABEFACE',
    }));

    const { queryByTestId } = render(
      <CtxHarness>
        <Login>
          <UserState />
        </Login>
      </CtxHarness>
    );

    const btn = queryByTestId('login');
    expect(btn).not.toBeNull();

    expect(queryByTestId('user_name')).not.toBeInTheDocument();
    expect(queryByTestId('user_id')).not.toBeInTheDocument();
    expect(queryByTestId('token')).not.toBeInTheDocument();
    expect(queryByTestId('lastAuthed')).not.toBeInTheDocument();
    expect(queryByTestId('userError')).not.toBeInTheDocument();

    fireEvent.click(btn as HTMLElement);

    expect(fetch).toHaveBeenCalled();
    Promise.resolve().then(() => jest.advanceTimersByTime(30));
    await waitFor(() => screen.getByTestId('logged-in'));
    expect(queryByTestId('user_name')?.textContent?.trim()).toBe('foobar');
    expect(queryByTestId('user_id')?.textContent?.trim()).toBe('1');
    expect(queryByTestId('token')?.textContent?.trim()).toBe('123BABEFACE');
    expect(queryByTestId('lastAuthed')?.textContent?.trim()).toMatch(/^\d+$/);
    expect(queryByTestId('userError')?.textContent?.trim()).toBe('null');
    // jest.runOnlyPendingTimers();
  });

  it('should logoff when logoff called', async (done) => {
    fetch.mockReturnValueOnce(fakeResponseFactory({
      user_name: 'foobar',
      user_id: '1',
      token: '123BABEFACE',
    }));

    const { queryByTestId } = render(
      <CtxHarness>
        <Login>
          <UserState />
        </Login>
      </CtxHarness>
    );

    const lgn = queryByTestId('login');
    expect(lgn).not.toBeNull();
    
    fireEvent.click(lgn as HTMLElement);

    expect(fetch).toHaveBeenCalled();
    Promise.resolve().then(() => jest.advanceTimersByTime(30));
    await waitFor(() => screen.getByTestId('logged-in'));

    const btn = queryByTestId('logout');
    expect(btn).not.toBeNull();

    fireEvent.click(btn as HTMLElement);

    Promise.resolve().then(() => jest.advanceTimersByTime(30));
    expect(queryByTestId('logged-in')).not.toBeInTheDocument();
    done();
  });

  it('should not log in if the saved user is stale', async () => {
    // Having trouble testing this now that localStorage is called only
    // on first render.
    // const storage = localStorageMockFactory();
    // const now = Date.now();
    // const mockSavedUser = JSON.stringify({
    //   user_name: 'foobar',
    //   user_id: '1',
    //   token: '123BABEFACE',
    //   userError: null,
    //   lastAuthed: now - (1000 * 60 * 60 * 24),
    // });

    // storage.getItem.mockReturnValueOnce(mockSavedUser);
    // globalThis.localStorage = storage;
    // fetch.mockReturnValueOnce(fakeResponseFactory(mockSavedUser));

    // const { queryByTestId } = render(
    //   <CtxHarness>
    //     <Login>
    //       <UserState />
    //     </Login>
    //   </CtxHarness>
    // );

    // expect(queryByTestId('user_name')).not.toBeInTheDocument();
    // expect(queryByTestId('user_id')).not.toBeInTheDocument();
    // expect(queryByTestId('token')).not.toBeInTheDocument();
    // expect(queryByTestId('lastAuthed')).not.toBeInTheDocument();
    // expect(queryByTestId('userError')).not.toBeInTheDocument();

    // act(() => {
    //   fireEvent.click(queryByTestId('login') as HTMLElement);
    // });

    // Promise.resolve().then(() => jest.advanceTimersByTime(30));
    // await waitFor(() => screen.getByTestId('logged-in'));
  });

  

  it('should reset the timeout when resetLogoffTimeout is called', () => {
    // haven't figured out a good way to test this yet
  });
});
