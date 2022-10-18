/**
 * transformer/src/process.js
 * This file contains the primary business logic for the TODO Token Bridge.
 */
const bsv = require('bsv')

const OP_CHECKSIG = 172

// This is the namespace address for the ToDo protocol
// You can create your own Bitcoin address to use, and customize this protocol
// for your own needs.
const TODO_PROTO_ADDR = '1ToDoDtKreEzbHYKFjmoBuduFmSXXUGZG'

module.exports = async (state, action) => {
  try {
    console.log(`[+] ${action.tx.h}`)
    if (typeof action === 'undefined') {
      throw new Error('tx is a required parameter!')
    }
    if (typeof action !== 'object') {
      throw new TypeError(`action must be an object, but ${typeof action} was given!`)
    }
    if (!Array.isArray(action.out) || action.out.length < 1) {
      throw new Error('action.out must be an array of transaction outputs!')
    }
    if (!Array.isArray(action.in) || action.in.length < 1) {
      throw new Error('action.in must be an array of transaction inputs!')
    }

    // Tokens associated with each input are deleted
    for (const input of action.in) {
      let tokenToDelete = input.e.h + Number(input.e.i)
        .toString(16).padStart(8, '0')
      const operation = await state.delete({
        collection: 'todo',
        find: { _id: tokenToDelete }
      })
      if (operation.deletedCount > 0) {
        console.log(
          `Transaction input #${input.i} completed a task`
        )
      }
    }

    // Tokens associated with each output are created
    for (const output of action.out) {
      if (
        !output.b1 ||
        output.b1.op !== OP_CHECKSIG ||
        output.s2 !== TODO_PROTO_ADDR ||
        output.s4 === undefined
      ) {
        continue // Non-TODO outputs are skipped
      }
      let currentOutpoint = action.tx.h + Number(output.i)
        .toString(16).padStart(8, '0')
      
      // Use ECDSA to verify signature
      const containsChar = (string, char) => (string.indexOf(char) > -1)
      let fields = Object.entries(output)
        .filter(([key, _]) => (
          containsChar(key, 'b') &&
          Number(key.slice(1)) >= 2 &&
          Number(key.slice(1)) < 4)
        )
        .map(([_, value]) =>
          (value.op)
            ? Buffer.from((value.op-80).toString(16).padStart(2, '0'), 'hex')
            : Buffer.from(value, 'base64')
        )
      const hasValidSignature = bsv.crypto.ECDSA.verify(
        bsv.crypto.Hash.sha256(Buffer.concat(fields)),
        bsv.crypto.Signature.fromString(output.h4),
        bsv.PublicKey.fromString(output.h0)
      )
      if (!hasValidSignature) {
        console.error(
          `[!] Token in output #${output.i} has an invalid signature`
        )
        continue
      }
      if (output.h3.length > 1024) {
        console.error(`[!] Token in output #${output.i} is too long`)
        continue
      }
      console.log(`[+] Adding a new ToDo task worth ${output.e.v} sats`)
      await state.create({
        collection: 'todo',
        data: {
          _id: currentOutpoint,
          // The token contains the information needed to spend the output
          token: {
            ...action.envelope,
            lockingScript: new bsv.Transaction(action.envelope.rawTx)
              .outputs[output.i].script.toHex(),
            txid: action.tx.h,
            outputIndex: output.i
          },
          user: output.h0,
          task: output.b3,
          sats: output.e.v
        }
      })
    }
  } catch (e) {
    console.error(`[!] ${action.tx.h}`)
    console.error(e)
  }
}
