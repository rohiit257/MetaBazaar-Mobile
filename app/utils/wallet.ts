import { ethers } from 'ethers';
import { Linking } from 'react-native';

export async function connectWallet() {
  try {
    // Deep link to MetaMask
    const url = `metamask://dapp/${window.location.href}`;
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      // If MetaMask is not installed, open app store
      await Linking.openURL('https://metamask.app.link/dapp/your-app-url');
    }

    // Wait for provider to be injected
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      return {
        provider,
        signer,
        address
      };
    }
    
    throw new Error('Please install MetaMask');
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
} 