import type { Socket } from 'socket.io';
import {
    SocketEvent,
    EventAction,
    ChannelEvent,
    ChannelNameResponse,
    ChannelAction,
    LoginResponse,
    ErrorResponse,
    LogoutResponse,
    ChannelStore,
    ClientChannel,
    SystemEvent,
    User,
    GetUid,
    isErrorResponse,
} from './types';
import getChannelName from './get-channel-name';

const channels: Record<ChannelStore['name'], ChannelStore> = {};

function removeFromList<T>(list: T[], predicate: (item: T) => boolean) {
    const index = list.findIndex(predicate);
    if (index > -1) list.splice(index, 1);
}

function SocketServer({
    defaultChannel,
    getUid,
    maxUsers,
    socket,
}: {
    defaultChannel?: string;
    getUid: GetUid;
    maxUsers: number;
    socket: Socket;
}) {
    // -

    const createChannel = (channelName: string, user?: User): ChannelStore | null => {
        if (channels[channelName]) {
            return null;
        }

        channels[channelName] = {
            created: Date.now(),
            events: [],
            name: channelName,
            users: user?.sessionId ? [user] : [],
        };

        return channels[channelName];
    };

    const channelForClient = (store: ChannelStore): ClientChannel => {
        return {
            ...store,
            users: store.users.map(({ name }) => name),
        };
    };

    const addEvent = ({ channel, user, data }: EventAction): ChannelEvent => {
        const nextEvent: ChannelEvent = {
            data,
            channel,
            time: Date.now(),
            user: user.name,
            id: getUid(),
        };

        channels[channel].events.push(nextEvent);

        return nextEvent;
    };

    const addSystemEvent = (channel: string, user: User, system: SystemEvent['system']): SystemEvent => {
        const nextEvent: SystemEvent = {
            system,
            channel,
            time: Date.now(),
            user: user.name,
            id: getUid(),
        };

        channels[channel].events.push(nextEvent);

        return nextEvent;
    };

    const channelLogin = ({ user, channel }: ChannelAction): LoginResponse | ErrorResponse => {
        if (!user.name || !user.sessionId) {
            return { code: 'UsernameInvalid' };
        }

        const usernameUnavailable = channels[channel]?.users.some(
            (u) => u.name === user.name && u.sessionId !== user.sessionId
        );

        if (usernameUnavailable) {
            return { code: 'UsernameUnavailable' };
        }

        if (!channels[channel]) {
            channels[channel] = createChannel(channel, user)!;
            return { channel: channelForClient(channels[channel]) };
        }

        if (channels[channel].users.length >= maxUsers) {
            return { code: 'MaxUsers' };
        }

        if (channels[channel].users.every((u) => u.sessionId !== user.sessionId))
            addSystemEvent(channel, user, 'login');

        channels[channel].users = [
            //
            ...channels[channel].users.filter((u) => u.name !== user.name),
            user,
        ];

        return {
            channel: channelForClient(channels[channel]),
        };
    };

    const channelLogout = ({ user, channel }: ChannelAction): LogoutResponse => {
        let clientChannel;

        // last user left, kill the channel unless it's the default channel
        if (channels[channel].users.length == 1 && channel !== defaultChannel) {
            delete channels[channel];
            clientChannel = null;
        } else {
            removeFromList(channels[channel].users, (u) => user.sessionId === u.sessionId);
            addSystemEvent(channel, user, 'logout');
            clientChannel = channelForClient(channels[channel]);
        }

        return {
            channel: clientChannel,
        } as LoginResponse;
    };

    if (defaultChannel) {
        channels[defaultChannel] = createChannel(defaultChannel)!;
    }

    socket.on(
        SocketEvent.ChannelEvent,
        //
        (payload: EventAction, callback?: (event: ChannelEvent | null) => void) => {
            if (typeof payload.data !== 'object') {
                callback?.(null);
                return;
            }

            const event = addEvent(payload);

            socket.broadcast.to(payload.channel).emit(SocketEvent.ChannelEvent, event);
            callback?.(event);
        }
    );

    socket.on(SocketEvent.ChannelName, (callback?: (response: ChannelNameResponse) => void) =>
        callback?.({ name: getChannelName() } as ChannelNameResponse)
    );

    socket.on(
        SocketEvent.ChannelLogin,
        (payload: ChannelAction, callback?: (response: LoginResponse | ErrorResponse) => void) => {
            const response = channelLogin(payload);

            if (isErrorResponse(response)) {
                callback?.(response);
                return;
            }

            socket.join(payload.channel);
            socket.broadcast.emit(SocketEvent.ChannelLogin, response);
            callback?.(response);
        }
    );

    socket.on(SocketEvent.ChannelLogout, (payload: ChannelAction, callback?: (response: LogoutResponse) => void) => {
        const response = channelLogout(payload);

        socket.broadcast.emit(SocketEvent.ChannelLogout, response);
        socket.leave(payload.channel);
        callback?.(response);
    });
}

export default SocketServer;
