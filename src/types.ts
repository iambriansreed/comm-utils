export type GetUid = () => string;

export interface User {
    name: string;
    sessionId: string;
}

export interface ChannelAction {
    channel: string;
    user: User;
}

interface BaseEvent {
    channel: string;
    id: string;
    time: number;
    user: string;
}

export interface ChannelEvent<T = Record<string, any>> extends BaseEvent {
    data: T;
}

export interface SystemEvent extends BaseEvent {
    system: 'logout' | 'login';
}

export function isSystemEvent(e: ChannelEvent | SystemEvent): e is SystemEvent {
    return e && 'system' in e;
}

export function isErrorResponse(e: any): e is ErrorResponse {
    return e && 'code' in e;
}

interface ChannelBase {
    name: string;
    events: (ChannelEvent | SystemEvent)[];
    created: number;
}

/**
 * Stored server side and not exposed
 */
export interface ChannelStore extends ChannelBase {
    users: User[];
}

/**
 * Exposed client side for current channel
 */
export interface ClientChannel extends ChannelBase {
    users: string[];
}

/**
 * Exposed client side for all channels
 */

export interface ChannelAction {
    channel: string;
    user: User;
}

export interface EventAction<T = any> extends ChannelAction {
    data: ChannelEvent['data'];
}

export interface ChannelNameResponse {
    name: string;
}

export interface ErrorResponse {
    code: 'MaxUsers' | 'UsernameInvalid' | 'UsernameUnavailable';
}

export interface LoginResponse {
    channel: ClientChannel;
}

export interface LogoutResponse {
    channel: ClientChannel | null;
}

export const SocketEvent = {
    /**
     * payload: none
     * response: ChannelNameResponse
     */
    ChannelName: 'channel-name',
    /**
     * payload: EventAction
     * response: ChannelEvent
     */
    ChannelEvent: 'channel-event',
    /**
     * payload: ChannelAction
     * response: LoginResponse
     */
    ChannelLogin: 'channel-login',
    /**
     * payload: ChannelAction
     * response: LogoutResponse
     */
    ChannelLogout: 'channel-logout',
} as const;
