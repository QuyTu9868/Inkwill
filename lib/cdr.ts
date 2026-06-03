import { createPublicClient, http, toHex, type WalletClient } from 'viem'
import { CDRClient, initWasm, uuidToLabel } from '@piplabs/cdr-sdk'
import { storyTestnet } from './wagmi'

const CDR_API_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/cdr-proxy`
  : `${process.env.NEXT_PUBLIC_APP_URL}/api/cdr-proxy`

export function createCDRClient(walletClient: WalletClient): CDRClient {
  const publicClient = createPublicClient({
    chain: storyTestnet,
    transport: http('https://aeneid.storyrpc.io'),
  })

  return new CDRClient({
    network: 'testnet',
    publicClient: publicClient as any,
    walletClient: walletClient as any,
    apiUrl: CDR_API_URL,
  } as any)
}

export async function createEncryptedVault(
  message: string,
  walletClient: WalletClient,
): Promise<number> {
  await initWasm()
  const cdrClient = createCDRClient(walletClient)

  const walletAddress = walletClient.account!.address

  const globalPubKey = await cdrClient.observer.getGlobalPubKey()
  const messageBytes = new TextEncoder().encode(message)

  const { uuid } = await cdrClient.uploader.allocate({
  updatable: false,
  writeConditionAddr: walletAddress,
  readConditionAddr: walletAddress,
  writeConditionData: '0x',
  readConditionData: '0x',
  skipConditionValidation: true,
})

  const label = uuidToLabel(uuid)
  const ciphertext = await cdrClient.uploader.encryptDataKey({
    dataKey: messageBytes,
    globalPubKey,
    label,
  })

  await cdrClient.uploader.write({
    uuid,
    accessAuxData: '0x',
    encryptedData: toHex(ciphertext.raw),
  })

  return uuid
}

export async function decryptVault(
  uuid: number,
  walletClient: WalletClient,
): Promise<string> {
  const cdrClient = createCDRClient(walletClient)

  const { dataKey } = await cdrClient.consumer.accessCDR({
    uuid,
    accessAuxData: '0x',
  })

  return new TextDecoder().decode(dataKey)
}