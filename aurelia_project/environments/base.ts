export const baseEnvironmentConfiguration: Partial<EnvironmentInterface> = {
    siteName: 'Hive Engine.',
    defaultLocale: 'en',
    SCOT_API: 'https://scot-api.hive-engine.com/',
    HISTORY_API: 'https://history.hive-engine.com/',
    CONVERTER_API: 'https://converter-api.hive-engine.com/api/',
    FIREBASE_API: 'https://us-central1-steem-engine-dex.cloudfunctions.net/api/',
    maintenanceMode: false,
    disabledTokens: ['BTC', 'LTC', 'STEEM', 'SBD', 'BCC', 'XAP', 'XRP', 'GOLOS', 'DISNEY', 'AMAZON', 'VOICE', 'ETH', 'EOS', 'LASSE', 'TIME', 'R', 'SCTR', 'ALLAH', 'BNB', 'DONE', 'ETHER', 'LTCPEG', 'SBC'],
    peggedToken: 'HIVEP',
    features: {
        nfts: {
            enabled: true
        }
    }
};
