import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ethers } from 'ethers';
import { LineChart } from 'react-native-chart-kit';
import { Clock, DollarSign, User, History } from 'lucide-react-native';
import GetIpfsUrlFromPinata from '../utils/ipfs';
import contractInfo from '../marketplace.json';
import LoadingScreen from '../components/LoadingScreen';
import axios from 'axios';

const CONTRACT_ADDRESS = contractInfo.address.trim();
const CONTRACT_ABI = contractInfo.abi;

interface NFTListing {
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

interface Transaction {
  timestamp: number;
  from: string;
  to: string;
}

export default function NFTProfileScreen() {
  const { tokenId } = useLocalSearchParams();
  const [nft, setNft] = useState<NFTListing | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNFTData();
    fetchTransactionHistory();
  }, [tokenId]);

  async function loadNFTData() {
    try {
      const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/FLSX-8UrkJRTsUoSaR3hCOJ6NVysq4Kl');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const listing = await contract.getNFTListing(tokenId);
      let tokenURI = await contract.tokenURI(tokenId);
      tokenURI = GetIpfsUrlFromPinata(tokenURI);

      const metaResponse = await axios.get(tokenURI);
      const meta = metaResponse.data;

      setNft({
        tokenId: tokenId as string,
        owner: listing.owner,
        seller: listing.seller,
        creator: listing.creator,
        price: listing.price.toString(),
        salesCount: listing.salesCount.toNumber(),
        lastTransactionTime: listing.lastTransactionTime.toNumber(),
        image: meta.image,
        name: meta.name || `NFT #${tokenId}`,
        description: meta.description || ''
      });
    } catch (error) {
      console.error('Error loading NFT:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactionHistory() {
    try {
      const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/FLSX-8UrkJRTsUoSaR3hCOJ6NVysq4Kl');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Get Transfer events
      const filter = contract.filters.Transfer(null, null, tokenId);
      const events = await contract.queryFilter(filter);

      // Process events
      const txHistory = await Promise.all(
        events.map(async (event) => {
          const block = await event.getBlock();
          return {
            timestamp: block.timestamp,
            from: event.args?.from,
            to: event.args?.to
          };
        })
      );

      // Sort by timestamp
      txHistory.sort((a, b) => a.timestamp - b.timestamp);
      setTransactions(txHistory);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  }

  const renderChart = () => {
    if (transactions.length === 0) return null;

    // Format dates for x-axis
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp * 1000);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    };

    // Get price data from NFT listing
    const priceData = transactions.map((_, index) => {
      if (index === transactions.length - 1) {
        return parseFloat(ethers.utils.formatEther(nft?.price || '0'));
      }
      // For historical prices, we can estimate based on current price
      // In a real app, you would get this from your NFTSold events
      return parseFloat(ethers.utils.formatEther(nft?.price || '0')) * 0.9;
    });

    const chartData = {
      labels: transactions.map(tx => formatDate(tx.timestamp)),
      datasets: [{
        data: priceData,
        color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
        strokeWidth: 2
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Price History</Text>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" ETH"
          chartConfig={{
            backgroundColor: '#1F2937',
            backgroundGradientFrom: '#1F2937',
            backgroundGradientTo: '#1F2937',
            decimalPlaces: 4,
            color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#4ADE80"
            },
            propsForLabels: {
              fontSize: 10,
              fontFamily: 'SpaceGrotesk_400Regular'
            }
          }}
          bezier
          style={styles.chart}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
        />
      </View>
    );
  };

  if (loading || !nft) {
    return <LoadingScreen message="Loading NFT Details..." />;
  }

  const imageUrl = nft.image ? GetIpfsUrlFromPinata(nft.image) : 'https://via.placeholder.com/400';

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.nftImage}
        onError={() => console.error('Image loading error for token', nft.tokenId)}
      />
      
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{nft.name}</Text>
        <Text style={styles.description}>{nft.description}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <DollarSign size={24} color="#4ADE80" />
            <Text style={styles.statLabel}>Current Price</Text>
            <Text style={styles.statValue}>{ethers.utils.formatEther(nft.price)} ETH</Text>
          </View>

          <View style={styles.statItem}>
            <History size={24} color="#4ADE80" />
            <Text style={styles.statLabel}>Transfer Count</Text>
            <Text style={styles.statValue}>{transactions.length}</Text>
          </View>

          <View style={styles.statItem}>
            <Clock size={24} color="#4ADE80" />
            <Text style={styles.statLabel}>Last Transfer</Text>
            <Text style={styles.statValue}>
              {transactions.length > 0 
                ? new Date(transactions[transactions.length - 1].timestamp * 1000).toLocaleDateString()
                : 'Never'}
            </Text>
          </View>
        </View>

        <View style={styles.ownershipInfo}>
          <View style={styles.ownershipItem}>
            <User size={18} color="#4ADE80" />
            <Text style={styles.ownershipLabel}>Creator</Text>
            <Text style={styles.address}>{`${nft.creator.slice(0, 6)}...${nft.creator.slice(-4)}`}</Text>
          </View>

          <View style={styles.ownershipItem}>
            <User size={18} color="#4ADE80" />
            <Text style={styles.ownershipLabel}>Owner</Text>
            <Text style={styles.address}>{`${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}`}</Text>
          </View>
        </View>

        {renderChart()}

        <View style={styles.transactionHistory}>
          <Text style={styles.sectionTitle}>Transfer History</Text>
          {transactions.map((tx, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionDate}>
                  {new Date(tx.timestamp * 1000).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.transactionAddress}>
                From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
              </Text>
              <Text style={styles.transactionAddress}>
                To: {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginTop: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  ownershipInfo: {
    marginBottom: 24,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },
  ownershipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ownershipLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginLeft: 8,
    marginRight: 8,
  },
  address: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#4ADE80',
  },
  chartContainer: {
    marginBottom: 24,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  transactionHistory: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  transactionItem: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
  },
  transactionAddress: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
  },
}); 