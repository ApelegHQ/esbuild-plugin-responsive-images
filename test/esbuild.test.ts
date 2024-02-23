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
import ri from '../src/index.js';

import assert from 'node:assert/strict';
import { dirname } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Test', () => {
	describe('Import results in the right values', () => {
		for (const test of [
			'test-simple-toowide',
			'test-simple-narrow',
			'test-simple-outputFormat',
			'test-simple-multiple-outputFormats',
			'test-multiple-widths-and-outputFormats',
			'test-multiple-x-widths-and-outputFormats',
			'test-multiple-x-widths-and-outputFormats-displayWidth',
		]) {
			it(test, async function () {
				await esbuild
					.build({
						entryPoints: [path.join(__dirname, `${test}.ts`)],
						outdir: path.join(__dirname, 'build'),
						bundle: true,
						format: 'esm',
						publicPath: 'http://invalid/assets',
						plugins: [ri()],
						platform: 'node',
					})
					.then(() => {
						return import(path.join(__dirname, `build/${test}.js`));
					})
					.catch((e) => {
						console.error('Error while building');
						console.dir(e);
						process.exit(1);
					});
			});
		}
	});

	describe('Compilation fails', () => {
		const successfulCompilation = {};

		for (const test of [
			'test-error-no-descriptors',
			'test-error-mixed-descriptors',
		]) {
			it(test, async () => {
				await esbuild
					.build({
						entryPoints: [path.join(__dirname, `${test}.ts`)],
						outdir: path.join(__dirname, 'build'),
						bundle: true,
						format: 'esm',
						publicPath: 'http://invalid/assets',
						plugins: [ri()],
						platform: 'node',
						logLevel: 'silent',
					})
					.then(() => {
						throw successfulCompilation;
					})
					.catch((e) => {
						assert.ok(
							e !== successfulCompilation,
							'Compilation succeeded but it should not have',
						);
						assert.ok(
							e instanceof Error,
							'Error is not an Error object',
						);
						const err = (
							e as Error & {
								errors?: unknown;
							}
						).errors;
						assert.ok(Array.isArray(err), 'No error array');
						assert.equal(err.length, 1);
						assert.ok(
							err[0] instanceof Object,
							'Error description is not an object',
						);
						assert.equal(
							err[0].pluginName,
							'@exact-realty/esbuild-plugin-responsive-images',
						);
					});
			});
		}
	});
});
