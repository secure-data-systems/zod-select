import fs from 'node:fs';
import Path from 'node:path';

function rmDirSync(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach((file, index) => {
			const curPath = Path.join(path, file);
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				rmDirSync(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

if (fs.existsSync(`${process.cwd()}/dist`)) {
	rmDirSync(`${process.cwd()}/dist`, { recursive: true });
}