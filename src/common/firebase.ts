import { login, setAccount, logout } from 'store/actions';
import { dispatchify } from 'aurelia-store';

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyDTgQorxwEGSXCgmQaQpI4f1lEADwTgMbk',
    authDomain: 'tribaldex-d22e0.firebaseapp.com',
    databaseURL: 'https://tribaldex-d22e0.firebaseio.com',
    projectId: 'tribaldex-d22e0',
    storageBucket: 'tribaldex-d22e0.appspot.com',
    messagingSenderId: '884996152894',
    appId: '1:884996152894:web:c0ef769b4556858b717b6f',
    measurementId: 'G-EPE7FWN2MB'
};

firebase.initializeApp(firebaseConfig);

export async function authStateChanged() {
    return new Promise(resolve => {
        firebase.auth().onAuthStateChanged(async user => {
            // eslint-disable-next-line no-undef
            const token = await firebase.auth()?.currentUser?.getIdTokenResult(true);

            if (user) {
                dispatchify(login)(user.uid);
                if (token) {
                    dispatchify(setAccount)({token});
                }
                resolve();
            } else {
                dispatchify(logout)();
                resolve();
            }
        });
    });
}

export async function getFirebaseUser(username: string) {
    const doc = await firebase
        .firestore()
        .collection('users')
        .doc(username)
        .get();

    return doc.exists ? doc.data() : null;
}
