/**
 * index.js
 *
 * @description Hook for the context/context provider for the logged-in user.
 * @author jarsmith@indot.in.gov
 * @license MIT
 * @copyright INDOT, 2019
 */

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import useDataStore from '@indot/react-ctx-store';
import { useLocalState } from '@indot/state-hooks';

import { emptyFn } from '@jasmith79/ts-utils';

export interface IUserData {
  user_name: string,
  user_id: number,
  token: string,
  userError: Error | null,

  // NOTE: depending on the sequence of events, this can drift from the
  // setTimeout that actually logs the user out, user can be logged in for
  // up to one hour after lastAuthed + LOGON_TIMEOUT under the right
  // circumstances.
  lastAuthed: number | null,
}

type UserReducerAction = { type: 'login', credentials: IUserData }
  | { type: 'error', error: Error }
  | { type: 'reauth' }
  | { type: 'logoff' }
  | { type: 'clear error' };

/**
 * @description Constructs a Basic HTTP Auth header.
 * @param {string} userName User name.
 * @param {string} userPass User password.
 * @returns {Headers} The constructed Header object.
 */
export const authHeader = (userName: string, userPass: string): Headers => new Headers({
  Authorization: `Basic ${btoa(`${userName}:${userPass}`)}`,
});

const DEFAULT_USER_DATA: IUserData = {
  user_name: '',
  user_id: 0,
  token: '',
  lastAuthed: null,
  userError: null,
};

const [useUserState, CtxProvider] = useDataStore<IUserData, UserReducerAction>(DEFAULT_USER_DATA);

const ONE_HOUR = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const LOGON_TIMEOUT = Number(
  process
    && process?.env?.REACT_APP_LOGON_TIMEOUT
  ) || ONE_DAY;

const useLogin = (fetchFn = fetch): [
  (userName: string, userPass: string) => void,
  () => void,
  (timeout?: number) => void,
] => {
  const userURL = (location?.origin === 'null' ? '' : location.origin)
    + (process.env.REACT_APP_BACKEND_URL || '')
    + '/user/auth';

  // This will appease the typechecker: since the type is different between node and the
  // browser this dodges the issue of typing it properly e.g. via ReturnType.
  // const timeoutHandle = useRef(setTimeout(emptyFn, 0));
  const [timeoutHandle, setTimeoutHandle] = useState(setTimeout(emptyFn, 0));
  const [localUser, setLocalUser] = useLocalState(userURL, DEFAULT_USER_DATA);
  const [loggedInUser, dispatch] = useUserState();
  const [headers, setHeaders] = useState<Headers>();
  const [trigger, setTrigger] = useState(false);

  const login = (userName: string, userPass: string) => {
    setHeaders(authHeader(userName, userPass));
    setTrigger(true);
  }

  const logoff = () => {
    setLocalUser(DEFAULT_USER_DATA);
    dispatch({ type: 'logoff' });
  };

  const resetLogoffTimeout = (timeout = LOGON_TIMEOUT) => {
    clearTimeout(timeoutHandle);
    setTimeoutHandle(setTimeout(logoff, timeout));
    dispatch({ type: 'reauth' });
  };

  useEffect(() => {
    if (!loggedInUser || !loggedInUser.token && localUser.token) {
      const userTimeUp = (localUser.lastAuthed || 0) + LOGON_TIMEOUT;
      const now = Date.now();

      if (
        localUser.token
        && userTimeUp > Date.now()
      ) {
        resetLogoffTimeout(Math.max((userTimeUp - now), ONE_HOUR));
        dispatch({ type: 'login', credentials: localUser });
      }
    }
  }, [localUser]);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const resp = await fetchFn(userURL, {
          method: 'POST',
          headers,
        });

        const data = await resp.json();
        const credentials = {
          ...data,
          lastAuthed: Date.now(),
          userError: null,
        };

        setLocalUser(credentials);
        dispatch({ type: 'login', credentials });
      } catch (error) {
        dispatch({ type: 'error', error });
      }
    }

    if (trigger) {
      getUserData();
      setTrigger(false);
    }
  }, [trigger]);

  return [login, logoff, resetLogoffTimeout];
};

/**
 * @description Reducer for the user state.
 *
 * @param {Object} state The previous state.
 * @param {Object} action The dispatched action.
 * @returns {Object} The new state.
 */
const reducer = (state: IUserData, action: UserReducerAction): IUserData => {
  switch (action.type) {
    case 'login':
      return {
        ...state,
        ...action.credentials,
      };

    case 'logoff':
      return DEFAULT_USER_DATA;

    case 'error':
      return {
        ...state,
        userError: action.error,
      };

    case 'reauth':
      return {
        ...state,
        lastAuthed: Date.now(),
      }

    case 'clear error':
      return {
        ...state,
        userError : null,
      };
  }
};

/**
 * @description The user context provider.
 *
 * @param {Object} [props] The destructured props object.
 * @param {Any} props.children The children to render.
 * @returns {Function} The user context provider.
 */
const UserContextProvider = ({ children }: { children: React.ReactNode }) => (
  <CtxProvider reducer={reducer}>
    {children}
  </CtxProvider>
);

UserContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const useUser = () => {
  const [user] = useUserState();
  return user;
};

export {
  useUser,
  useLogin,
  UserContextProvider,
};

export default useUserState;
