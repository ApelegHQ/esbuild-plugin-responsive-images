/* Copyright © 2021 Apeleg Limited.
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

import assert from 'node:assert/strict';

import * as x from 'respimg+file:./hubble_arp143.png?sizes=60w&outputFormats=jpeg,avif,webp';

assert.equal(x.width, 60);
assert.equal(x.height, 40);
assert.equal(x.originalWidth, 2000);
assert.equal(x.originalHeight, 1333);
assert.match(
	x.src,
	/^http:\/\/invalid\/assets\/hubble_arp143\.60w-[^./]+\.jpeg$/,
);
assert.ok(Array.isArray(x.sources));
assert.equal(x.sources.length, 3);

assert.ok(Array.isArray(x.sources[0]));
assert.equal(x.sources[0].length, 2);
assert.equal(x.sources[0][0], 'image/jpeg');
assert.match(
	x.sources[0][1],
	/^http:\/\/invalid\/assets\/hubble_arp143\.60w-[^./]+\.jpeg 60w$/,
);

assert.ok(Array.isArray(x.sources[1]));
assert.equal(x.sources[1].length, 2);
assert.equal(x.sources[1][0], 'image/avif');
assert.match(
	x.sources[1][1],
	/^http:\/\/invalid\/assets\/hubble_arp143\.60w-[^./]+\.avif 60w$/,
);

assert.ok(Array.isArray(x.sources[2]));
assert.equal(x.sources[2].length, 2);
assert.equal(x.sources[2][0], 'image/webp');
assert.match(
	x.sources[2][1],
	/^http:\/\/invalid\/assets\/hubble_arp143\.60w-[^./]+\.webp 60w$/,
);
