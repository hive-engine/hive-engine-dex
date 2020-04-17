export async function customJson(username: string, jsonId: string, keyType: HiveKeychain.KeyType, jsonData: string, displayName: string): Promise<HiveKeychain.HiveKeyChainResponse> {
    return new Promise((resolve) => {
        window.hive_keychain.requestCustomJson(username, jsonId, keyType, jsonData, displayName, response => {
            resolve(response);
        });
    });
}

export async function requestTransfer(username: string, account: string, amount: string, memo: string, currency: HiveKeychain.CurrencyType): Promise<HiveKeychain.HiveKeyChainResponse> {
    return new Promise((resolve) => {
        window.hive_keychain.requestTransfer(username, account, amount, memo, currency, response => {
            resolve(response);
        });
    })
}
