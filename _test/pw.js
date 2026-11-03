/* playwright-core 解析：不同机器上安装位置不同，按候选列表依次尝试 */
'use strict';
const candidates = [
    process.env.PW_PATH,
    'C:/Users/14512/AppData/Roaming/npm/node_modules/openclaw/node_modules/playwright-core',
    'C:/Users/14512/.workbuddy/binaries/node/versions/22.22.2-2/node_modules/playwright-core',
    'playwright-core'
].filter(Boolean);
let pw = null;
for (const c of candidates) {
    try { pw = require(c); break; } catch (e) { /* 继续尝试 */ }
}
if (!pw) throw new Error('找不到 playwright-core，请用 PW_PATH 指定');
module.exports = pw;
