# esbuild plugin for responsive images

## How to use

### Installing

```sh
npm i -D @exact-realty/esbuild-plugin-responsive-images
```

### Configuring esbuild

In the file you have your configuration, first import this plugin

```js
const responsiveImages = require('@exact-realty/esbuild-plugin-responsive-images');
```

Or using ES module syntax:

```js
import responsiveImages from '@exact-realty/esbuild-plugin-responsive-images';
```

Then, in your esbuild configuration, add `responsiveImages()` to the `plugins` list. Minimal example:

```js
const esbuild = require('esbuild');
const responsiveImages = require('@exact-realty/esbuild-plugin-responsive-images');

await esbuild
	.build({
		entryPoints: ['index.js'],
		outdir: 'build',
		bundle: true,
		format: 'cjs',
		plugins: [responsiveImages()],
	});
```

### Getting responsive images

In `index.js`, import your images like this:

```js
const image = require('respimg+file:./your-image.png?sizes=12w,13w');
```

Note that the imported argument is treated as an URI and must follow the URI rules.


#### Supported arguments

- `sizes`: Comma-separated list of width descriptors (###w) or pixel density descriptors (###x). It's not possible to mix descriptor types, and at least one descriptor must be given.
- `outputFormats`: Comma-separated list of output formats. If not given, it defaults to the same as the input format.
- `displayWidth`: For density descriptors, the intended display width. It defaults to 1024px and has no effect on width descriptors.

#### Result

The import will return something like this:

```js
{
	width: 2000
	height: 1333,
	originalWidth: 133,
	originalHeight: 200,
	src: 'http://example.com/assets/img1.200w-AAAAAAAA.png',
	sources: [
		[
			'image/png',
			'http://example.com/assets/img1.200w-AAAAAAAA.png 200w,http://example.com/assets/img1.300w-BBBBBBBB.png 300w'
		]
	],
}
```

The different values are intended to be used as follows:

`src` refers to the fallback image (the inner `<img>` element when using the `<picture>` element; otherwise, the `src` value of `<img>`), and `width` and `height` refer to the dimensions of this fallback image.

`originalWidth` and `originalHeight` refer to the dimensions of the original image. Like `width` and `height`, these could be helpful in certain situations where the aspect ratio is needed.

`sources` refers to the different `srcset` and `type` attributes for `<source>` elements (or the single `srcset` attribute of the `<img>` element if not using `<picture>`).

Thus, this could result in the following HTML:

```html
<picture>
	<!-- Note that there could be many <source> elements, one for each entry in the sources array -->
	<source type="image/png" srcset="http://example.com/assets/img1.200w-AAAAAAAA.png 200w,http://example.com/assets/img1.300w-BBBBBBBB.png 300w" sizes="100%" />
	<img src="http://example.com/assets/img1.200w-AAAAAAAA.png" alt="description" />
</picture>
```

Since in this case there is a single source, it's possible to use an `<img>` element directly, without a `<picture>` container:

```html
<img src="http://example.com/assets/img1.200w-AAAAAAAA.png" alt="description" srcset="http://example.com/assets/img1.200w-AAAAAAAA.png 200w,http://example.com/assets/img1.300w-BBBBBBBB.png 300w" sizes="100%" />
```
