import { Emitter } from 'nanoevents';
import { Events } from './emitter';
import { State } from './state';
import { User } from './user';

export class Client {
	constructor(
		public user: User,
		private state: State,
		private functions: { [key: string]: (caller: User, data?: any) => void},
		public emitter: Emitter<Events>
	) {
		this.emitter.on('setPrivate', (id: string, key: string, data: any) => {
			if (this.user.id === id) {
				this.emitter.emit('setData', key, data)
			}
		});
		this.emitter.on('setPublic', (key: string, data: any) => {
			if (this.state.private?.[this.user.id]?.[key] === undefined) {
				this.emitter.emit('setData', key, data)
			}
		});
	}

	async call(key: string, data?: any) {
		if (typeof this.functions[key] === 'function') {
			return this.functions[key](this.user, data);
		}

		throw new Error('Function "' + key + '" not defined!');
	}

	getData(key: string) {
		if (this.state.private?.[this.user.id]?.[key] === undefined) {
			return this.state.public[key];
		}
		
		return this.state.private?.[this.user.id]?.[key];
	}

	getScores() {
		return this.state.scores;
	}

	getUsers() {
		return this.state.users;
	}
}
