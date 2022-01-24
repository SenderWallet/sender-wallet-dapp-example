import React, { useState } from 'react';
import * as nearApi from 'near-api-js';

import './App.css';
import { Contract } from 'near-api-js';

const {
  utils: {
    format: {
      parseNearAmount,
    },
  },
} = nearApi;

// account creation costs 0.00125 NEAR for storage, 0.00000000003 NEAR for gas
// https://docs.near.org/docs/api/naj-cookbook#wrap-and-unwrap-near
const FT_MINIMUM_STORAGE_BALANCE = parseNearAmount('0.00125');

const contractId = 'dev-1635836502908-29682237937904';
const wNearContractId = 'wrap.testnet';
const config = {
  network: 'testnet',
  networkId: 'testnet',
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
}

function App() {
  const [wallet, setWallet] = useState(null);
  const [access, setAccess] = useState({});
  const [theLastOne, setTheLastOne] = useState('');

  const init = async () => {
    const res = await window.wallet.init({ contractId })
    console.log('init response: ', res);
    return res;
  }

  const connect = async () => {
    const res = await init();
    if (res.accessKey) {
      setAccess(res.accessKey);
      setWallet(window.wallet);
    } else {
      window.wallet.requestSignIn({ contractId }).then(res => {
        console.log('requestSignIn response: ', res);
        setAccess(res.accessKey);
        setWallet(window.wallet);
      });
    }
    
    window.wallet.onAccountChanged(async (newAccountId) => {
      console.log('newAccountId: ', newAccountId);
      const res = await init();
      if (res.accessKey) {
        setAccess(res.accessKey);
        setWallet(window.wallet);
      } else {
        setWallet(null);
      } 
    });

    window.wallet.onRpcChanged(async (rpc) => {
      console.log('rpc: ', rpc);
    });
  }

  const signOut = async () => {
    console.log('wallet: ', wallet);
    const res = await window.wallet.signOut();
    console.log('signout res: ', res);
    setWallet(null);
  }

  const sayHi = async () => {
    if (access.secretKey) {
      const { accountId } = window.wallet;
      const keyStore = new nearApi.keyStores.InMemoryKeyStore();
      const keyPair = nearApi.KeyPair.fromString(access.secretKey);
      await keyStore.setKey('testnet', accountId, keyPair);
      const near = await nearApi.connect(Object.assign({ deps: { keyStore } }, config));
      const account = await near.account(accountId);
      const contract = new Contract(account, contractId, {
        viewMethods: ['whoSaidHi'],
        changeMethods: ['sayHi'],
      });

      const res = await contract.sayHi();
      console.log('Say Hi response: ', res);
    } else {
      console.log('please await access to set');
    }
  }

  const getTheLastOne = async () => {
    let res = await window.wallet.getRpc();
    const connection = nearApi.Connection.fromConfig({
      networkId: res.rpc.network,
      provider: { type: 'JsonRpcProvider', args: { url: res.rpc.nodeUrl } },
      signer: {},
    })

    const account = new nearApi.Account(connection, 'dontcare');
    res = await account.viewFunction(contractId, 'whoSaidHi')

    console.log('Who Saied Hi response: ', res);
    setTheLastOne(res);
  }

  const sendNear = async () => {
    const res = await window.wallet.sendMoney({
      receiverId: 'amazingbeerbelly.testnet',
      amount: '100000000000000000000000',
    });
    console.log('send near response: ', res);
  }

  const wnearStorageDeposit = async () => {
    console.log('window.wallet.accountId: ', window.wallet.accountId);
    const res = await window.wallet.signAndSendTransaction({
      receiverId: wNearContractId,
      actions: [
        {
          methodName: 'storage_deposit',
          args: {
            account_id: window.wallet.accountId,
            registration_only: true,
          },
          deposit: FT_MINIMUM_STORAGE_BALANCE,
        }
      ]
    })
    console.log('WNear storage deposit response: ', res);
  }

  const SwapToWNear = async () => {
    const res = await window.wallet.signAndSendTransaction({
      receiverId: wNearContractId,
      actions: [
        {
          methodName: 'near_deposit',
          args: {},
          deposit: '100000000000000000000000',
        }
      ]
    })

    console.log('Swap NEAR to wNEAR response: ', res);
  }

  const sendWNear = async () => {
    const res = await window.wallet.signAndSendTransaction({
      receiverId: wNearContractId,
      actions: [
        {
          methodName: 'ft_transfer',
          args: {
            receiver_id: 'amazingbeerbelly.testnet',
            amount: '1000000000000000000',
          },
        }
      ]
    })

    console.log('Send wNEAR response: ', res);
  }

  const swapAndSendWNearWithActions = async () => {
    const transaction = {
      receiverId: wNearContractId,
      actions: [
        {
          methodName: 'near_deposit',
          args: {},
          deposit: '100000000000000000000000',
        },
        {
          methodName: 'ft_transfer',
          args: {
            receiver_id: 'amazingbeerbelly.testnet',
            amount: '1000000000000000000',
          },
        }
      ]
    };

    const res = await window.wallet.signAndSendTransaction(transaction);

    console.log('Swap and Send wNEAR with multiple actions response: ', res); 
  }


  const swapAndSendWNearWithTransactions = async () => {
    const transactions = [
      {
        receiverId: wNearContractId,
        actions: [
          {
            methodName: 'near_deposit',
            args: {},
            deposit: '100000000000000000000000',
          },
        ]
      },
      {
        receiverId: wNearContractId,
        actions: [
          {
            methodName: 'ft_transfer',
            args: {
              receiver_id: 'amazingbeerbelly.testnet',
              amount: '1000000000000000000',
            },
          }
        ]
      }
    ];

    const res = await window.wallet.requestSignTransactions({ transactions });

    console.log('Swap and Send wNEAR with requestSignTransactions response: ', res); 
  }

  return (
    <div className="App">
      <div>Current Account ID: {wallet && wallet.accountId}</div>

      {wallet && wallet.isSignedIn() ? (<button style={{ marginTop: '20px' }} onClick={signOut}>Sign out</button>) : (<button onClick={connect}>Connect</button>)}

      {
        wallet && wallet.isSignedIn() && (
          <div>
            <div style={{ marginTop: '20px' }}>
              Using access key to make a function call:
              <div style={{ marginTop: '10px' }}>
                <button style={{ marginLeft: '10px' }} onClick={sayHi}>Say Hi!</button>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              Make a view function call:
              <div style={{ marginTop: '10px' }}>
                <button style={{ marginLeft: '10px' }} onClick={getTheLastOne}>Who is the last one to Say Hi!</button>
                {!!theLastOne && (
                  <div style={{ marginTop: '10px' }}>
                    The last one is: {theLastOne}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              Request Use to confirm:
              <div style={{ marginTop: '10px' }}>
                <button style={{ marginLeft: '10px' }} onClick={sendNear}>Send NEAR</button>
                <button style={{ marginLeft: '10px' }} onClick={wnearStorageDeposit}>WNear storage deposit</button>
                <button style={{ marginLeft: '10px' }} onClick={SwapToWNear}>Swap NEAR to wNEAR</button>
                <button style={{ marginLeft: '10px' }} onClick={sendWNear}>Send wNEAR</button>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              Request Use to confirm (multiple actions):
              <div style={{ marginTop: '10px' }}>
                <button style={{ marginLeft: '10px' }} onClick={swapAndSendWNearWithActions}>Swap wNEAR and Send</button>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              Request Use to confirm (multiple transactions):
              <div style={{ marginTop: '10px' }}>
                <button style={{ marginLeft: '10px' }} onClick={swapAndSendWNearWithTransactions}>Swap wNEAR and Send</button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default App;
