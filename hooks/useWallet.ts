import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3 from 'web3';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean>(false);
  const [web3, setWeb3] = useState<Web3 | null>(null);

  useEffect(() => {
    checkWalletAvailability();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  function checkWalletAvailability() {
    // Check for various wallet providers
    const isWalletAvailable = typeof window !== 'undefined' && 
      (window.ethereum || 
       // @ts-ignore
       window.web3 ||
       // Check if running in Trust Wallet browser
       window.ethereum?.isTrust ||
       // Check if running in MetaMask mobile browser
       window.ethereum?.isMetaMask);
    
    setHasWallet(isWalletAvailable);
    if (isWalletAvailable) {
      initializeWeb3();
      checkConnection();
    }
  }

  async function initializeWeb3() {
    try {
      let provider;
      if (window.ethereum) {
        provider = window.ethereum;
      } 
      // @ts-ignore
      else if (window.web3) {
        // @ts-ignore
        provider = window.web3.currentProvider;
      }

      if (provider) {
        const web3Instance = new Web3(provider);
        setWeb3(web3Instance);
      }
    } catch (error) {
      console.error('Error initializing Web3:', error);
    }
  }

  async function checkConnection() {
    try {
      if (!web3) return;
      
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        setAddress(accounts[0]);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  }

  function handleAccountsChanged(accounts: string[]) {
    if (accounts.length > 0) {
      setAddress(accounts[0]);
    } else {
      setAddress(null);
    }
  }

  async function connect() {
    if (!hasWallet) {
      // Open wallet download page based on platform
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // For mobile, open deep link to app store
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.open('https://apps.apple.com/us/app/metamask/id1438144202', '_blank');
        } else {
          window.open('https://play.google.com/store/apps/details?id=io.metamask', '_blank');
        }
      } else {
        window.open('https://metamask.io/download/', '_blank');
      }
      return;
    }

    try {
      if (!web3) {
        await initializeWeb3();
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setAddress(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  }

  return { 
    address, 
    connect, 
    hasWallet,
    web3
  };
}