import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'

export const storyTestnet = defineChain({
  id: 1315,
  name: 'Story Testnet',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'Inkwill',
  projectId: '2a616900f63ad5504b3c647053ec9a7b',
  chains: [storyTestnet],
})