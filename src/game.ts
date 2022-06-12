import { Client } from './client';
import { emitter, Events } from './emitter';
import { Server } from './server';
import './game.css';
import { User } from './user';
import { uniqueNamesGenerator, Config, names } from 'unique-names-generator';
import { createNanoEvents, Emitter } from 'nanoevents';

const clientEmitters: { [key: string]: Emitter<Events>} = {};

export async function initTestEnvironment(
	initServer: any, 
	initClient: any, 
	options?: {
		gameTag: string,
		clientSizes: string[],
	}
) {
	const clientSizes: string[] = options?.clientSizes ? options.clientSizes : [];
	const gameTag: string = options?.gameTag ? options.gameTag : 'unknown';

	const nameConfig: Config = {
		dictionaries: [names]
	}

	document.body.innerHTML = `
		<div class="games">
			<div class="client-screen">
				<strong>Scoreboard</strong>
				<ul class="mini-game-container scoreboard"></ul>
			</div>
		</div>
		<div class="new-client">
			<input class="client-name" type="text"/>
			<button class="add-client">Add Client</button>
		</div>
	`;

	const serverInstance = new Server(emitter, clientEmitters);

	initServer(serverInstance);

	const addClientButton: HTMLElement = document.body.querySelector('.add-client');
	const clientNameInput: HTMLInputElement = document.body.querySelector('.client-name');

	clientNameInput.value = uniqueNamesGenerator(nameConfig);

	const scoreboardElement: HTMLElement = document.querySelector('.scoreboard');

	serverInstance.emitter.on('scoresUpdated', (scores) => {
		scoreboardElement.innerHTML = '';

		const users = {...serverInstance.state.users};
		const scoreEntries = Object.entries(scores);
		scoreEntries.sort((a, b) => {
			if (a[1] < b[1]){
				return 1;
			}

			if (a[1] > b[1]){
				return -1;
			}

			return 0;
		});

		for (let i = 0; i < scoreEntries.length; i += 1) {
			const userId = scoreEntries[i][0];
			const userScore = scoreEntries[i][1];
			scoreboardElement.innerHTML += `<li class="user-score ${users[userId].isConnected ? 'online' : 'offline'}">
				<div class="rank">${i + 1}</div>
				<div class="avatar"><img src="${users[userId].getAvatarUrl()}"></div>
				<div class="name">${users[userId].name}</div>
				<div class="score">${userScore.toLocaleString()}</div>
			</li>`;
		}
	});

	serverInstance.emitter.on('message', (message: string, data: any, id?: string) => {
		if (id && clientEmitters[id]) {
			clientEmitters[id].emit('message', message, data);
		} else {
			Object.values(clientEmitters).forEach(clientEmitter => clientEmitter.emit('message', message, data));
		}
	});

	addClientButton.onclick = async () => {
		let clientName = clientNameInput.value;

		if (clientName.length == 0) {
			clientName = uniqueNamesGenerator(nameConfig);
		}

		await addClientScreen(new User(
			clientName,
			clientName,
			'https://avatars.dicebear.com/api/adventurer-neutral/' + clientName + '.svg',
			true,
		));
		
		clientNameInput.value = uniqueNamesGenerator(nameConfig);
	}

	let openClients = 0;
	const clients: any = {};

	async function addClientScreen(user: User): Promise<any> {
		serverInstance.emitter.emit('userConnected', user);

		document.body.querySelector('.games').insertAdjacentHTML('beforeend', `
			<div class="client-screen">
				<strong>${user.name} <span class="close-client close-client-${user.id}" onclick="closeClient()">x</span></strong>
				<div class="mini-game-container mini-game-container-${gameTag} ${user.id}"></div>
			</div>
		`);

		(document.body.querySelector(`.close-client-${user.id}`) as HTMLElement).onclick = (e) => {
			delete clientEmitters[user.id];
			if (typeof clients[user.id] === 'function') {
				clients[user.id]();
			}
			serverInstance.emitter.emit('userDisconnected', user);
			(e.target as HTMLElement).closest('.client-screen').remove();
			openClients -= 1;
		};

		const miniGameContainer: HTMLElement = document.body.querySelector('.' + user.id);

		if (clientSizes.length > openClients) {
			if (clientSizes[openClients] === 's') {
				miniGameContainer.style.width = '320px';
				miniGameContainer.style.height = '200px';
			} else if (clientSizes[openClients] === 'm') {
				miniGameContainer.style.width = '320px';
				miniGameContainer.style.height = '400px';
			} else if (clientSizes[openClients] === 'l') {
				miniGameContainer.style.width = '600px';
				miniGameContainer.style.height = '400px';
			} else {
				const clientSize = clientSizes[openClients].split('x');
				miniGameContainer.style.width = clientSize[0] + 'px';
				miniGameContainer.style.height = clientSize[1] + 'px';
			}
		}

		clientEmitters[user.id] = (createNanoEvents<Events>());

		clients[user.id] = await initClient(
			miniGameContainer, 
			new Client(
				user,
				serverInstance.state,
				serverInstance.functions,
				clientEmitters[user.id],
			)
		);

		openClients += 1;
	}

	for (let i = 0; i < 7; i += 1) {
		const clientName = uniqueNamesGenerator(nameConfig);

		await addClientScreen(new User(
			clientName,
			clientName,
			'https://avatars.dicebear.com/api/adventurer-neutral/' + clientName + '.svg',
			true,
		));
	}
}
