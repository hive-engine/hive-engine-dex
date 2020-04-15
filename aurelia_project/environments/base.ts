export const baseEnvironmentConfiguration: Partial<EnvironmentInterface> = {
    siteName: 'Hive Engine.',
    defaultLocale: 'en',
    SCOT_API: 'https://scot-api.hive-engine.com/',
    HISTORY_API: 'https://accounts.hive-engine.com/',
    CONVERTER_API: 'https://converter-api.hive-engine.com/api/',
    FIREBASE_API: 'https://us-central1-steem-engine-dex.cloudfunctions.net/api/',
    maintenanceMode: false,
    disabledTokens: ['BTC', 'LTC', 'HIVE', 'HBD', 'BCC', 'XAP', 'XRP', 'GOLOS', 'DISNEY', 'AMAZON', 'VOICE', 'ETH', 'EOS', 'LASSE', 'TIME', 'R', 'SCTR', 'ALLAH', 'BNB', 'DONE', 'ETHER', 'LTCPEG', 'SBC'],
    peggedToken: 'SWAP.HIVE',
    features: {
        nfts: {
            enabled: true
        }
    }
};
