import { User } from './user';

export interface State {
	public: { [key: string]: any },
	private: { [key: string]: { [key: string]: any } },
	users: { [key: string]: User },
	scores: { [key: string]: number },
}
