import React, { useState } from 'react';
import * as nearApi from 'near-api-js';

import './App.css';
import { Contract } from 'near-api-js';

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

  // Note: this function exists because at the time of this writing, the wrap.testnet smart contract
  // doesn't have the latest version of the w-near contract.
  // It doesn't abide by the Storage Management standard here: https://nomicon.io/Standards/StorageManagement
  // This is the smart contract that needs to be deployed over it:
  // https://github.com/near/core-contracts/tree/5f4b7638d4f446eeb089e261dc80c4dcaf69dd48/w-near
  const hackForWrap = async (actions) => {
    let res = await window.wallet.getRpc();
    const connection = nearApi.Connection.fromConfig({
      networkId: res.rpc.network,
      provider: { type: 'JsonRpcProvider', args: { url: res.rpc.nodeUrl } },
      signer: {},
    })

    const account = new nearApi.Account(connection, 'icaredeeply');
    res = await account.viewFunction(wNearContractId, 'storage_balance_of', {"account_id": wallet.accountId})
    if (res.total !== '1250000000000000000000') {
      actions.unshift({
        methodName: 'storage_deposit',
        args: {
          registration_only: true
        },
        deposit: '1250000000000000000000'
      })
    }
    return actions
  }

  const SwapToWNear = async () => {
    let actions = [
        {
          methodName: 'near_deposit',
          args: {},
          deposit: '100000000000000000000000',
        }
    ]
    actions = await hackForWrap(actions)

    const res = await window.wallet.signAndSendTransaction({
      receiverId: wNearContractId,
      actions
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
    let actions = [
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
    actions = await hackForWrap(actions)
    const transaction = {
      receiverId: wNearContractId,
      actions
    };

    const res = await window.wallet.signAndSendTransaction(transaction);

    console.log('Swap and Send wNEAR with multiple actions response: ', res);
  }


  const swapAndSendWNearWithTransactions = async () => {
    let actions = [
      {
        methodName: 'near_deposit',
        args: {},
        deposit: '100000000000000000000000',
      },
    ]
    actions = await hackForWrap(actions)
    const transactions = [
      {
        receiverId: wNearContractId,
        actions
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
