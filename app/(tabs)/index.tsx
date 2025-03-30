import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ethers } from 'ethers';
import { ShoppingCart, Wallet, ExternalLink, Search, Sun, Moon, ChevronLeft, ChevronRight, ChevronDown, Star } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import GetIpfsUrlFromPinata from '../utils/ipfs';
import contractInfo from '../marketplace.json';
import { connectWallet } from '../utils/wallet';
import LoadingScreen from '../components/LoadingScreen';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const CONTRACT_ADDRESS = contractInfo.address.trim();
const CONTRACT_ABI = contractInfo.abi;

interface NFT {
  tokenId: string;
  owner: string;
  seller: string;
  creator: string;
  price: string;
  salesCount: number;
  lastTransactionTime: number;
  image: string;
  name: string;
  description: string;
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadNFTs();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredNfts(nfts);
    } else {
      const filtered = nfts.filter(nft => 
        nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredNfts(filtered);
    }
  }, [searchQuery, nfts]);

  async function handleConnectWallet() {
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }

  async function handleBuyNFT(nft: NFT) {
    if (!walletAddress) {
      await handleConnectWallet();
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const price = ethers.utils.parseUnits(ethers.utils.formatEther(nft.price), 'ether');
      const transaction = await contract.buyNFT(nft.tokenId, { value: price });
      await transaction.wait();

      // Reload NFTs after purchase
      loadNFTs();
    } catch (error) {
      console.error('Error buying NFT:', error);
    }
  }

  async function getNFTData(contract: ethers.Contract, nft: any) {
    try {
      const tokenId = nft.tokenId.toString();
      let tokenURI = await contract.tokenURI(tokenId);
      tokenURI = GetIpfsUrlFromPinata(tokenURI);
      console.log('Token URI after transform:', tokenURI);

      const metaResponse = await axios.get(tokenURI);
      const meta = metaResponse.data;
      console.log('Metadata for token', tokenId, ':', meta);

      return {
        tokenId,
        owner: nft.owner,
        seller: nft.seller,
        creator: nft.creator,
        price: nft.price.toString(),
        salesCount: nft.salesCount.toNumber(),
        lastTransactionTime: nft.lastTransactionTime.toNumber(),
        image: meta.image,
        name: meta.name || `NFT #${tokenId}`,
        description: meta.description || ''
      };
    } catch (error) {
      console.error('Error fetching NFT data for token', nft.tokenId, ':', error);
      return null;
    }
  }

  async function loadNFTs() {
    try {
      setLoading(true);
      const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/FLSX-8UrkJRTsUoSaR3hCOJ6NVysq4Kl');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const listedNFTs = await contract.getAllListedNFTs();
      console.log('Fetched listed NFTs:', listedNFTs);
      
      const nftData = await Promise.all(
        listedNFTs.map((nft: any) => getNFTData(contract, nft))
      );

      // Filter out any null values from failed fetches
      setNfts(nftData.filter((nft): nft is NFT => nft !== null));
    } catch (error) {
      console.error('Error loading NFTs:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleViewNFT = (tokenId: string) => {
    router.push(`/nft/${tokenId}`);
  };

  const getNewDrops = () => {
    // Get last 3 NFTs based on tokenId
    return [...nfts].sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId)).slice(0, 3);
  };

  const renderCarouselItem = (item: NFT) => {
    const imageUrl = item.image ? GetIpfsUrlFromPinata(item.image) : 'https://via.placeholder.com/400';
    
    return (
      <TouchableOpacity 
        style={styles.carouselItem}
        onPress={() => handleViewNFT(item.tokenId)}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.carouselImage}
        />
        <View style={styles.carouselInfo}>
          <Text style={[styles.carouselTitle, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.carouselPrice, { color: theme.text }]}>Floor: {ethers.utils.formatEther(item.price)} ETH</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading NFT Marketplace..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredNfts}
        ListHeaderComponent={() => (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>New Drops 🎒</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.carouselSection}
              contentContainerStyle={styles.carouselContent}
              decelerationRate="fast"
              snapToInterval={256} // width + marginRight
              snapToAlignment="start"
            >
              {getNewDrops().map((item) => renderCarouselItem(item))}
            </ScrollView>

            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { color: theme.subtext, width: 30 }]}>#</Text>
              <Text style={[styles.headerText, { color: theme.subtext, flex: 1 }]}>Collection</Text>
              <Text style={[styles.headerText, { color: theme.subtext, width: 100, textAlign: 'right' }]}>Floor Price</Text>
            </View>
          </>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.tableRow}
            onPress={() => handleViewNFT(item.tokenId)}
          >
            <Text style={[styles.rankText, { color: theme.subtext }]}>
              {parseInt(item.tokenId)}
            </Text>
            <View style={styles.nftColumn}>
              <Image
                source={{ uri: item.image ? GetIpfsUrlFromPinata(item.image) : 'https://via.placeholder.com/400' }}
                style={styles.tableImage}
              />
              <View style={styles.nftInfo}>
                <Text style={[styles.nftTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.nftDescription, { color: theme.subtext }]} numberOfLines={2}>
                  {item.description.slice(0, 8)}...
                </Text>
              </View>
            </View>
            <Text style={[styles.priceText, { color: theme.text }]}>
              {ethers.utils.formatEther(item.price)} ETH
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => `nft-${item.tokenId}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  carouselSection: {
    height: 300,
    marginBottom: 24,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  carouselItem: {
    width: 240,
    height: 280,
    marginRight: 16,
  },
  carouselImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  carouselInfo: {
    marginTop: 12,
  },
  carouselTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  carouselPrice: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rankText: {
    width: 30,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  nftColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  tableImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  nftInfo: {
    flex: 1,
  },
  nftTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  nftDescription: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    opacity: 0.7,
  },
  priceText: {
    width: 100,
    fontSize: 16,
    
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'right',
  },
  listContainer: {
    paddingBottom: 100,
  },
});