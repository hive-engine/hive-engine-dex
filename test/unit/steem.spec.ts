/* eslint-disable no-undef */
import { getAccount, hiveSignerJson, hiveSignerJsonId, steemConnectTransfer } from 'common/hive';
import * as functions from 'common/functions';

import hive from 'steem';

jest.mock('steem');

describe('Hive', () => {
    afterEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        fetchMock.resetMocks();
    });

    test('getAccount returns a found user', async () => {
        hive.api.getAccountsAsync.mockReturnValue(Promise.resolve([{ username: 'beggars' }]));

        const user = await getAccount('beggars');

        expect(user).toEqual({ username: 'beggars' });
    });

    test('getAccount cannot find a user', async () => {
        hive.api.getAccountsAsync.mockReturnValue(Promise.resolve([]));

        const user = await getAccount('fsdfsdf');

        expect(user).toBeNull();
    });

    test('getAccount is rejected', async () => {
        hive.api.getAccountsAsync.mockReturnValue(Promise.reject('There was a problem'));

        await expect(getAccount('doesnotexist123')).rejects.toStrictEqual(new Error('There was a problem'));
    });

    test('hiveSignerJson calls popupCenter with formatted arguments, active key and url', () => {
        window.open = jest.fn();

        const spy = jest.spyOn(functions, 'popupCenter');

        hiveSignerJson('beggars', 'active', { value: 'aggroed' }, Function);

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('json=%7B%22value%22:%22aggroed%22%7D'), 'hivesigner', 500, 560);
    });

    test('hiveSignerJson calls popupCenter with formatted arguments, posting key and url', () => {
        window.open = jest.fn();

        const spy = jest.spyOn(functions, 'popupCenter');

        hiveSignerJson('beggars', 'posting', { value: 'aggroed' }, Function);

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('json=%7B%22value%22:%22aggroed%22%7D'), 'hivesigner', 500, 560);
    });

    test('hiveSignerJsonId calls popupCenter with formatted arguments, active key and url', () => {
        window.open = jest.fn();

        const spy = jest.spyOn(functions, 'popupCenter');

        hiveSignerJsonId('beggars', 'active', 'test', { value: 'aggroed' }, Function);

        const url =
            'https://hivesigner.com/sign/custom-json?required_posting_auths=%5B%5D&required_auths=%5B%22beggars%22%5D&authority=active&id=test&json=%7B%22value%22:%22aggroed%22%7D';

        expect(spy).toHaveBeenCalledWith(url, 'hivesigner', 500, 560);
    });

    test('hiveSignerJsonId calls popupCenter with formatted arguments, posting key and url', () => {
        window.open = jest.fn();

        const spy = jest.spyOn(functions, 'popupCenter');

        hiveSignerJsonId('beggars', 'posting', 'test', { value: 'aggroed' }, Function);

        const url =
            'https://hivesigner.com/sign/custom-json?required_posting_auths=%5B%22beggars%22%5D&id=test&json=%7B%22value%22:%22aggroed%22%7D';

        expect(spy).toHaveBeenCalledWith(url, 'hivesigner', 500, 560);
    });

    test('steemConnectTransfer creates transaction url for steem connect', () => {
        window.open = jest.fn();

        const spy = jest.spyOn(functions, 'popupCenter');

        steemConnectTransfer('beggars', 'aggroed', '1.000 HIVE', 'Test', Function);

        const url = 'https://hivesigner.com/sign/transfer?&from=beggars&to=aggroed&amount=1.000%20HIVE&memo=Test';

        expect(spy).toHaveBeenCalledWith(url, 'hivesigner', 500, 560);
    });
});
