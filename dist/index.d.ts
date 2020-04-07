/**
 * index.js
 *
 * @description Hook for the context/context provider for the logged-in user.
 * @author jarsmith@indot.in.gov
 * @license MIT
 * @copyright INDOT, 2019
 */
import React from 'react';
import PropTypes from 'prop-types';
export interface IUserData {
    user_name: string;
    user_id: number;
    token: string;
    userError: Error | null;
    lastAuthed: number | null;
}
declare type UserReducerAction = {
    type: 'login';
    credentials: IUserData;
} | {
    type: 'error';
    error: Error;
} | {
    type: 'reauth';
} | {
    type: 'logoff';
} | {
    type: 'clear error';
};
/**
 * @description Constructs a Basic HTTP Auth header.
 * @param {string} userName User name.
 * @param {string} userPass User password.
 * @returns {Headers} The constructed Header object.
 */
export declare const authHeader: (userName: string, userPass: string) => Headers;
declare const useUserState: () => [IUserData, (action: UserReducerAction) => void];
declare const useLogin: (fetchFn?: typeof fetch) => [(userName: string, userPass: string) => void, () => void, (timeout?: number | undefined) => void];
/**
 * @description The user context provider.
 *
 * @param {Object} [props] The destructured props object.
 * @param {Any} props.children The children to render.
 * @returns {Function} The user context provider.
 */
declare const UserContextProvider: {
    ({ children }: {
        children: React.ReactNode;
    }): JSX.Element;
    propTypes: {
        children: PropTypes.Validator<string | number | boolean | {} | PropTypes.ReactElementLike | PropTypes.ReactNodeArray>;
    };
};
declare const useUser: () => IUserData;
export { useUser, useLogin, UserContextProvider, };
export default useUserState;
