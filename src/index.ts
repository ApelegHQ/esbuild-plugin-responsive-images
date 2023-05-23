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
import sharp from 'sharp';

const supportedFormats = {
	jpeg: 'jpeg',
	jpg: 'jpeg',
	webp: 'webp',
	avif: 'avif',
	png: 'png',
};

const mimeMap = {
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	avif: 'image/avif',
	png: 'image/png',
};

export default (): esbuild.Plugin => ({
	name: '@exact-realty/esbuild-plugin-responsive-images',
	setup(build) {
		build.onLoad(
			{
				filter: /.*/,
				namespace:
					'@exact-realty/esbuild-plugin-responsive-images/loader',
			},
			async (args) => {
				const { path, pluginData } = args;

				if (
					!(pluginData instanceof Object) ||
					!(pluginData.params instanceof URLSearchParams)
				) {
					return {
						errors: [
							{
								text: 'Invalid pluginData',
							},
						],
					};
				}

				const inputFormat = pluginData.params.get('inputFormat');
				const outputFormats = pluginData.params.has('outputFormats')
					? Array.from(
							new Set(
								String(pluginData.params.get('outputFormats'))
									.split(',')
									.map(
										(t) =>
											supportedFormats[
												t.trim() as keyof typeof supportedFormats
											] ?? t,
									),
							),
					  )
					: [];
				const sizes = pluginData.params.has('sizes')
					? Array.from(
							new Set(
								String(pluginData.params.get('sizes'))
									.split(',')
									.map((t) => t.trim()),
							),
					  ).sort(
							(a, b) =>
								Number(a.slice(0, -1)) - Number(b.slice(0, -1)),
					  )
					: [];
				const displayWidth =
					Math.round(Number(pluginData.params.get('displayWidth'))) ||
					1024;

				const errors = [];

				if (inputFormat && !(inputFormat in supportedFormats)) {
					errors.push({
						text: `Unsupported input format '${inputFormat}'. Must be one of ${Object.keys(
							supportedFormats,
						).join(', ')}.`,
					});
				}

				outputFormats.forEach((outputFormat) => {
					if (!(outputFormat in supportedFormats)) {
						errors.push({
							text: `Unsupported output format '${outputFormat}'. Must be one of ${Object.keys(
								supportedFormats,
							).join(', ')}.`,
						});
					}
				});

				if (sizes.length === 0) {
					errors.push({
						text: `At least one output size must be specified.`,
					});
				}

				const sizeValidation = sizes.reduce(
					(acc, cv) =>
						/^0*[1-9][0-9]*w$/.test(cv)
							? acc | 1
							: /^(0*[1-9][0-9]*(\.[0-9]*)?|0*\.0*[1-9][0-9]*)x$/.test(
									cv,
							  )
							? acc | 2
							: acc | 4,
					0,
				);

				if ((sizeValidation & 3) === 3) {
					errors.push({
						text: 'Invalid size description: mixed width descriptors (###w) and pixel density descriptors (###x)',
					});
				}

				if ((sizeValidation & 4) === 4) {
					errors.push({
						text: 'Invalid size description: invalid descriptions. Only width (###w) and pixel density density descriptors (###x) are supported.',
					});
				}

				if (errors.length) {
					return {
						errors,
					};
				}

				const image = sharp(path);
				const metadata = await image.metadata();

				if (outputFormats.length === 0) {
					if (
						metadata.format &&
						metadata.format in supportedFormats
					) {
						outputFormats.push(metadata.format);
					} else {
						return {
							errors: [
								{
									text: 'No output format specified, and unable to identify format in source image',
								},
							],
						};
					}
				}

				const resizedImages = (
					await Promise.all(
						sizes.map(async (size, i) => {
							let width = size.endsWith('w')
								? Number(size.slice(0, -1))
								: size.endsWith('x')
								? Math.round(
										Number(size.slice(0, -1)) *
											displayWidth,
								  )
								: NaN;

							if (!Number.isInteger(width)) {
								throw new Error('Invalid width');
							}

							if (
								metadata.width !== undefined &&
								width >= metadata.width
							) {
								if (i !== 0) {
									return;
								}
								width = metadata.width;
							}

							return [
								size,
								await image
									.clone()
									.resize({ width, withoutEnlargement: true })
									.toFormat('png')
									.toBuffer({ resolveWithObject: true }),
							];
						}),
					)
				).filter(Boolean) as [
					string,
					{ info: sharp.OutputInfo; data: Buffer },
				][];

				const resizedAndFormattedImages = (
					await Promise.all(
						resizedImages.flatMap(([size, image]) => {
							return outputFormats.map(async (format) => {
								if (image.info.format === format) {
									return [size, format, image];
								}

								switch (format) {
									case 'jpeg':
										return [
											size,
											format,
											await sharp(image.data)
												.toFormat(format, {
													mozjpeg: true,
												})
												.toBuffer({
													resolveWithObject: true,
												}),
										];
									case 'png':
									case 'avif':
									case 'webp':
										return [
											size,
											format,
											await sharp(image.data)
												.toFormat(format)
												.toBuffer({
													resolveWithObject: true,
												}),
										];
								}
							});
						}),
					).finally(() => {
						resizedImages.length = 0;
					})
				).filter(Boolean) as [
					string,
					string,
					{ info: sharp.OutputInfo; data: Buffer },
				][];

				const srcsetMap = resizedAndFormattedImages.reduce(
					(acc, [size, format, data], i) => {
						if (!(format in acc)) {
							acc[format] = [];
						}
						acc[format].push([size, data, i]);
						return acc;
					},
					Object.create(null),
				) as {
					[k: string]: [
						string,
						{ info: sharp.OutputInfo; data: Buffer },
						number,
					][];
				};

				const fallbackImage =
					'png' in srcsetMap && 'jpeg' in srcsetMap
						? srcsetMap['png'][0][1].info.size >
						  srcsetMap['jpeg'][0][1].info.size
							? 'jpeg'
							: 'png'
						: 'png' in srcsetMap
						? 'png'
						: 'jpeg' in srcsetMap
						? 'jpeg'
						: 'webp' in srcsetMap
						? 'webp'
						: Object.keys(srcsetMap)[0];

				return {
					contents: `
						${resizedAndFormattedImages
							.map(
								(d, i) =>
									`import _i${+i}_ from '${Buffer.from(
										args.path,
									).toString('base64')}.${+i}.${d[0].replace(
										'.',
										'-',
									)}.${d[1]}';`,
							)
							.join('')}

						
						export const src = _i${srcsetMap[fallbackImage][0][2]}_;
						export const width = ${+srcsetMap[fallbackImage][0][1].info.width};
						export const height = ${+srcsetMap[fallbackImage][0][1].info.height};
						export const originalWidth = ${metadata.width};
						export const originalHeight = ${metadata.height};
						export const sources = [
							${Object.entries(srcsetMap)
								.map(
									([format, variants]) =>
										'[' +
										JSON.stringify(
											mimeMap[
												(format as keyof typeof mimeMap) ??
													format
											],
										) +
										',' +
										variants
											.map(([size, , i]) =>
												[
													`_i${+i}_`,
													JSON.stringify(' '),
													JSON.stringify(size),
												].join('+'),
											)
											.join('+ "," +') +
										']',
								)
								.join(',')}
						];`,
					loader: 'js',
					pluginData: resizedAndFormattedImages,
				};
			},
		);

		build.onLoad(
			{
				filter: /.*/,
				namespace:
					'@exact-realty/esbuild-plugin-responsive-images/importer',
			},
			(args) => {
				const { pluginData } = args;

				if (!(pluginData instanceof Buffer)) {
					return {
						errors: [
							{
								text: `Invalid plugin data. Expecting Buffer.`,
							},
						],
					};
				}

				return {
					contents: pluginData,
					loader: 'file',
				};
			},
		);

		build.onResolve({ filter: /^respimg\+file:/ }, async (args) => {
			const { path, resolveDir } = args;

			const pathUrl = new URL(path);

			const result = await build.resolve(
				decodeURIComponent(pathUrl.pathname),
				{
					resolveDir,
					kind: 'import-statement',
				},
			);

			if (result.errors.length > 0) {
				return { errors: result.errors };
			}

			return {
				external: false,
				namespace:
					'@exact-realty/esbuild-plugin-responsive-images/loader',
				path: result.path,
				suffix: undefined,
				watchDirs: [],
				watchFiles: [result.path],
				pluginData: { params: pathUrl.searchParams },
			};
		});

		build.onResolve(
			{
				filter: /.*/,
				namespace:
					'@exact-realty/esbuild-plugin-responsive-images/loader',
			},
			(args) => {
				const { path, pluginData } = args;

				const [origPathB64, indexS, size, format] =
					args.path.split('.');
				const index = +indexS;

				if (
					!Array.isArray(pluginData) ||
					!Number.isInteger(index) ||
					index < 0 ||
					index > pluginData.length ||
					!Array.isArray(pluginData[index]) ||
					!(pluginData[index][2] instanceof Object) ||
					!(pluginData[index][2].data instanceof Buffer)
				) {
					return {
						errors: [
							{
								text: `Invalid path or plugin data. Path: ${path}.`,
							},
						],
					};
				}

				const origPath = Buffer.from(origPathB64, 'base64').toString();

				const origPathWithoutExtension =
					origPath.lastIndexOf('.') > 0
						? origPath.slice(0, origPath.lastIndexOf('.'))
						: origPath;

				const name = [
					origPathWithoutExtension,
					size.replace('-', '.'),
					format,
				].join('.');

				return {
					external: false,
					namespace:
						'@exact-realty/esbuild-plugin-responsive-images/importer',
					path: name,
					suffix: undefined,
					watchDirs: [],
					watchFiles: [],
					pluginData: pluginData[index][2].data,
				};
			},
		);
	},
});
