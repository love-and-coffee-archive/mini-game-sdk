export class User {
	constructor(
		public id: string,
		public name: string,
		private avatar: string,
		public isConnected: boolean
	) {

	}

	getAvatarUrl(size: number = 160) {
		return this.avatar + '?size=' + size;
	}
}
