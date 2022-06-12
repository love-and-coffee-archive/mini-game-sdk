import { Emitter } from 'nanoevents';
import { Events } from './emitter';
import { State } from './state';
import { User } from './user';

export class Server {
	state: State = {
		public: {},
		private: {},
		users: {},
		scores: {},
	};

	functions: { [key: string]: (data?: any) => void} = {};

	constructor(
		public emitter: Emitter<Events>,
		private clientEmitters: { [key: string]: Emitter<Events>},
	) {
		this.emitter.on('userConnected', (user: User) => {
			this.state.users[user.id] = user;
			this.state.users[user.id].isConnected = true;
			this.setData('_users', this.state.users);

			this.emitter.emit('usersUpdated', this.state.users);

			if (this.state.scores[user.id] == null) {
				this.state.scores[user.id] = 0;
				this.setData('_scores', this.state.scores);
				this.emitter.emit('scoresUpdated', this.state.scores);
			}
		});

		this.emitter.on('userDisconnected', (user: User) => {
			this.state.users[user.id].isConnected = false;
			this.setData('_users', this.state.users);
			this.emitter.emit('usersUpdated', this.state.users);
		});

		this.emitter.on('setPublic', (key: string, data: any) => {
			const allClientEmitters = Object.values(this.clientEmitters);
			for (let i = 0; i < allClientEmitters.length; i += 1) {
				allClientEmitters[i].emit('setPublic', key, data);
			}
		});

		this.emitter.on('setPrivate', (id: string, key: string, data: any) => {
			const singleClientEmitter = this.clientEmitters[id];

			if (singleClientEmitter) {
				singleClientEmitter.emit('setPrivate', id, key, data);
			}
		});
	}

	setData(key: string, data: any, id?: string) {
		if (id) {
			this.setPrivateData(id, key, data);
		} else {
			this.setPublicData(key, data);
		}
	}

	getData(key: string, id?: string) {
		if (id) {
			this.getPrivateData(key, id);
		} else {
			this.getPublicData(key);
		}
	}

	register(key: string, callback: (caller: User, data?: any) => void) {
		this.functions[key] = callback;
	}
	
	setPublicData(key: string, data: any) {
		this.state.public[key] = data;
		this.emitter.emit('setPublic', key, data);
	}

	getPublicData(key: string) {
		return this.state.public[key];
	}

	setPrivateData(id: string, key: string, data: any) {
		if (this.state.private[id] == null) {
			this.state.private[id] = {};
		}

		this.state.private[id][key] = data;

		this.emitter.emit('setPrivate', id, key, data);
	}

	getPrivateData(id: string, key: string) {
		return this.state.private[id] ? this.state.private[id][key] : undefined;
	}

	setScore(id: string, score: number) {
		this.state.scores[id] = score;
		this.setData('_scores', this.state.scores);
		this.emitter.emit('scoresUpdated', this.state.scores);
	}

	getScore(id: string) {
		return this.state.scores[id] ?? 0;
	}

	getUsers() {
		return this.state.users;
	}

	sendMessage(message: string, data: any, id?: string) {
		this.emitter.emit('message', message, data, id);
	}
}
