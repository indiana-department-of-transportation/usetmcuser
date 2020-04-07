"use strict";
/**
 * index.js
 *
 * @description Hook for the context/context provider for the logged-in user.
 * @author jarsmith@indot.in.gov
 * @license MIT
 * @copyright INDOT, 2019
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const prop_types_1 = __importDefault(require("prop-types"));
const react_ctx_store_1 = __importDefault(require("@indot/react-ctx-store"));
const state_hooks_1 = require("@indot/state-hooks");
const ts_utils_1 = require("@jasmith79/ts-utils");
/**
 * @description Constructs a Basic HTTP Auth header.
 * @param {string} userName User name.
 * @param {string} userPass User password.
 * @returns {Headers} The constructed Header object.
 */
exports.authHeader = (userName, userPass) => new Headers({
    Authorization: `Basic ${btoa(`${userName}:${userPass}`)}`,
});
const DEFAULT_USER_DATA = {
    user_name: '',
    user_id: 0,
    token: '',
    lastAuthed: null,
    userError: null,
};
const [useUserState, CtxProvider] = react_ctx_store_1.default(DEFAULT_USER_DATA);
const ONE_HOUR = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const LOGON_TIMEOUT = Number(process
    && ((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.REACT_APP_LOGON_TIMEOUT)) || ONE_DAY;
const useLogin = (fetchFn = fetch) => {
    const userURL = ((location === null || location === void 0 ? void 0 : location.origin) === 'null' ? '' : location.origin)
        + (process.env.REACT_APP_BACKEND_URL || '')
        + '/user/auth';
    // This will appease the typechecker: since the type is different between node and the
    // browser this dodges the issue of typing it properly e.g. via ReturnType.
    // const timeoutHandle = useRef(setTimeout(emptyFn, 0));
    const [timeoutHandle, setTimeoutHandle] = react_1.useState(setTimeout(ts_utils_1.emptyFn, 0));
    const [localUser, setLocalUser] = state_hooks_1.useLocalState(userURL, DEFAULT_USER_DATA);
    const [loggedInUser, dispatch] = useUserState();
    const [headers, setHeaders] = react_1.useState();
    const [trigger, setTrigger] = react_1.useState(false);
    const login = (userName, userPass) => {
        setHeaders(exports.authHeader(userName, userPass));
        setTrigger(true);
    };
    const logoff = () => {
        setLocalUser(DEFAULT_USER_DATA);
        dispatch({ type: 'logoff' });
    };
    const resetLogoffTimeout = (timeout = LOGON_TIMEOUT) => {
        clearTimeout(timeoutHandle);
        setTimeoutHandle(setTimeout(logoff, timeout));
        dispatch({ type: 'reauth' });
    };
    react_1.useEffect(() => {
        if (!loggedInUser || !loggedInUser.token && localUser.token) {
            const userTimeUp = (localUser.lastAuthed || 0) + LOGON_TIMEOUT;
            const now = Date.now();
            if (localUser.token
                && userTimeUp > Date.now()) {
                resetLogoffTimeout(Math.max((userTimeUp - now), ONE_HOUR));
                dispatch({ type: 'login', credentials: localUser });
            }
        }
    }, [localUser]);
    react_1.useEffect(() => {
        const getUserData = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const resp = yield fetchFn(userURL, {
                    method: 'POST',
                    headers,
                });
                const data = yield resp.json();
                const credentials = Object.assign(Object.assign({}, data), { lastAuthed: Date.now(), userError: null });
                setLocalUser(credentials);
                dispatch({ type: 'login', credentials });
            }
            catch (error) {
                dispatch({ type: 'error', error });
            }
        });
        if (trigger) {
            getUserData();
            setTrigger(false);
        }
    }, [trigger]);
    return [login, logoff, resetLogoffTimeout];
};
exports.useLogin = useLogin;
/**
 * @description Reducer for the user state.
 *
 * @param {Object} state The previous state.
 * @param {Object} action The dispatched action.
 * @returns {Object} The new state.
 */
const reducer = (state, action) => {
    switch (action.type) {
        case 'login':
            return Object.assign(Object.assign({}, state), action.credentials);
        case 'logoff':
            return DEFAULT_USER_DATA;
        case 'error':
            return Object.assign(Object.assign({}, state), { userError: action.error });
        case 'reauth':
            return Object.assign(Object.assign({}, state), { lastAuthed: Date.now() });
        case 'clear error':
            return Object.assign(Object.assign({}, state), { userError: null });
    }
};
/**
 * @description The user context provider.
 *
 * @param {Object} [props] The destructured props object.
 * @param {Any} props.children The children to render.
 * @returns {Function} The user context provider.
 */
const UserContextProvider = ({ children }) => (react_1.default.createElement(CtxProvider, { reducer: reducer }, children));
exports.UserContextProvider = UserContextProvider;
UserContextProvider.propTypes = {
    children: prop_types_1.default.node.isRequired,
};
const useUser = () => {
    const [user] = useUserState();
    return user;
};
exports.useUser = useUser;
exports.default = useUserState;
//# sourceMappingURL=index.js.map