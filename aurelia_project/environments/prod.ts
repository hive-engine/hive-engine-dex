import { baseEnvironmentConfiguration } from 'base-environment';

export const environment: Partial<EnvironmentInterface> = {
    ...baseEnvironmentConfiguration,
    debug: false,
    testing: false,
    chainId: 'ssc-mainnet1',
    RPC_URL: 'https://api.hive-engine.com/rpc2',
    NODE_API_URL: 'https://node-api.hive-engine.com/v1/',
    ACCOUNTS_API_URL: 'https://api.hive-engine.com/accounts',
    CONVERTER_API: 'https://converter-api.hive-engine.com/api',
    nativeToken: 'BEE',
    hivepAccount: 'steem-peg',
};
