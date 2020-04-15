import { login, setAccount, logout } from 'store/actions';
import { dispatchify } from 'aurelia-store';

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCXxKDQB-rHTubFtxhbmePL6h6ETCNIs54",
    authDomain: "hive-engine.firebaseapp.com",
    databaseURL: "https://hive-engine.firebaseio.com",
    projectId: "hive-engine",
    storageBucket: "hive-engine.appspot.com",
    messagingSenderId: "281598822229",
    appId: "1:281598822229:web:a542226c2c9a397b9b91dc",
    measurementId: "G-97NMGCXJT5"
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
