const { resolve } = require('path');
const { readdir } = require('fs').promises;

const path = require('path');
const fse = require('fs-extra');

const packageJSON = require('../../../../package.json');
const packageName = packageJSON.name;

const sourceClient = path.join( __dirname, '../../../../src/client');
const sourceServer = path.join( __dirname, '../../../../src/server');
const prodRoot = path.join(__dirname, '../../../../prod');
const prodClient = path.join(__dirname, `../../../../prod/${packageName}/client`);
const prodServer = path.join(__dirname, `../../../../prod/${packageName}/server`);

// Gets all files in target directory, including subfolders
async function getAllFiles(dir) {
	const dirents = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(dirents.map((dirent) => {
		const res = resolve(dir, dirent.name);
		return dirent.isDirectory() ? getAllFiles(res) : res;
	}));
	return Array.prototype.concat(...files);
}

// Gets number of subfolders for a file, with the client/server folders considered as root
// Includes step by step process because it's complicated
function getFileDepth(file) {
	// '/Users/fakeAccountName/Documents/GitHub/mini-game-invasion/prod/invasion/client/index.ts'
	const splitPath = file.split(packageName);
	// ['/Users/fakeAccountName/Documents/GitHub/mini-game-', '/prod/', '/client/index.ts']
	const minigamePath = splitPath[splitPath.length - 1];
	// '/client/index.ts'
	let fileDepth = minigamePath.split('/').length;
	// ['', 'client', 'index.ts'], length = 3
	fileDepth -= 3;
	// -3 to set client/server folders as root
	fileDepth += 4;
	// +4 because of where minigames are located in the component repo
	return fileDepth
	// return 4
}

// Adds one line to the start of a file
function addLineAtStart(file, newLine) {
	return (newLine + '\n').concat(file);
}

//////////
//////////
//////////
//////////
//////////

// Delete any old builds
fse.removeSync(prodRoot);

// Copy src folders into prod
fse.copySync(sourceClient, prodClient);
fse.copySync(sourceServer, prodServer);

// Get client and server files
getAllFiles(prodClient)
	.then(files => processFiles(files, 'client'))
	.catch(e => console.error(e));

getAllFiles(prodServer)
	.then(files => processFiles(files, 'server'))
	.catch(e => console.error(e));

function processFiles(files, clientOrServer) {
	// Filter out non-ts files
	const typescriptFiles = files.filter(abc => abc.endsWith('.ts'));

	// Operate on text
	typescriptFiles.forEach(file => {
		fse.readFile(file, 'utf8', function (error, data) {
			if (error) { return console.log(error);	}

			// Prepare the file depth string
			const fileDepth = getFileDepth(file);
			const directoryPath = '../'.repeat(fileDepth);

			// Changes for client OR server
			let editedFile = data;
			switch (clientOrServer) {
				case 'client':
					editedFile = editedFile.replaceAll('@smiletime/mini-game-sdk', () => `${directoryPath}Client/Common/MiniGames/MiniGames`);
					// Phaser: Remove imports
					editedFile = editedFile.replaceAll(`import Phaser from "phaser";\n`, () => '');
					editedFile = editedFile.replaceAll(`import Phaser from 'phaser';\n`, () => '');
					// Phaser: Add globalThis to Phaser calls
					editedFile = editedFile.replaceAll('Phaser.', () => 'globalThis.Phaser.');
					// Phaser: Add constructor to main Phaser game
					editedFile = editedFile.replaceAll('extends globalThis.Phaser.Game {', () => `extends globalThis.Phaser.Game {\n\tconstructor(config: any) { super(config); }`);
					// Phaser: Change types to :any
					editedFile = editedFile.replaceAll(/:globalThis\.Phaser[A-Z.a-z]*/g, () => ':any');
					editedFile = editedFile.replaceAll(/as globalThis\.Phaser[A-Z.a-z]*/g, () => 'as any');
					break;
				case 'server':
					editedFile = editedFile.replaceAll('@smiletime/mini-game-sdk', () => `${directoryPath}Server/Common/MiniGames/MiniGames`);
					break;
				default: break;
			}

			// Changes for client AND server
			editedFile = editedFile.replaceAll('setTimeout', () => 'setTraceableTimeout');
			editedFile = editedFile.replaceAll('setInterval', () => 'setTraceableInterval');
			editedFile = editedFile.replaceAll('clearTimeout', () => 'clearTraceableTimeout');
			editedFile = editedFile.replaceAll('clearInterval', () => 'clearTraceableInterval');

			if (editedFile.includes('setTraceableTimeout')) {
				editedFile = addLineAtStart(editedFile, `import { setTraceableTimeout } from '${directoryPath}clientAndServerIndex';`);
			}
			if (editedFile.includes('setTraceableInterval')) {
				editedFile = addLineAtStart(editedFile, `import { setTraceableInterval } from '${directoryPath}clientAndServerIndex';`);
			}
			if (editedFile.includes('clearTraceableTimeout')) {
				editedFile = addLineAtStart(editedFile, `import { clearTraceableTimeout } from '${directoryPath}clientAndServerIndex';`);
			}
			if (editedFile.includes('clearTraceableInterval')) {
				editedFile = addLineAtStart(editedFile, `import { clearTraceableInterval } from '${directoryPath}clientAndServerIndex';`);
			}

			// Save the edited file
			fse.writeFile(file, editedFile, 'utf8', function (error) {
				if (error) return console.log(error);
			});
		});
	});
}