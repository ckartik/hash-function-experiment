import { IncrementSecret } from './IncrementSecret.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
  Poseidon,
} from 'snarkyjs';

(async function main() {
  await isReady;
  console.log('snarky has loaded');

  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  const deployerAccount = Local.testAccounts[0].privateKey;

  const zkAppPrivateKey = PrivateKey.random();
  const zkAppAddress = zkAppPrivateKey.toPublicKey();

  const contract = new IncrementSecret(zkAppAddress);

  const salt = Field.random();
  const deployTxn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    contract.deploy({ zkappKey: zkAppPrivateKey });
    contract.init(salt, Field(10));
    contract.sign(zkAppPrivateKey);
  });
  await deployTxn.send().wait();
  const currHash = contract.x.get();
  console.log('current hash value is: ', currHash.toString());

  currHash.assertEquals(Poseidon.hash([salt, Field(10)]));
  const txn1 = await Mina.transaction(deployerAccount, () => {
    contract.increment(salt, Field(10));
    contract.sign(zkAppPrivateKey);
  });
  await txn1.send().wait();

  const h2 = contract.x.get();
  console.log('current hash value is: ', h2.toString());

  h2.assertEquals(Poseidon.hash([salt, Field(11)]));
  await shutdown();
})();
