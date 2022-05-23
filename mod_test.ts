import { assert, assertEquals } from "https://deno.land/std@0.140.0/testing/asserts.ts";
import { stat } from "https://deno.land/std@0.140.0/node/fs/promises.ts"
import fs from "https://deno.land/std@0.140.0/node/fs.ts";
import { Buffer } from "https://deno.land/std@0.140.0/node/buffer.ts";
import { BlockStream2 } from "./mod.ts";

Deno.test("BlockStream2", async function() {
  const b = new BlockStream2(16);
	const fstr = fs.createReadStream("./mod_test.ts", { encoding: 'utf8' })
  fstr.pipe(b)
  b.resume();
	let totalBytes = 0;
	const stats = await stat("./mod_test.ts");
	await new Promise((resolve, reject) => {
		b.on("data", (data) => {
			assertEquals(data.byteLength, 16, 'chunks should be 16 bytes long');
			assert(Buffer.isBuffer(data));
			totalBytes += data.length;
		});
		b.on("error", reject);
		b.on('end', () => {
			const expectedBytes = stats.size + (16 - stats.size % 16)
			assertEquals(totalBytes, expectedBytes);
			resolve(undefined);
		});
	});
});

