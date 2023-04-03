import React, { useState, useEffect } from "react";
import * as nearApi from "near-api-js";
import { Contract, utils } from "near-api-js";

import "./App.css";

const {
  utils: {
    format: { parseNearAmount },
  },
} = nearApi;

// account creation costs 0.00125 NEAR for storage, 0.00000000003 NEAR for gas
// https://docs.near.org/docs/api/naj-cookbook#wrap-and-unwrap-near
const FT_MINIMUM_STORAGE_BALANCE = parseNearAmount("0.00125");

const contractId = "dev-1635836502908-29682237937904";
// const contractId = 'v2.ref-farming.near';
const wNearContractId = "wrap.testnet";
const config = {
  network: "testnet",
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
};

const App = () => {
  const [access, setAccess] = useState({});
  const [chainId, setChainId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [ethAccountId, setEthAccountId] = useState("");
  const [theLastOne, setTheLastOne] = useState("");

  useEffect(() => {
    if (window.near) {
      setTimeout(() => {
        window.near.on("signIn", (res) => {
          console.log("signIn res: ", res);
        });

        window.near.on("signOut", (res) => {
          console.log("signOut res: ", res);
        });

        window.near.on("accountChanged", (newAccountId) => {
          console.log("newAccountId: ", newAccountId);
        });

        window.near.on("rpcChanged", (rpc) => {
          console.log("rpc: ", rpc);
        });
      }, 1000);
    }

    if (window.ethereum) {
      window.ethereum.on("chainChanged", (res) => {
        console.log("chainChanged res: ", res);
        setChainId(res);
      });

      window.ethereum.on("accountsChanged", (res) => {
        if (res.length) {
          console.log("accountsChanged res: ", res);
          setEthAccountId(res[0]);
        }
      });
    }
  }, []);

  const signin = async () => {
    try {
      // The method names on the contract that should be allowed to be called. Pass null for no method names and '' or [] for any method names.
      // const res = await window.near.requestSignIn({ contractId, methodNames: ['sayHi', 'ad'] })
      // const res = await window.near.requestSignIn({ contractId, methodNames: null })
      // const res = await window.near.requestSignIn({ contractId, amount: '10000000000000000000000' })
      const res = await window.near.requestSignIn({
        contractId,
        methodNames: [],
      });

      console.log("signin res: ", res);

      if (!res.error) {
        if (res && res.accessKey) {
          setAccess(res.accessKey);
          setAccountId(window.near.accountId);
        } else {
          console.log("res: ", res);
        }
      }
    } catch (error) {
      console.log("error: ", error);
    }
  };

  const signInWithoutContractId = async () => {
    try {
      const res = await window.near.requestSignIn({
        contractId: '',
        methodNames: [],
      });

      if (!res.error) {
        if (res) {
          setAccountId(res.accountId);
        } else {
          console.log("res: ", res);
        }
      }
    } catch (error) {
      console.log("error: ", error);
    }
  };

  const signOut = async () => {
    const res = await window.near.disconnect();
    console.log("signout res: ", res);
    setAccess({});
    setAccountId("");
  };

  const signInEthereum = async () => {
    try {
      // The method names on the contract that should be allowed to be called. Pass null for no method names and '' or [] for any method names.
      // const res = await window.near.requestSignIn({ contractId, methodNames: ['sayHi', 'ad'] })
      // const res = await window.near.requestSignIn({ contractId, methodNames: null })
      // const res = await window.near.requestSignIn({ contractId, amount: '10000000000000000000000' })
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length) {
          setEthAccountId(accounts[0]);
        }

        console.log('ethereum accounts', accounts);
      }
    } catch (error) {
      console.log("error: ", error);
    }
  };

  const signOutEthereum = async () => {
    if (window.ethereum) {
      const res = await window.ethereum._handleDisconnect();
      console.log("sign out ethereum res: ", res);
      setChainId("");
      setEthAccountId("");
    }
  };

  const sayHi = async () => {
    try {
      if (access.secretKey) {
        const accountId = window.near.getAccountId();
        const keyStore = new nearApi.keyStores.InMemoryKeyStore();
        const keyPair = nearApi.KeyPair.fromString(access.secretKey);
        await keyStore.setKey("testnet", accountId, keyPair);
        const near = await nearApi.connect(
          Object.assign({ deps: { keyStore } }, config)
        );
        const account = await near.account(accountId);
        const contract = new Contract(account, contractId, {
          viewMethods: ["whoSaidHi"],
          changeMethods: ["sayHi"],
        });

        const res = await contract.sayHi();
        console.log("Say Hi response: ", res);
      } else {
        console.log("please await access to set");
      }
    } catch (error) {
      console.log("sayHi error: ", error);
    }
  };

  const getTheLastOne = async () => {
    const res = await window.near
      .account()
      .viewFunction(contractId, "whoSaidHi");

    console.log("Who Saied Hi response: ", res);
    setTheLastOne(res);
  };

  const sendNear = async () => {
    const res = await window.near.sendMoney({
      receiverId: "amazingbeerbelly-2.testnet",
      amount: "100000000000000000000000",
    });
    console.log("send near response: ", res);
  };

  // Note: this function exists because at the time of this writing, the wrap.testnet smart contract
  // doesn't have the latest version of the w-near contract.
  // It doesn't abide by the Storage Management standard here: https://nomicon.io/Standards/StorageManagement
  // This is the smart contract that needs to be deployed over it:
  // https://github.com/near/core-contracts/tree/5f4b7638d4f446eeb089e261dc80c4dcaf69dd48/w-near
  const hackForWrap = async (actions) => {
    const res = await window.near
      .account()
      .viewFunction(wNearContractId, "storage_balance_of", {
        account_id: window.near.accountId,
      });
    if (!res.error) {
      console.log("res: ", res);
      if (res.total !== FT_MINIMUM_STORAGE_BALANCE) {
        actions.unshift({
          methodName: "storage_deposit",
          args: {
            registration_only: true,
          },
          deposit: "1250000000000000000000",
        });
      }
    }
    return actions;
  };

  const SwapToWNear = async () => {
    let actions = [
      {
        methodName: "near_deposit",
        args: {},
        deposit: "100000000000000000000000",
      },
    ];
    actions = await hackForWrap(actions);

    const res = await window.near.signAndSendTransaction({
      receiverId: wNearContractId,
      actions,
    });

    console.log("Swap NEAR to wNEAR response: ", res);
  };

  const sendWNear = async () => {
    const res = await window.near.signAndSendTransaction({
      receiverId: wNearContractId,
      actions: [
        {
          methodName: "ft_transfer",
          args: {
            receiver_id: "amazingbeerbelly-2.testnet",
            amount: "100000000000000000000000", // wNear decimals is 24
          },
          deposit: "1",
        },
      ],
    });

    console.log("Send wNEAR response: ", res);
  };

  const swapAndSendWNearWithActions = async () => {
    let actions = [
      {
        methodName: "near_deposit",
        args: {},
        deposit: "100000000000000000000000",
      },
      {
        methodName: "ft_transfer",
        args: {
          receiver_id: "amazingbeerbelly-2.testnet",
          amount: "100000000000000000000000",
        },
        deposit: "1",
      },
    ];
    actions = await hackForWrap(actions);
    const transaction = {
      receiverId: wNearContractId,
      actions,
    };

    const res = await window.near.signAndSendTransaction(transaction);

    console.log("Swap and Send wNEAR with multiple actions response: ", res);
  };

  const swapAndSendWNearWithTransactions = async () => {
    let actions = [
      {
        methodName: "near_deposit",
        args: {},
        deposit: "100000000000000000000000",
      },
    ];
    actions = await hackForWrap(actions);
    const transactions = [
      {
        receiverId: wNearContractId,
        actions,
      },
      {
        receiverId: wNearContractId,
        actions: [
          {
            methodName: "ft_transfer",
            args: {
              receiver_id: "amazingbeerbelly-2.testnet",
              amount: "1000000000000000000",
            },
            deposit: "1",
          },
        ],
      },
    ];

    const res = await window.near.requestSignTransactions({ transactions });

    console.log(
      "Swap and Send wNEAR with requestSignTransactions response: ",
      res
    );
  };

  const signInMulti = async () => {
    const accounts = [
      { accountId: 'chachaxw.near' }, 
      { accountId: 'ershi-02.near' },
    ];
    // Retrieve the list of accounts we have visibility of.
    // const { accounts } = window.near.wallet;

    const res = await window.near.wallet.signInMulti({
      permissions: [
        {
          receiverId: "guest-book.testnet",
          methodNames: [],
        },
        {
          receiverId: "guest-book2.testnet",
          methodNames: [],
        }
      ],
      accounts: accounts.map(({ accountId }) => {
        const keyPair = utils.KeyPair.fromRandom("ed25519");
        return {
          accountId,
          publicKey: keyPair.getPublicKey()
        };
      }),
    });

    console.log('====================================');
    console.log('signInMulti', res);
    console.log('====================================');
  }

  return (
    <div className="App">
      {access.secretKey ? (
        <div>
          <div>Connected account id: {accountId}</div>
          <div>
            Signed access key (secretKey): {access.secretKey.slice(0, 16)}...
          </div>
          <button style={{ marginTop: "16px" }} onClick={signOut}>
            Sign out
          </button>
        </div>
      ) : (
        <div>
          <div>
            <div>Connected account id: {accountId}</div>
          </div>
          <button style={{ marginTop: "16px" }} onClick={signin}>
            Sign in Near
          </button>
        </div>
      )}

      <div style={{ marginTop: "40px" }} />

      <div>
        <div>
          <div>Connected account id: {accountId}</div>
        </div>
        <button style={{ marginTop: "16px" }} onClick={signInWithoutContractId}>
          Sign in Near without contract id
        </button>
      </div>

      <div style={{ marginTop: "40px" }} />

      {access.secretKey && (
        <div>
          <div style={{ marginTop: "20px" }}>
            Using access key to make a function call:
            <div style={{ marginTop: "10px" }}>
              <button style={{ marginLeft: "10px" }} onClick={sayHi}>
                Say Hi!
              </button>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            Make a view function call:
            <div style={{ marginTop: "10px" }}>
              <button style={{ marginLeft: "10px" }} onClick={getTheLastOne}>
                Who is the last one to Say Hi!
              </button>
              {!!theLastOne && (
                <div style={{ marginTop: "10px" }}>
                  The last one is: {theLastOne}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            Request Use to confirm:
            <div style={{ marginTop: "10px" }}>
              <button style={{ marginLeft: "10px" }} onClick={sendNear}>
                Send NEAR
              </button>
              <button style={{ marginLeft: "10px" }} onClick={SwapToWNear}>
                Swap NEAR to wNEAR
              </button>
              <button style={{ marginLeft: "10px" }} onClick={sendWNear}>
                Send wNEAR
              </button>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            Request Use to confirm (multiple actions):
            <div style={{ marginTop: "10px" }}>
              <button
                style={{ marginLeft: "10px" }}
                onClick={swapAndSendWNearWithActions}
              >
                Swap wNEAR and Send
              </button>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            Request Use to confirm (multiple transactions):
            <div style={{ marginTop: "10px" }}>
              <button
                style={{ marginLeft: "10px" }}
                onClick={swapAndSendWNearWithTransactions}
              >
                Swap wNEAR and Send
              </button>
            </div>
          </div>
        </div>
      )}

      {ethAccountId ? (
        <div style={{ marginTop: 40 }}>
          <div>Connected account ethereum id: {ethAccountId}</div>
          <div>
            Connected chain id: {chainId}
          </div>
          <button style={{ marginTop: "16px" }} onClick={signOutEthereum}>
            Sign out
          </button>
        </div>
      ) : (
        <div>
          <div>
            <div>Connected account ethereum id: {ethAccountId}</div>
          </div>
          <button style={{ marginTop: "16px" }} onClick={signInEthereum}>
            Sign in Ethereum
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
