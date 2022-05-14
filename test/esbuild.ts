/* Copyright © 2021 Exact Realty Limited.
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */

import esbuild from 'esbuild';
import path from 'node:path';
import ri from '../src';

esbuild
	.build({
		entryPoints: [path.join(__dirname, 'test.ts')],
		outdir: path.join(__dirname, 'build'),
		bundle: true,
		format: 'cjs',
		publicPath: 'http://invalid/assets',
		plugins: [ri()],
	})
	.then(() => {
		return import(path.join(__dirname, 'build/test.js'));
	})
	.catch((e) => {
		console.error('Error while building');
		console.dir(e);
		process.exit(1);
	});
