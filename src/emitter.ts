import { createNanoEvents } from 'nanoevents';
import { User } from './user';

export interface Events {
	setData: (key: string, data: any) => void,
	setPublic: (key: string, data: any) => void,
	setPrivate: (id: string, key: string, data: any) => void,
	userConnected: (user: User) => void,
	userDisconnected: (user: User) => void,
	usersUpdated: (users: { [key: string]: User }) => void,
	scoresUpdated: (scores: { [key: string]: number }) => void,
	message: (message: string, data: any, id?: string) => void,
}

export const emitter = createNanoEvents<Events>()
