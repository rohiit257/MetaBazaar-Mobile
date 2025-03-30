import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ethers } from 'ethers';
import { Timer, Search, ArrowUpRight, Clock, Sun, Moon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import GetIpfsUrlFromPinata from '../utils/ipfs';
import contractInfo from '../marketplace.json';
import { connectWallet } from '../utils/wallet';
import LoadingScreen from '../components/LoadingScreen';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const CONTRACT_ADDRESS = contractInfo.address.trim();
const CONTRACT_ABI = contractInfo.abi;

interface Auction {
  tokenId: string;
  seller: string;
  startTime: number;
  endTime: number;
  highestBid: string;
  highestBidder: string;
  image: string;
  name: string;
  description: string;
}

export default function AuctionsScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [bidAmounts, setBidAmounts] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAuctions();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAuctions(auctions);
    } else {
      const filtered = auctions.filter(auction => 
        auction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auction.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAuctions(filtered);
    }
  }, [searchQuery, auctions]);

  async function handleConnectWallet() {
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }

  async function handlePlaceBid(auction: Auction) {
    if (!walletAddress) {
      await handleConnectWallet();
      return;
    }

    const bidAmount = bidAmounts[auction.tokenId];
    if (!bidAmount) {
      console.error('Please enter a bid amount');
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const bidValue = ethers.utils.parseEther(bidAmount);
      const transaction = await contract.placeBid(auction.tokenId, { value: bidValue });
      await transaction.wait();

      // Clear bid amount and reload auctions
      setBidAmounts(prev => ({ ...prev, [auction.tokenId]: '' }));
      loadAuctions();
    } catch (error) {
      console.error('Error placing bid:', error);
    }
  }

  async function getAuctionData(contract: ethers.Contract, auction: any) {
    try {
      const tokenId = auction.tokenId.toString();
      let tokenURI = await contract.tokenURI(tokenId);
      tokenURI = GetIpfsUrlFromPinata(tokenURI);

      const metaResponse = await axios.get(tokenURI);
      const meta = metaResponse.data;

      return {
        tokenId,
        seller: auction.seller,
        startTime: auction.startTime.toNumber(),
        endTime: auction.endTime.toNumber(),
        highestBid: auction.highestBid.toString(),
        highestBidder: auction.highestBidder,
        image: GetIpfsUrlFromPinata(meta.image),
        name: meta.name || `NFT #${tokenId}`,
        description: meta.description || ''
      };
    } catch (error) {
      console.error('Error fetching auction data:', error);
      return null;
    }
  }

  async function loadAuctions() {
    try {
      setLoading(true);
      const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/FLSX-8UrkJRTsUoSaR3hCOJ6NVysq4Kl');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const activeAuctions = await contract.getAuctionedNFTs();
      console.log('Fetched auctions:', activeAuctions);
      
      const auctionData = await Promise.all(
        activeAuctions.map((auction: any) => getAuctionData(contract, auction))
      );

      setAuctions(auctionData.filter((auction): auction is Auction => auction !== null));
    } catch (error) {
      console.error('Error loading auctions:', error);
    } finally {
      setLoading(false);
    }
  }

  const getTimeLeft = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) return 'Ended';
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderHeader = () => (
    <View style={[styles.headerContainer]}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: theme.text }]}>Live Auctions</Text>
        <View style={styles.statsContainer}>
          <View style={[styles.statItem, { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)', padding: 8, borderRadius: 12 }]}>
            <Text style={[styles.statValue, { color: theme.accent }]}>{auctions.length}</Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>Active</Text>
          </View>
        </View>
      </View>
      <BlurView intensity={30} tint={isDarkMode ? "dark" : "light"} style={[styles.searchContainer, { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)' }]}>
        <Search size={20} color={theme.subtext} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search auctions..."
          placeholderTextColor={theme.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </BlurView>
    </View>
  );

  const renderAuctionCard = ({ item }: { item: Auction }) => {
    const now = Math.floor(Date.now() / 1000);
    const isAuctionEnded = item.endTime <= now;

    return (
      <TouchableOpacity 
        style={[styles.card, { 
          backgroundColor: theme.card,
          borderColor: theme.border,
        }]}
        onPress={() => router.push(`/nft/${item.tokenId}`)}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.nftImage}
          onError={() => console.error('Image loading error for token', item.tokenId)}
        />
        <BlurView intensity={80} tint={isDarkMode ? "dark" : "light"} style={styles.timeContainer}>
          <Clock size={14} color={theme.accent} />
          <Text style={[styles.timeText, { color: theme.accent }]}>{getTimeLeft(item.endTime)}</Text>
        </BlurView>
        <View style={styles.cardContent}>
          <View style={styles.header}>
            <Text style={[styles.tokenId, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <ArrowUpRight size={16} color={theme.accent} />
          </View>
          {item.description && (
            <Text style={[styles.description, { color: theme.subtext }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.bidContainer}>
            <View>
              <Text style={[styles.bidLabel, { color: theme.subtext }]}>Current Bid</Text>
              <Text style={[styles.bidAmount, { color: theme.accent }]}>
                {ethers.utils.formatEther(item.highestBid)} ETH
              </Text>
            </View>
            {!isAuctionEnded && (
              <TouchableOpacity 
                style={[styles.bidButton, { backgroundColor: theme.accent }]}
                onPress={() => handlePlaceBid(item)}
              >
                <Text style={[styles.bidButtonText, { color: isDarkMode ? '#000000' : '#FFFFFF' }]}>
                  Place Bid
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading Live Auctions..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      <FlatList
        data={filteredAuctions}
        renderItem={renderAuctionCard}
        keyExtractor={(item) => `auction-${item.tokenId}`}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    paddingTop: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  listContainer: {
    padding: 8,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    maxWidth: Dimensions.get('window').width / 2 - 24,
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
  },
  timeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
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
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 12,
  },
  bidContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bidLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  bidAmount: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 4,
  },
  bidButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bidButtonText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});