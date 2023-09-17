import {
    ChannelEvent,
    LoginResponse,
    LogoutResponse,
    SocketEvent,
    ChannelNameResponse,
    ChannelAction,
    ErrorResponse,
    EventAction,
} from './types';

function SocketClient(socket: any) {
    /**
     *
     * @returns
     *
     * useEffect(onMount({...serverSideCallbacks}), [])
     */
    const onMount =
        ({
            onConnect,
            onConnectError,
            onChannelEvent,
            onChannelLogin,
            onChannelLogout,
        }: {
            onConnect: () => void;
            onConnectError: (error: any) => void;
            onChannelEvent: (channelEvent: ChannelEvent) => void;
            onChannelLogin: (response: LoginResponse) => void;
            onChannelLogout: (response: LogoutResponse) => void;
        }) =>
        () => {
            onConnect && socket.on('connect', onConnect);
            onConnectError && socket.on('connect_error', onConnectError);
            onChannelEvent && socket.on(SocketEvent.ChannelEvent, onChannelEvent);
            onChannelLogin && socket.on(SocketEvent.ChannelLogin, onChannelLogin);
            onChannelLogout && socket.on(SocketEvent.ChannelLogout, onChannelLogout);

            socket.connect();

            return () => {
                onConnect && socket.off('connect', onConnect);
                onConnectError && socket.off('connect_error', onConnectError);
                onChannelEvent && socket.off(SocketEvent.ChannelEvent, onChannelEvent);
                onChannelLogin && socket.off(SocketEvent.ChannelLogin, onChannelLogin);
                onChannelLogout && socket.off(SocketEvent.ChannelLogout, onChannelLogout);
            };
        };

    const getNewChannel = async () =>
        socket.emitWithAck(SocketEvent.ChannelName).then(({ name }: ChannelNameResponse) => name);

    const login = async (action: ChannelAction): Promise<LoginResponse | ErrorResponse> => {
        return socket.emitWithAck(SocketEvent.ChannelLogin, action);
    };

    const logout = async (action: ChannelAction): Promise<LogoutResponse | ErrorResponse> => {
        return await socket.emitWithAck(SocketEvent.ChannelLogout, action);
    };

    const sendEvent = async (action: EventAction): Promise<ChannelEvent | ErrorResponse> => {
        return await socket.emitWithAck(SocketEvent.ChannelEvent, action);
    };

    return {
        getNewChannel,
        login,
        logout,
        onMount,
        sendEvent,
    };
}

export default SocketClient;
