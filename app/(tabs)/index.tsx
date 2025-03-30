import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ethers } from 'ethers';
import { ShoppingCart, Wallet, ExternalLink, Search, Sun, Moon } from 'lucide-react-native';
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

  const renderNFTCard = ({ item }: { item: NFT }) => {
    const imageUrl = item.image ? GetIpfsUrlFromPinata(item.image) : 'https://via.placeholder.com/400';
    console.log('Image URL for token', item.tokenId, ':', imageUrl);
    
    return (
      <View style={[styles.card, { 
        backgroundColor: theme.card,
        borderColor: theme.border
      }]}>
        <TouchableOpacity onPress={() => handleViewNFT(item.tokenId)}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.nftImage}
            onError={() => console.error('Image loading error for token', item.tokenId)}
          />
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <Text style={[styles.tokenId, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.salesCount, { color: theme.subtext }]}>{item.salesCount} sales</Text>
            </View>
            {item.description && (
              <Text style={[styles.description, { color: theme.subtext }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: theme.subtext }]}>Price</Text>
              <Text style={[styles.price, { color: theme.accent }]}>{ethers.utils.formatEther(item.price)} ETH</Text>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.buyButton, { backgroundColor: theme.accent }]}
                onPress={() => handleBuyNFT(item)}
              >
                <Text style={[styles.buyButtonText, { color: isDarkMode ? '#000000' : '#FFFFFF' }]}>
                  {walletAddress ? 'Buy Now' : 'Connect Wallet to Buy'}
                </Text>
                {walletAddress ? (
                  <ShoppingCart size={18} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                ) : (
                  <Wallet size={18} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                )}
              </TouchableOpacity>
              {/* <TouchableOpacity 
                style={styles.viewButton}
                onPress={() => handleViewNFT(item.tokenId)}
              >
                <ExternalLink size={18} color="#4ADE80" />
              </TouchableOpacity> */}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.headerContainer]}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: theme.text }]}>MetaBazaar</Text>
        <TouchableOpacity 
          style={[styles.themeButton, { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)' }]}
          onPress={toggleTheme}
        >
          {isDarkMode ? (
            <Sun size={20} color={theme.accent} />
          ) : (
            <Moon size={20} color={theme.accent} />
          )}
        </TouchableOpacity>
      </View>
      <BlurView intensity={30} tint={isDarkMode ? "dark" : "light"} style={[styles.searchContainer, { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)' }]}>
        <Search size={20} color={theme.subtext} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search NFTs..."
          placeholderTextColor={theme.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </BlurView>
    </View>
  );

  if (loading) {
    return <LoadingScreen message="Loading NFT Marketplace..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      {walletAddress && (
        <Text style={[styles.walletAddress, { color: theme.accent }]}>
          {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
        </Text>
      )}
      <FlatList
        data={filteredNfts}
        renderItem={renderNFTCard}
        keyExtractor={(item) => `nft-${item.tokenId}`}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    color: '#FFFFFF',
  },
  themeButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
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
    paddingBottom: 100, // Add padding for tab bar
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tokenId: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
  },
  salesCount: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
  },
  description: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  priceContainer: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
  },
  price: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#4ADE80',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buyButton: {
    flex: 1,
    backgroundColor: '#4ADE80',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginRight: 8,
  },
  walletAddress: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginTop: 16,
    marginLeft: 16,
  },
});