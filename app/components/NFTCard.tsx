import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import getIpfsUrlFromPinata from '../utils/ipfs';
import { ethers } from 'ethers';

interface NFTCardProps {
  item: {
    tokenId: string | number;
    name?: string;
    description?: string;
    image?: string;
    price: string | number;
  };
  onPress?: () => void;
}

export default function NFTCard({ item, onPress }: NFTCardProps) {
  const IPFSUrl = item.image ? getIpfsUrlFromPinata(item.image) : 'https://via.placeholder.com/400';
  const limitedDescription = item.description && item.description.length > 100
    ? item.description.substring(0, 100) + "..."
    : item.description;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: IPFSUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.name || `NFT #${item.tokenId}`}</Text>
        {limitedDescription && (
          <Text style={styles.description}>{limitedDescription}</Text>
        )}
        <View style={styles.footer}>
          <Text style={styles.price}>{ethers.utils.formatEther(item.price)} ETH</Text>
          <Text style={styles.tokenId}>#{item.tokenId}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181B', // zinc-900
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D1D5DB', // slate-300
    fontFamily: 'SpaceGrotesk_700Bold',
    textTransform: 'uppercase',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#D1D5DB', // slate-300
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D1D5DB', // slate-300
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  tokenId: {
    fontSize: 14,
    color: '#D1D5DB', // slate-300
    fontFamily: 'SpaceGrotesk_400Regular',
  },
}); 