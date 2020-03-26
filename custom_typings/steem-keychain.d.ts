// Copyright (c) 2019 Dwayne Charrington <dwaynecharrington@gmail.com>
// This code is licensed under MIT license (see LICENSE for details)

declare namespace HiveKeychain {
    type CurrencyType = 'STEEM' | 'SBD';
    type KeyType = 'Memo' | 'Posting' | 'Active';
    type KeyTypeWithoutMemo = 'Posting' | 'Active';
    type HiveUnit = 'VESTS' | 'SP';

    interface HiveKeyChainResponse {
        data: {
            key: string;
            message: string;
            method: string;
            request_id: number;
            type: string;
            username: string;
        },
        error: string | null;
        message: string;
        request_id: number;
        result: {
            id: string
        } | null;
        success: boolean;
    }
    
    interface Keychain {
        requestHandshake(callback: Function): void;
    
        requestTransfer(
            account_name: string, 
            to_account: string, 
            amount: string, 
            memo: string, 
            currency: CurrencyType, 
            callback: (response: HiveKeyChainResponse) => void, enforce?: boolean): void;
    
        requestVerifyKey(
            account_name: string, 
            encrypted_message: string, 
            key_type: KeyType, 
            callback: (response: HiveKeyChainResponse) => void);
    
        requestPost(
            account_name: string, 
            title: string, 
            body: string, 
            parent_permlink: string, 
            parent_author: string, 
            json_metadata: string, 
            permlink: string, 
            callback: (response: HiveKeyChainResponse) => void);
    
        requestVote(
            account_name: string, 
            permlink: string, 
            author: string, 
            weight: string, 
            callback: (response: HiveKeyChainResponse) => void);
    
        requestCustomJson(
            account_name: string, 
            custom_json_id: string, 
            key_type: KeyType, 
            json: string,
            display_name: string,
            callback: (response: HiveKeyChainResponse) => void);
        
        requestSignBuffer(
            account_name: string, 
            message: string, 
            key_type: KeyTypeWithoutMemo, 
            callback: (response: HiveKeyChainResponse) => void): void;
        
        requestAddAccountAuthority(
            account_name: string, 
            authorized_account_name: string, 
            role: KeyTypeWithoutMemo,
            weight: string, 
            callback: (response: HiveKeyChainResponse) => void): void;
        
        requestRemoveAccountAuthority(
            account_name: string, 
            authorized_account_name: string, 
            role: KeyTypeWithoutMemo,
            callback: (response: HiveKeyChainResponse) => void): void;
    
        requestBroadcast(
            account_name: string,
            operations: any,
            key_type: KeyTypeWithoutMemo,
            callback: (response: HiveKeyChainResponse) => void): void;
    
        requestSignedCall(
            account_name: string,
            method: string,
            params: string,
            key_type: KeyTypeWithoutMemo,
            callback: (response: HiveKeyChainResponse) => void): void;
    
        requestSendToken(
            username: string,
            to: string,
            amount: string,
            memo: string,
            token: string,
            callback: (response: HiveKeyChainResponse) => void): void;
    
        requestDelegation(
            username: string,
            delegatee: string,
            amount: string,
            unit: HiveUnit,
            callback: (response: HiveKeyChainResponse) => void): void;
            
        requestWitnessVote(
            username: string,
            witness: string,
            vote: boolean,
            callback: (response: HiveKeyChainResponse) => void): void;
            
        requestPowerUp(
            username: string,
            to: string,
            amount: string,
            callback: (response: HiveKeyChainResponse) => void): void;
            
        requestPowerDown(
            username: string,
            amount: string,
            callback: (response: HiveKeyChainResponse) => void): void;
    }    
}

declare const steem_keychain: HiveKeychain.Keychain;

interface Window {
    steem_keychain: HiveKeychain.Keychain;
}
