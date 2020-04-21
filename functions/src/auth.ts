import * as Crypto from 'crypto-js';
import { Client } from '@hivechain/dhive';
import * as uuidv4 from 'uuid/v4';

import * as functions from 'firebase-functions';

// @ts-ignore
import * as hive from 'steem-js-patched';

const client = new Client(['https://anyx.io', 'https://api.openhive.network']);

hive.api.setOptions({ url: 'https://anyx.io' });

export class Auth {
    static async generateMemo(username: string) {
        const encryptedMessage = Crypto.AES.encrypt(`${username}::${uuidv4()}`, functions.config().keys.aes).toString();

        try {
            const res = await client.database.getAccounts([username]);

            const encryptedMemo = hive.memo.encode(functions.config().keys.steem, res[0].posting.key_auths[0][0], `#${encryptedMessage}`);

            return encryptedMemo;
        } catch (e) {
            throw new Error(e);
        }
    }

    static decryptAes(string: string) {
        return Crypto.AES.decrypt(string, functions.config().keys.aes).toString(Crypto.enc.Utf8).split('::');
    }
}
