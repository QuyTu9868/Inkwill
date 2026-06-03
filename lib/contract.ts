export const CONTRACT_ADDRESS = '0x84557B1f9dC0bab449bC9dd8A1269136d4f5f557'

export const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "nextDeadline", "type": "uint256" }],
    "name": "CheckedIn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "missedCount", "type": "uint256" }],
    "name": "MissedCheckIn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }],
    "name": "WillCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "nextDeadline", "type": "uint256" }],
    "name": "WillCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }],
    "name": "WillTriggered",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "cancelWill",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "checkIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_checkInInterval", "type": "uint256" },
      { "internalType": "string[]", "name": "_names", "type": "string[]" },
      { "internalType": "string[]", "name": "_emails", "type": "string[]" },
      { "internalType": "string[]", "name": "_vaultNames", "type": "string[]" },
      { "internalType": "uint32[]", "name": "_vaultUuids", "type": "uint32[]" }
    ],
    "name": "createWill",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
    "name": "getDeadline",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
    "name": "getRecipientCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
    "name": "getRecipients",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "email", "type": "string" },
          { "internalType": "string", "name": "vaultName", "type": "string" },
          { "internalType": "uint32", "name": "vaultUuid", "type": "uint32" }
        ],
        "internalType": "struct Inkwill.Recipient[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
    "name": "recordMissedCheckIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
    "name": "triggerWill",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "wills",
    "outputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "checkInInterval", "type": "uint256" },
      { "internalType": "uint256", "name": "nextDeadline", "type": "uint256" },
      { "internalType": "uint256", "name": "missedCheckIns", "type": "uint256" },
      { "internalType": "bool", "name": "active", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "recipients",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "email", "type": "string" },
      { "internalType": "string", "name": "vaultName", "type": "string" },
      { "internalType": "uint32", "name": "vaultUuid", "type": "uint32" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const