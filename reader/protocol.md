# ToDo Protocol

Create and complete TODO items, with a reward.

- [Query](./query)
- [Socket](./socket)

## Goals

* Allow a user to create TODO tasks
* Allow a user to attach money to the task at time of creation
* Allow a user to mark the task as completed
* Allow a user to receive back their money once the task is completed
* Keep TODO items private with encryption

## Protocol

## Blockchain Data Protoccol

PUSHDATA | Field
---------|----------------------------------
0        | `<pubkey>`
1        | `OP_CHECKSIG`
2        | TODO Protocol ID (`1ToDoDtKreEzbHYKFjmoBuduFmSXXUGZG`)
3        | Encrypted task data
4        | A signature from the field 0 public key over fields 2-3
...      | `OP_DROP` / `OP_2DROP` — Drop fields 2-4 from the stack.

## State Machine

The Bridgeport state machine tracks a MongoDB collection with these fields:

field | description
------|------------
task  | Encrypted task data
sats  | Number of satoshis in the TODO token
user  | Public key of the user who published the task
token | SPV data for the token (an object with `rawTx`, `inputs`, `mapiResponses`, and/or `proof`)

Spending the `token` redeems the `sats` back to the `user`, and removes the `todo` from the collection.
