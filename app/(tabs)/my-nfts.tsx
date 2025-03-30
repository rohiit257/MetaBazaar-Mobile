import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { ethers } from 'ethers';
import { Wallet } from 'lucide-react-native';
import GetIpfsUrlFromPinata from '../utils/ipfs';
import contractInfo from '../marketplace.json';
import { connectWallet } from '../utils/wallet';
import axios from 'axios';

const CONTRACT_ADDRESS = contractInfo.address.trim();
const CONTRACT_ABI = contractInfo.abi;

interface NFT {
  tokenId: string;
  owner: string;
  creator: string;
  image: string;
  name: string;
  description: string;
}

export default function MyNFTsScreen() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadMyNFTs();
    }
  }, [walletAddress]);

  async function handleConnectWallet() {
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }

  async function getNFTData(contract: ethers.Contract, tokenId: string) {
    try {
      let tokenURI = await contract.tokenURI(tokenId);
      tokenURI = GetIpfsUrlFromPinata(tokenURI);
      console.log('Token URI after transform:', tokenURI);

      const metaResponse = await axios.get(tokenURI);
      const meta = metaResponse.data;
      console.log('Metadata for token', tokenId, ':', meta);

      const owner = await contract.ownerOf(tokenId);
      const creator = await contract.creatorOf(tokenId);

      return {
        tokenId,
        owner,
        creator,
        image: meta.image,
        name: meta.name || `NFT #${tokenId}`,
        description: meta.description || ''
      };
    } catch (error) {
      console.error('Error fetching NFT data for token', tokenId, ':', error);
      return null;
    }
  }

  async function loadMyNFTs() {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/FLSX-8UrkJRTsUoSaR3hCOJ6NVysq4Kl');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Get token balance
      const balance = await contract.balanceOf(walletAddress);
      const tokenIds = [];

      // Get all token IDs owned by the wallet
      for (let i = 0; i < balance.toNumber(); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
        tokenIds.push(tokenId.toString());
      }

      console.log('Found tokens:', tokenIds);
      
      const nftData = await Promise.all(
        tokenIds.map(tokenId => getNFTData(contract, tokenId))
      );

      // Filter out any null values from failed fetches
      setNfts(nftData.filter((nft): nft is NFT => nft !== null));
    } catch (error) {
      console.error('Error loading NFTs:', error);
    } finally {
      setLoading(false);
    }
  }

  const renderNFTCard = ({ item }: { item: NFT }) => {
    const imageUrl = item.image ? GetIpfsUrlFromPinata(item.image) : 'https://via.placeholder.com/400';
    console.log('Image URL for token', item.tokenId, ':', imageUrl);
    
    return (
      <View style={styles.card}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.nftImage}
          onError={() => console.error('Image loading error for token', item.tokenId)}
        />
        <View style={styles.cardContent}>
          <View style={styles.header}>
            <Text style={styles.tokenId}>{item.name}</Text>
          </View>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.ownerInfo}>
            <Text style={styles.label}>Creator</Text>
            <Text style={styles.address}>{`${item.creator.slice(0, 6)}...${item.creator.slice(-4)}`}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!walletAddress) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title}>Connect Your Wallet</Text>
        <TouchableOpacity style={styles.connectButton} onPress={handleConnectWallet}>
          <Text style={styles.connectButtonText}>Connect MetaMask</Text>
          <Wallet size={18} color="#000000" />
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title}>Loading Your NFTs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My NFTs</Text>
      <Text style={styles.walletAddress}>
        {`Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
      </Text>
      <FlatList
        data={nfts}
        renderItem={renderNFTCard}
        keyExtractor={(item) => `nft-${item.tokenId}`}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 20,
  },
  walletAddress: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#4ADE80',
    textAlign: 'center',
    marginBottom: 20,
  },
  listContainer: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
  },
  cardContent: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenId: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  ownerInfo: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
  },
  address: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#4ADE80',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#4ADE80',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    marginTop: 20,
  },
  connectButtonText: {
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginRight: 8,
    fontSize: 16,
  },
});