import React, { useState } from 'react';

import './App.css';

const contractId = 'dev-1635836502908-29682237937904';
const wNearContractId = 'wrap.testnet';

function App() {
  const [wallet, setWallet] = useState(null);
  const [theLastOne, setTheLastOne] = useState('');

  const init = async () => {
    const res = await window.wallet.init({ contractId })
    console.log('init response: ', res);
    return res;
  }

  const connect = async () => {
    const res = await init();
    if (res.accessKey) {
      setWallet(window.wallet);
    } else {
      window.wallet.requestSignIn({ contractId }).then(res => {
        console.log('requestSignIn response: ', res);
        setWallet(window.wallet);
      });
    }
    
    window.wallet.onAccountChanged(async (newAccountId) => {
      console.log('newAccountId: ', newAccountId);
      const res = await init();
      if (res.accessKey) {
        setWallet(window.wallet);
      } else {
        setWallet(null);
      } 
    });
  }

  const signOut = async () => {
    console.log('wallet: ', wallet);
    const res = await window.wallet.signOut();
    console.log('signout res: ', res);
    setWallet(null);
  }

  const sayHi = async () => {
    const res = await window.wallet.signAndSendTransaction({
      receiverId: contractId,
      actions: [
        {
          methodName: 'sayHi',
          args: {},
        }
      ],
      usingAccessKey: true,
    })

    console.log('Say Hi response: ', res);
  }

  const getTheLastOne = async () => {
    const res = await window.wallet.viewFunctionCall({
      contractId,
      methodName: 'whoSaidHi',
    })

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
          deposit: ''
        }
      ]
    })

    console.log('Send wNEAR response: ', res);
  }

  const swapAndSendWNear = async () => {
    const res = await window.wallet.signAndSendTransaction({
      receiverId: wNearContractId,
      actions: [
        {
          methodName: 'near_deposit',
          args: {},
          amount: '100000000000000000000000',
        },
        {
          methodName: 'ft_transfer',
          args: {
            receiver_id: 'amazingbeerbelly.testnet',
            amount: '1000000000000000000', 
          },
        }
      ]
    })

    console.log('Swap and Send wNEAR response: ', res); 
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
                <button style={{ marginLeft: '10px' }} onClick={swapAndSendWNear}>Swap wNEAR and Send</button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default App;
